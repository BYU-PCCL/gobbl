export interface CivilityDimensions {
  participation: number;
  selfExpressionReason: number;
  mutualExchange: number;
  interrogation: number;
}

export interface CivilityResult {
  dimensions: CivilityDimensions;
  overall: number;
  feedback: string;
}

export function averageDimensions(dimensions: CivilityDimensions): number {
  const vals = Object.values(dimensions);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Returns parsed dimensions if all four new keys exist; otherwise null (legacy rows). */
export function parseStoredDimensions(raw: string | null): CivilityDimensions | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof parsed.participation === "number" &&
      typeof parsed.selfExpressionReason === "number" &&
      typeof parsed.mutualExchange === "number" &&
      typeof parsed.interrogation === "number"
    ) {
      return {
        participation: parsed.participation,
        selfExpressionReason: parsed.selfExpressionReason,
        mutualExchange: parsed.mutualExchange,
        interrogation: parsed.interrogation,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function civilityLabel(score: number): string {
  if (score >= 8) return "Magnificent Plumage";
  if (score >= 6) return "Bright Feathers";
  if (score >= 4) return "Ruffled";
  return "Molting";
}

export function civilityColor(score: number): string {
  if (score >= 8) return "text-emerald-500";
  if (score >= 6) return "text-golden-500";
  if (score >= 4) return "text-gobbl-500";
  return "text-plume-500";
}

export function reputationFromScore(score: number): number {
  return Math.round(score * 10);
}

export const DIMENSION_LABELS: Record<keyof CivilityDimensions, string> = {
  participation: "Participation",
  selfExpressionReason: "Reason & expression",
  mutualExchange: "Mutual exchange & listening",
  interrogation: "Interrogating preconceptions",
};

/** Paraphrased from the scoring rubric (src/lib/prompts/civility-rubric.ts); shown on hover/tap in the results breakdown. */
export const DIMENSION_DESCRIPTIONS: Record<keyof CivilityDimensions, string> = {
  participation:
    "Staying in the conversation. High scores mean you kept engaging with what the other person said, even when it got tense — rather than dodging, shutting down, or leaving.",
  selfExpressionReason:
    "Saying what you think and why. High scores mean you shared your own view and backed it up with reasons, examples, or personal experience instead of just stating a position.",
  mutualExchange:
    "Treating the other person as a real conversation partner. High scores mean you acknowledged their points, asked clarifying questions, and aimed to understand rather than to win.",
  interrogation:
    "Questioning your own view. High scores mean you admitted fair counterpoints, showed some humility, and stayed open to adjusting what you think.",
};

/** When holistic LLM fails: average per-message scores/dimensions; legacy messages without new keys use civilityScore only. */
export function fallbackHolisticFromUserMessages(
  userMessages: { civilityScore: number | null; dimensions: string | null }[]
): CivilityResult {
  const parsed = userMessages
    .map((m) => parseStoredDimensions(m.dimensions))
    .filter((d): d is CivilityDimensions => d !== null);

  if (parsed.length > 0) {
    const n = parsed.length;
    const dimensions: CivilityDimensions = {
      participation: parsed.reduce((s, d) => s + d.participation, 0) / n,
      selfExpressionReason: parsed.reduce((s, d) => s + d.selfExpressionReason, 0) / n,
      mutualExchange: parsed.reduce((s, d) => s + d.mutualExchange, 0) / n,
      interrogation: parsed.reduce((s, d) => s + d.interrogation, 0) / n,
    };
    return {
      dimensions,
      overall: averageDimensions(dimensions),
      feedback: "Holistic summary unavailable — averaged your per-message scores.",
    };
  }

  const scores = userMessages.map((m) => m.civilityScore).filter((s): s is number => s !== null);
  const mean = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 5;
  const rounded = Math.round(mean * 10) / 10;
  const dimensions: CivilityDimensions = {
    participation: rounded,
    selfExpressionReason: rounded,
    mutualExchange: rounded,
    interrogation: rounded,
  };
  return {
    dimensions,
    overall: rounded,
    feedback: "Holistic summary unavailable — based on overall message scores.",
  };
}
