import type { EquippedCosmetics } from "@/lib/shop";

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
  moveId?: string | null;
}

/** Response of `POST /api/chat` with `finish: true` (same shape the old chat UI used). */
export interface FinishResult {
  overallScore: number;
  dimensions: Record<string, number> | null;
  xp: { base: number; difficultyBonus: number; dailyBonus: number; streakMultiplier: number; total: number };
  feathers: { base: number; difficultyBonus: number; dailyBonus: number; total: number };
  previousLevel: number;
  newLevel: number;
  newBadges: string[];
  streak: number;
  equippedCosmetics?: EquippedCosmetics;
}

/** Mid-conversation response of `POST /api/chat`. */
export interface TurnResult {
  aiResponse: string;
  turnNumber: number;
  maxTurns: number;
}
