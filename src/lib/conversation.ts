import type { TurkeyView } from "@/lib/flock/view";

/** User messages allowed per conversation unless a module practice step sets its own `maxTurns`. */
export const MAX_TURNS = 8;
/** Rounds the user must take before "Wrap up" is allowed (client shows the button, server enforces it). */
export const MIN_TURNS_TO_FINISH = 2;

/** Messages typed per conversation; mirrors the textarea limit in ConversationScene. */
export const MAX_MESSAGE_CHARS = 500;

export type Stance = "for" | "against";

export function isStance(x: unknown): x is Stance {
  return x === "for" || x === "against";
}

/** One line of a conversation as the client sees it. No scores: feedback arrives only after wrap-up. */
export interface ConvMsg {
  role: "user" | "assistant";
  content: string;
}

/** What every finished activity (Feed, School, Park) hands back, so one screen can end them all. */
export interface ActivityRewards {
  feathers: number;
  xp: number;
  previousLevel: number;
  newLevel: number;
  /** Current streak after this activity. */
  streak: number;
  /** Badge keys earned just now. */
  newBadges: string[];
  /** The turkey after the activity (null if the activity had no turkey). */
  turkey: TurkeyView | null;
  /** Its stage before the activity, to show growth. */
  previousStage: number | null;
}

/** Response of `POST /api/chat` with `finish: true` (same shape the old chat UI used). */
export interface FinishResult {
  overallScore: number;
  dimensions: Record<string, number> | null;
  xp: { base: number; difficultyBonus: number; streakMultiplier: number; total: number };
  feathers: { base: number; difficultyBonus: number; total: number };
  previousLevel: number;
  newLevel: number;
  newBadges: string[];
  streak: number;
  rewards: ActivityRewards;
}

/** Mid-conversation response of `POST /api/chat`. */
export interface TurnResult {
  aiResponse: string;
  turnNumber: number;
  maxTurns: number;
}
