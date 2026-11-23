import { isTestMode } from "@/lib/testMode";

export interface LevelDef {
  level: number;
  name: string;
  xpRequired: number;
  description: string;
}

export const LEVELS: LevelDef[] = [
  { level: 1, name: "Egg", xpRequired: 0, description: "Every good conversation starts somewhere" },
  { level: 2, name: "Hatchling", xpRequired: 200, description: "You've cracked the shell!" },
  { level: 3, name: "Poult", xpRequired: 500, description: "Finding your voice" },
  { level: 4, name: "Youngster", xpRequired: 1000, description: "Starting to strut" },
  { level: 5, name: "Tom", xpRequired: 2000, description: "A real contender" },
  { level: 6, name: "Gobbler", xpRequired: 4000, description: "Your voice carries weight" },
  { level: 7, name: "Grand Gobbler", xpRequired: 7000, description: "A force for good discourse" },
  { level: 8, name: "Thunderbird", xpRequired: 11000, description: "Legendary civil conversationalist" },
];

export interface BadgeDefinition {
  key: string;
  name: string;
  description: string;
}

export const BADGES: BadgeDefinition[] = [
  {
    key: "first-gobble",
    name: "First Gobble",
    description: "Complete your first conversation",
  },
  {
    key: "free-range",
    name: "Free Range",
    description: "Score 7+ civility in 3 conversations",
  },
  {
    key: "warm-nest",
    name: "Warm Nest",
    description: "Score 9+ on mutual exchange & listening (in a conversation)",
  },
  {
    key: "migration-streak",
    name: "Migration Streak",
    description: "Maintain a 7-day streak",
  },
  {
    key: "flock-leader",
    name: "Flock Leader",
    description: "Complete 10 Jerky Turkey conversations",
  },
  {
    key: "golden-drumstick",
    name: "Golden Drumstick",
    description: "Reach level 5 (Tom)",
  },
  {
    key: "sharp-beak",
    name: "Sharp Beak",
    description: "Score 9+ on reason & expression (in a conversation)",
  },
  {
    key: "roosting-ritual",
    name: "Roosting Ritual",
    description: "Complete 30 daily gobbles",
  },
];

export function getLevelInfo(xp: number) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpRequired) current = lvl;
    else break;
  }
  const nextLevel = LEVELS.find((l) => l.level === current.level + 1);
  const xpForNext = nextLevel ? nextLevel.xpRequired - current.xpRequired : 0;
  const xpProgress = nextLevel ? xp - current.xpRequired : xpForNext;
  return {
    ...current,
    xpForNext,
    xpProgress,
    progressPercent: xpForNext > 0 ? Math.min(100, (xpProgress / xpForNext) * 100) : 100,
  };
}

/**
 * The conversation tiers, in order. This is the single source for tier keys: the persona
 * pool's `Tier` type and `isTier` derive from it. `maxTurns` is the number of user turns
 * before the conversation wraps up. It is shorter for Jerky Turkey, where leaving an
 * unreasonable conversation gracefully is part of the exercise.
 */
export const DIFFICULTIES = [
  { key: "Friendly Cluck", label: "Friendly Cluck", multiplier: 1.0, maxTurns: 8, description: "Warm and encouraging" },
  { key: "Spirited Strut", label: "Spirited Strut", multiplier: 1.25, maxTurns: 8, description: "Pushes back firmly" },
  { key: "Full Gobble", label: "Full Gobble", multiplier: 1.5, maxTurns: 8, description: "Sharp, well-argued, won't budge (1.5× XP & feathers)" },
  { key: "Jerky Turkey", label: "Jerky Turkey", multiplier: 2.0, maxTurns: 5, description: "Rude, dismissive, unfair. Practice staying calm (2× XP & feathers)" },
] as const;

export type DifficultyKey = (typeof DIFFICULTIES)[number]["key"];

/** The top tier: the one the Flock Leader badge counts. */
export const TOP_TIER: DifficultyKey = "Jerky Turkey";

/**
 * Tiers held back from the focus-group (tester) build. The public app always offers every
 * tier. Empty this list to bring them back.
 */
const TESTER_HIDDEN_TIERS: readonly string[] = ["Jerky Turkey"];

/** False for a tier that is hidden from the tester build, when running as that build. */
export function isTierOffered(key: string): boolean {
  return !(isTestMode() && TESTER_HIDDEN_TIERS.includes(key));
}

/** The tiers a user can pick. Use this for pickers; DIFFICULTIES stays the full list. */
export const OFFERED_DIFFICULTIES = DIFFICULTIES.filter((d) => isTierOffered(d.key));

/** Where a request for a hidden tier lands: the hardest tier still on offer. */
export const HARDEST_OFFERED_TIER: DifficultyKey = OFFERED_DIFFICULTIES[OFFERED_DIFFICULTIES.length - 1].key;

const DEFAULT_MAX_TURNS = 8;

/** User turns before a conversation wraps up; unknown or legacy difficulty strings get the default. */
export function getMaxTurns(difficulty: string): number {
  return DIFFICULTIES.find((d) => d.key === difficulty)?.maxTurns ?? DEFAULT_MAX_TURNS;
}

const DIFFICULTY_MULTIPLIER: Record<string, number> = Object.fromEntries(
  DIFFICULTIES.map((d) => [d.key, d.multiplier])
);

/**
 * Progression XP — driven by civility, difficulty, daily challenge, and streak.
 * Used only for leveling (never spent).
 */
export function calculateXP(
  civilityScore: number,
  difficulty: string,
  isDaily: boolean,
  streakDays: number
): { base: number; difficultyBonus: number; dailyBonus: number; streakMultiplier: number; total: number } {
  const base = Math.round(20 + (civilityScore / 10) * 30);
  const diffMult = DIFFICULTY_MULTIPLIER[difficulty] || 1.0;
  const difficultyBonus = Math.round(base * (diffMult - 1));
  const dailyBonus = isDaily ? 25 : 0;
  const streakMultiplier = Math.min(2.0, 1 + streakDays * 0.1);
  const total = Math.round((base + difficultyBonus + dailyBonus) * streakMultiplier);
  return { base, difficultyBonus, dailyBonus, streakMultiplier, total };
}

/**
 * Spendable feathers — driven by how much you engaged (user messages), difficulty, and daily.
 * No streak multiplier; streak rewards are XP-only.
 */
export function calculateFeathers(
  userMessageCount: number,
  difficulty: string,
  isDaily: boolean
): { base: number; difficultyBonus: number; dailyBonus: number; total: number } {
  const msgs = Math.max(1, userMessageCount);
  const base = 10 * msgs;
  const diffMult = DIFFICULTY_MULTIPLIER[difficulty] || 1.0;
  const afterDifficulty = Math.round(base * diffMult);
  const difficultyBonus = afterDifficulty - base;
  const dailyBonus = isDaily ? 30 : 0;
  const total = afterDifficulty + dailyBonus;
  return { base, difficultyBonus, dailyBonus, total };
}

export interface UserStats {
  totalDebates: number;
  civilDebates: number;
  /** Completed conversations in the top tier (see TOP_TIER). */
  topTierCount: number;
  dailyChallengeCount: number;
  maxMutualExchange: number;
  maxSelfExpressionReason: number;
  currentStreak: number;
  level: number;
}

export function checkNewBadges(stats: UserStats, existingBadges: string[]): string[] {
  const newBadges: string[] = [];

  const checks: [string, boolean][] = [
    ["first-gobble", stats.totalDebates >= 1],
    ["free-range", stats.civilDebates >= 3],
    ["warm-nest", stats.maxMutualExchange >= 9],
    ["migration-streak", stats.currentStreak >= 7],
    ["flock-leader", stats.topTierCount >= 10],
    ["golden-drumstick", stats.level >= 5],
    ["sharp-beak", stats.maxSelfExpressionReason >= 9],
    ["roosting-ritual", stats.dailyChallengeCount >= 30],
  ];

  for (const [key, earned] of checks) {
    if (earned && !existingBadges.includes(key)) {
      newBadges.push(key);
    }
  }

  return newBadges;
}
