import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLevelInfo } from "@/lib/gamification";
import { DIMENSION_LABELS, CivilityDimensions } from "@/lib/civility";
import { getUserBelief } from "@/lib/prompts/userBelief";

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

  // The account-wide level. Turkeys grow separately, from their own activities (/api/turkeys).
  const levelInfo = getLevelInfo(user.xp);
  const civilityByDimension = await averageDimensions(userId);

  return NextResponse.json({
    id: user.id,
    username: user.username,
    xp: user.xp,
    featherBalance: user.featherBalance,
    level: user.level,
    levelInfo,
    ownedItemIds: user.inventory.map((i) => i.itemId),
    civilityScore: user.civilityScore,
    civilityByDimension,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    lastTopicId: user.lastTopicId ?? null,
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

const DIMENSION_KEYS = ["participation", "selfExpressionReason", "mutualExchange", "interrogation"] as const;

/** Average of each civility dimension over the user's finished, scored conversations (0-10, one decimal). */
async function averageDimensions(userId: string) {
  const rows = await prisma.debate.findMany({
    where: { userId, completed: true, dimensions: { not: Prisma.DbNull } },
    select: { dimensions: true },
  });
  const sums: Record<string, number> = {};
  let n = 0;
  for (const r of rows) {
    const d = r.dimensions as Partial<CivilityDimensions> | null;
    if (!d || DIMENSION_KEYS.some((k) => typeof d[k] !== "number")) continue;
    n++;
    for (const k of DIMENSION_KEYS) sums[k] = (sums[k] ?? 0) + (d[k] as number);
  }
  if (n === 0) return [];
  return DIMENSION_KEYS.map((key) => ({
    key,
    label: DIMENSION_LABELS[key],
    average: Math.round((sums[key] / n) * 10) / 10,
  }));
}
