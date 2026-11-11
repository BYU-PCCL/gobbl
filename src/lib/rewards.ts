import type { Prisma } from "@prisma/client";
import { BADGES, BadgeDefinition, UserStats, checkNewBadges, getLevelInfo } from "@/lib/gamification";
import { parseStoredDimensions } from "@/lib/civility";

type Tx = Prisma.TransactionClient;

const DAY_MS = 86400000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Whole calendar days from `from` to `to` (local midnight to midnight, DST-safe). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
}

/**
 * Pure streak rule. The first activity of a new day extends the streak (or restarts it after a
 * gap of more than two days); a repeat on the same day changes nothing, except that a streak of 0
 * starts at 1 (lastActiveDate can be bumped by activity that never counted toward the streak).
 */
export function computeStreak(state: StreakState, now: Date): { currentStreak: number; longestStreak: number } {
  const gap = state.lastActiveDate ? daysBetween(state.lastActiveDate, now) : null;
  let next = state.currentStreak;
  if (gap === null || gap > 2) {
    next = 1;
  } else if (gap >= 1) {
    next = state.currentStreak + 1;
  } else if (state.currentStreak === 0) {
    next = 1;
  }
  return { currentStreak: next, longestStreak: Math.max(state.longestStreak, next) };
}

/** Applies the streak rule for an activity finishing now, and stamps lastActiveDate. */
export async function touchStreak(
  tx: Tx,
  userId: string,
  now: Date = new Date()
): Promise<{ currentStreak: number; longestStreak: number }> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { currentStreak: true, longestStreak: true, lastActiveDate: true },
  });
  if (!user) throw new Error("User not found");
  const next = computeStreak(user, now);
  await tx.user.update({
    where: { id: userId },
    data: { currentStreak: next.currentStreak, longestStreak: next.longestStreak, lastActiveDate: now },
  });
  return next;
}

/** Adds XP (atomic increment) and recomputes the account level. */
export async function grantXp(
  tx: Tx,
  userId: string,
  amount: number
): Promise<{ xp: number; previousLevel: number; newLevel: number }> {
  const row = await tx.user.update({
    where: { id: userId },
    data: { xp: { increment: amount } },
    select: { xp: true, level: true },
  });
  const newLevel = getLevelInfo(row.xp).level;
  if (newLevel !== row.level) {
    await tx.user.update({ where: { id: userId }, data: { level: newLevel } });
  }
  return { xp: row.xp, previousLevel: row.level, newLevel };
}

/**
 * Evaluates every badge against the user's current data and records the newly earned ones.
 * Call it inside the transaction after the activity's own writes (streak, XP) so it sees them.
 */
export async function awardBadges(tx: Tx, userId: string): Promise<BadgeDefinition[]> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      level: true,
      currentStreak: true,
      badges: { select: { badgeKey: true } },
      debates: { where: { completed: true }, select: { difficulty: true, overallScore: true } },
    },
  });
  if (!user) return [];

  const userMessages = await tx.message.findMany({
    where: { role: "user", dimensions: { not: null }, debate: { userId, completed: true } },
    select: { dimensions: true },
  });

  const stats = buildStats({
    level: user.level,
    currentStreak: user.currentStreak,
    debates: user.debates,
    messageDimensions: userMessages.map((m) => m.dimensions),
  });

  const keys = checkNewBadges(
    stats,
    user.badges.map((b) => b.badgeKey)
  );
  if (keys.length === 0) return [];
  await tx.userBadge.createMany({ data: keys.map((badgeKey) => ({ userId, badgeKey })), skipDuplicates: true });
  return BADGES.filter((b) => keys.includes(b.key));
}

/** Pure: turns raw rows into the stats object the badge predicates read. */
export function buildStats(input: {
  level: number;
  currentStreak: number;
  debates: { difficulty: string; overallScore: number | null }[];
  messageDimensions: (string | null)[];
}): UserStats {
  const parsed = input.messageDimensions
    .map((raw) => parseStoredDimensions(raw))
    .filter((d): d is NonNullable<typeof d> => d !== null);
  return {
    totalDebates: input.debates.length,
    civilDebates: input.debates.filter((d) => (d.overallScore ?? 0) >= 7).length,
    fullGobbleCount: input.debates.filter((d) => d.difficulty === "Full Gobble").length,
    maxMutualExchange: parsed.length > 0 ? Math.max(...parsed.map((d) => d.mutualExchange)) : 0,
    maxSelfExpressionReason: parsed.length > 0 ? Math.max(...parsed.map((d) => d.selfExpressionReason)) : 0,
    currentStreak: input.currentStreak,
    level: input.level,
  };
}
