import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  SCHOOL_DAILY_FEATHER_CAP,
  SCHOOL_FEATHERS,
  SCHOOL_XP,
  SCHOOL_MIN_ANSWER_LENGTH as MIN_ANSWER_LENGTH,
  SCHOOL_ROUNDS as ANSWER_COUNT,
} from "@/lib/flock/config";
import { toTurkeyView } from "@/lib/flock/view";
import { unlockedFor } from "@/lib/flock/progress";
import { activityDone } from "@/lib/flock/progressQueries";
import { stageForActivityCount } from "@/lib/flock/growth";
import { touchStreak, grantXp, awardBadges } from "@/lib/rewards";
import type { ActivityRewards } from "@/lib/conversation";


export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  try {
    const turkey = await prisma.turkey.findFirst({
      where: { id, userId, hatchedAt: { not: null } },
    });
    if (!turkey) {
      return NextResponse.json({ error: "Turkey not found" }, { status: 404 });
    }
    if (!unlockedFor(true, await activityDone(turkey.id)).school) {
      return NextResponse.json({ error: "Feed your turkey first" }, { status: 409 });
    }

    const body = await req.json().catch(() => null);
    const answers: unknown = body?.answers;
    if (
      !Array.isArray(answers) ||
      answers.length !== ANSWER_COUNT ||
      !answers.every((a) => typeof a === "string" && a.trim().length >= MIN_ANSWER_LENGTH)
    ) {
      return NextResponse.json(
        { error: `Answer all ${ANSWER_COUNT} questions (at least ${MIN_ANSWER_LENGTH} characters each)` },
        { status: 400 }
      );
    }

    const now = new Date();
    const startOfUtcDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    const result = await prisma.$transaction(async (tx) => {
      // Update the turkey first: it row-locks the turkey so concurrent lessons serialize and
      // the second one sees the first one's activity when counting below.
      const updatedTurkey = await tx.turkey.update({
        where: { id: turkey.id },
        data: { activityCount: { increment: 1 }, lastTaughtAt: now },
      });
      const paidToday = await tx.turkeyActivity.count({
        where: {
          turkeyId: turkey.id,
          kind: "school",
          feathers: { gt: 0 },
          createdAt: { gte: startOfUtcDay },
        },
      });
      const feathersEarned = paidToday < SCHOOL_DAILY_FEATHER_CAP ? SCHOOL_FEATHERS : 0;

      await tx.turkeyActivity.create({
        data: {
          turkeyId: turkey.id,
          kind: "school",
          score: null,
          feathers: feathersEarned,
          counted: true,
          completedAt: now,
        },
      });
      const user = await tx.user.update({
        where: { id: userId },
        data: feathersEarned > 0 ? { featherBalance: { increment: feathersEarned } } : {},
        select: { featherBalance: true },
      });

      // Every lesson counts for the streak; a paid one also earns account XP.
      const streak = await touchStreak(tx, userId, now);
      let previousLevel: number;
      let newLevel: number;
      if (feathersEarned > 0) {
        const levels = await grantXp(tx, userId, SCHOOL_XP);
        previousLevel = levels.previousLevel;
        newLevel = levels.newLevel;
      } else {
        const row = await tx.user.findUnique({ where: { id: userId }, select: { level: true } });
        previousLevel = newLevel = row?.level ?? 1;
      }
      const badges = await awardBadges(tx, userId);
      return {
        updatedTurkey,
        feathersEarned,
        featherBalance: user.featherBalance,
        xp: feathersEarned > 0 ? SCHOOL_XP : 0,
        previousLevel,
        newLevel,
        streak: streak.currentStreak,
        newBadges: badges.map((b) => b.key),
      };
    });

    // School only opens once the turkey has been fed, so both are done by now.
    const turkeyView = toTurkeyView(result.updatedTurkey, now, { feed: true, school: true });
    const rewards: ActivityRewards = {
      feathers: result.feathersEarned,
      xp: result.xp,
      previousLevel: result.previousLevel,
      newLevel: result.newLevel,
      streak: result.streak,
      newBadges: result.newBadges,
      turkey: turkeyView,
      previousStage: stageForActivityCount(turkey.activityCount, true),
    };
    return NextResponse.json({
      turkey: turkeyView,
      rewards,
      feathersEarned: result.feathersEarned,
      featherBalance: result.featherBalance,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not complete the lesson" }, { status: 500 });
  }
}
