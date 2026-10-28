import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLevelInfo } from "@/lib/gamification";
import { parseEquippedCosmetics } from "@/lib/shop";
import { getUserBelief } from "@/lib/prompts/userBelief";
import { companionStage, isHatched, type CompanionInfo, type SpeciesId } from "@/lib/companion";
import { parseLearnedMoves } from "@/lib/moves";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const dailyDebateToday = await prisma.debate.findFirst({
    where: {
      userId,
      isDaily: true,
      createdAt: { gte: todayStart, lt: todayEnd },
    },
  });

  const equippedCosmetics = parseEquippedCosmetics(user.equippedCosmetics);

  const hatched = isHatched(user);
  const companion: CompanionInfo = {
    speciesId: (user.companionSpecies as SpeciesId | null) ?? null,
    hatched,
    stage: companionStage(user.level, hatched),
    learnedMoves: parseLearnedMoves(user.learnedMoves),
    lastTopicId: user.lastTopicId ?? null,
  };

  return NextResponse.json({
    id: user.id,
    username: user.username,
    xp: user.xp,
    featherBalance: user.featherBalance,
    level: user.level,
    levelInfo,
    equippedCosmetics,
    companion,
    ownedItemIds: user.inventory.map((i) => i.itemId),
    civilityScore: user.civilityScore,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    lastActiveDate: user.lastActiveDate,
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
  });
}
