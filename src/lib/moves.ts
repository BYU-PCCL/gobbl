import type { CivilityDimensions } from "@/lib/civility";

/**
 * Coaching moves: optional hints the user can tap above the input before writing a reply.
 * ASK and SHARE are always available; each module teaches one more move when its quiz is passed.
 */
export interface Move {
  id: string;
  /** Short uppercase label shown on the chip. */
  name: string;
  /** One-sentence coaching hint shown when the chip is tapped. */
  hint: string;
  /** The civility dimension this move mostly exercises. */
  dimension: keyof CivilityDimensions;
  /** Module whose quiz teaches this move; undefined for the basics. */
  moduleKey?: string;
}

export const BASIC_MOVES: Move[] = [
  { id: "ask", name: "ASK", hint: "Ask one honest question about why they see it that way.", dimension: "mutualExchange" },
  { id: "share", name: "SHARE", hint: "Say where you stand in one plain sentence before you react.", dimension: "selfExpressionReason" },
];

export const MODULE_MOVES: Record<string, Move> = {
  participation: {
    id: "common-ground", name: "COMMON GROUND", moduleKey: "participation", dimension: "participation",
    hint: "Name one thing in what they said you can honestly agree with, then stay in it.",
  },
  "active-listening": {
    id: "restate", name: "RESTATE", moduleKey: "active-listening", dimension: "mutualExchange",
    hint: "Say back what they seem to care about and check you got it right.",
  },
  "cognitive-dissonance": {
    id: "name-tension", name: "NAME TENSION", moduleKey: "cognitive-dissonance", dimension: "interrogation",
    hint: "Say out loud the part that sits uneasily with you, without backing off your view.",
  },
  "self-expression": {
    id: "state-view", name: "STATE VIEW", moduleKey: "self-expression", dimension: "selfExpressionReason",
    hint: "Lead with your own position in one clear sentence, then respond.",
  },
  "reason-giving": {
    id: "give-reason", name: "GIVE REASON", moduleKey: "reason-giving", dimension: "selfExpressionReason",
    hint: "Add one concrete reason: an example, a number you trust, or something you saw happen.",
  },
};

export const ALL_MOVES: Move[] = [...BASIC_MOVES, ...Object.values(MODULE_MOVES)];

export function getMove(id: string | null | undefined): Move | undefined {
  return id ? ALL_MOVES.find((m) => m.id === id) : undefined;
}

export function isMoveId(x: unknown): x is string {
  return typeof x === "string" && ALL_MOVES.some((m) => m.id === x);
}

/** Basics plus every learned module move, in a stable order. */
export function availableMoves(learned: readonly string[] | null | undefined): Move[] {
  const set = new Set(learned ?? []);
  return [...BASIC_MOVES, ...Object.values(MODULE_MOVES).filter((m) => set.has(m.id))];
}

/** `User.learnedMoves` is Json?; normalise whatever is stored into a string[] of known ids. */
export function parseLearnedMoves(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isMoveId);
}
