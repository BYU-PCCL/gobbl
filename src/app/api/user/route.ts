import { NextResponse } from "next/server";
import { getSessionUser, unauthorized } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getLevelInfo } from "@/lib/gamification";
import { utcDayBounds } from "@/lib/daily";
import { parseEquippedCosmetics } from "@/lib/shop";
import { getUserBelief } from "@/lib/prompts/userBelief";

export async function GET(req: Request) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return unauthorized();

  const userId = sessionUser.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      badges: true,
      inventory: true,
      debates: {
        where: { completed: true },
        orderBy: { completedAt: "desc" },
        take: 10,
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const levelInfo = getLevelInfo(user.xp);

  // Same UTC day boundary /api/debates enforces, so "done" here matches "DAILY_DONE" there.
  const { start: todayStart, end: todayEnd } = utcDayBounds(new Date());

  const dailyDebateToday = await prisma.debate.findFirst({
    where: {
      userId,
      isDaily: true,
      createdAt: { gte: todayStart, lt: todayEnd },
    },
  });

  const equippedCosmetics = parseEquippedCosmetics(user.equippedCosmetics);

  return NextResponse.json({
    id: user.id,
    username: user.username,
    xp: user.xp,
    featherBalance: user.featherBalance,
    level: user.level,
    levelInfo,
    equippedCosmetics,
    ownedItemIds: user.inventory.map((i) => i.itemId),
    civilityScore: user.civilityScore,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    dailyCompleted: !!dailyDebateToday,
    badges: user.badges.map((b) => b.badgeKey),
    beliefKey: getUserBelief(user.surveyResponses),
    recentDebates: user.debates.map((d) => ({
      id: d.id,
      topic: d.topic,
      category: d.category,
      difficulty: d.difficulty,
      score: d.overallScore,
      xpEarned: d.xpEarned,
      feathersEarned: d.feathersEarned,
      completedAt: d.completedAt,
    })),
    createdAt: user.createdAt,
    onboardingCompletedAt: user.onboardingCompletedAt,
  });
}

export async function DELETE(req: Request) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return unauthorized();
  const userId = sessionUser.id;

  let body: { confirm?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* no body */
  }
  if (body.confirm !== "DELETE") {
    return NextResponse.json(
      { error: 'Send { "confirm": "DELETE" } to delete the account', code: "CONFIRM_REQUIRED" },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.personaRating.deleteMany({ where: { userId } });
      await tx.message.deleteMany({ where: { debate: { userId } } });
      await tx.debate.deleteMany({ where: { userId } });
      await tx.skillSession.deleteMany({ where: { userId } });
      await tx.userBadge.deleteMany({ where: { userId } });
      await tx.userInventory.deleteMany({ where: { userId } });
      await tx.user.deleteMany({ where: { id: userId } });
    });
  } catch (err) {
    console.error("Account deletion failed:", err);
    return NextResponse.json({ error: "Couldn't delete the account" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
