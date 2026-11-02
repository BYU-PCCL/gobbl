import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SCHOOL_DAILY_FEATHER_CAP, SCHOOL_FEATHERS } from "@/lib/flock/config";
import { toTurkeyView } from "@/lib/flock/view";

const MIN_ANSWER_LENGTH = 10;
const ANSWER_COUNT = 3;

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
      const updatedTurkey = await tx.turkey.update({
        where: { id: turkey.id },
        data: { activityCount: { increment: 1 }, lastTaughtAt: now },
      });
      const user = await tx.user.update({
        where: { id: userId },
        data: feathersEarned > 0 ? { featherBalance: { increment: feathersEarned } } : {},
        select: { featherBalance: true },
      });
      return { updatedTurkey, feathersEarned, featherBalance: user.featherBalance };
    });

    return NextResponse.json({
      turkey: toTurkeyView(result.updatedTurkey, now),
      feathersEarned: result.feathersEarned,
      featherBalance: result.featherBalance,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not complete the lesson" }, { status: 500 });
  }
}
