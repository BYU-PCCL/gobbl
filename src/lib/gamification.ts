/** XP for finishing a module's Learn pages (first time per module). */
export const XP_LEARN = 40;
/** XP for passing a module's Teach quiz (first time per module). */
export const XP_TEACH = 60;

export interface LevelDef {
  level: number;
  xpRequired: number;
}

export const LEVELS: LevelDef[] = [
  { level: 1, xpRequired: 0 },
  { level: 2, xpRequired: 200 },
  { level: 3, xpRequired: 500 },
  { level: 4, xpRequired: 1000 },
  { level: 5, xpRequired: 2000 },
  { level: 6, xpRequired: 4000 },
  { level: 7, xpRequired: 7000 },
  { level: 8, xpRequired: 11000 },
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
    description: "Finish your first conversation",
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
    name: "Bold Gobbler",
    description: "Finish 10 Full Gobble conversations",
  },
  {
    key: "golden-drumstick",
    name: "Golden Drumstick",
    description: "Reach level 5",
  },
  {
    key: "sharp-beak",
    name: "Sharp Beak",
    description: "Score 9+ on reason & expression (in a conversation)",
  },
  {
    key: "roosting-ritual",
    name: "Roosting Ritual",
    description: "Keep a 30-day streak",
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

export const DIFFICULTIES = [
  { key: "Friendly Cluck", label: "Friendly Cluck", multiplier: 1.0, description: "Warm and encouraging" },
  { key: "Spirited Strut", label: "Spirited Strut", multiplier: 1.25, description: "Pushes back firmly" },
  { key: "Full Gobble", label: "Full Gobble", multiplier: 1.5, description: "Maximum challenge (1.5× XP & feathers)" },
] as const;

const DIFFICULTY_MULTIPLIER: Record<string, number> = {
  "Friendly Cluck": 1.0,
  "Spirited Strut": 1.25,
  "Full Gobble": 1.5,
};

/**
 * Progression XP — driven by civility, difficulty, and streak.
 * Used only for leveling (never spent).
 */
export function calculateXP(
  civilityScore: number,
  difficulty: string,
  streakDays: number
): { base: number; difficultyBonus: number; streakMultiplier: number; total: number } {
  const base = Math.round(20 + (civilityScore / 10) * 30);
  const diffMult = DIFFICULTY_MULTIPLIER[difficulty] || 1.0;
  const difficultyBonus = Math.round(base * (diffMult - 1));
  const streakMultiplier = Math.min(2.0, 1 + streakDays * 0.1);
  const total = Math.round((base + difficultyBonus) * streakMultiplier);
  return { base, difficultyBonus, streakMultiplier, total };
}

/**
 * Spendable feathers — driven by how much you engaged (user messages), and difficulty.
 * No streak multiplier; streak rewards are XP-only.
 */
export function calculateFeathers(
  userMessageCount: number,
  difficulty: string
): { base: number; difficultyBonus: number; total: number } {
  const msgs = Math.max(1, userMessageCount);
  const base = 10 * msgs;
  const diffMult = DIFFICULTY_MULTIPLIER[difficulty] || 1.0;
  const afterDifficulty = Math.round(base * diffMult);
  const difficultyBonus = afterDifficulty - base;
  const total = afterDifficulty;
  return { base, difficultyBonus, total };
}

export interface UserStats {
  totalDebates: number;
  civilDebates: number;
  /** Finished Full Gobble conversations. */
  fullGobbleCount: number;
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
    ["flock-leader", stats.fullGobbleCount >= 10],
    ["golden-drumstick", stats.level >= 5],
    ["sharp-beak", stats.maxSelfExpressionReason >= 9],
    ["roosting-ritual", stats.currentStreak >= 30],
  ];

  for (const [key, earned] of checks) {
    if (earned && !existingBadges.includes(key)) {
      newBadges.push(key);
    }
  }

  return newBadges;
}
