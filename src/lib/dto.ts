import type { Debate, Message } from "@prisma/client";
import { getPersonaById } from "@/lib/personas/pool";
import { parseStoredDimensions } from "@/lib/civility";

/**
 * Client-facing shapes for rows that carry server-only columns. Routes return
 * these instead of spreading Prisma rows so prompts, legacy columns and other
 * internals never reach a client. Additive changes only — both the web and the
 * iOS app decode these.
 */

export function toMessageDTO(m: Message) {
  return {
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    civilityScore: m.civilityScore,
    dimensions: parseStoredDimensions(m.dimensions),
    createdAt: m.createdAt,
  };
}

export function toDebateSummaryDTO(d: Debate) {
  return {
    id: d.id,
    topic: d.topic,
    category: d.category,
    difficulty: d.difficulty,
    beliefKey: d.beliefKey,
    personaInitials: getPersonaById(d.personaId)?.initials ?? null,
    isDaily: d.isDaily,
    isTraining: d.isTraining,
    trainingMode: d.trainingMode,
    allowProfanity: d.allowProfanity,
    completed: d.completed,
    overallScore: d.overallScore,
    xpEarned: d.xpEarned,
    feathersEarned: d.feathersEarned,
    createdAt: d.createdAt,
    completedAt: d.completedAt,
  };
}

export function toDebateDTO(d: Debate & { messages: Message[] }) {
  return {
    ...toDebateSummaryDTO(d),
    // `analysis` is the user-facing per-turn feedback array written by /api/debates/[id]/analyze.
    analysis: (d.analysis as unknown as { turn: number; wellDone: string; tryInstead: string }[] | null) ?? null,
    messages: d.messages.map(toMessageDTO),
  };
}
