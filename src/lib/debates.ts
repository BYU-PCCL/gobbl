import { prisma } from "@/lib/db";
import { getAIOpening } from "@/lib/ai";
import { flipBelief } from "@/lib/prompts/flipBelief";
import { getUserBelief } from "@/lib/prompts/userBelief";
import { pickPersona, isTier } from "@/lib/personas/pool";

interface CreateDebateParams {
  userId: string;
  topic: string;
  category?: string;
  difficulty?: string;
  isDaily?: boolean;
  /** Set when this debate is a module's practice step rather than a normal Chat-page debate. */
  isTraining?: boolean;
  trainingMode?: string;
}

/**
 * Shared by /api/debates (normal Chat-page debates) and the module harness's
 * "practice" step — both just create a Debate + opening AI message the same way.
 */
export async function createDebate({
  userId,
  topic,
  category,
  difficulty,
  isDaily,
  isTraining,
  trainingMode,
}: CreateDebateParams) {
  const tier = difficulty && isTier(difficulty) ? difficulty : "Friendly Cluck";
  const persona = pickPersona(tier);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { surveyResponses: true },
  });
  // Keep flipBelief on the user's onboarding belief — this is what the chat-setup card surfaces.
  // The persona's own beliefKey is what the system prompt uses, so the two live independently for now.
  const beliefKey = flipBelief(getUserBelief(user?.surveyResponses));

  const debate = await prisma.debate.create({
    data: {
      userId,
      topic,
      category: category || "General",
      beliefKey,
      difficulty: tier,
      personaId: persona.id,
      isDaily: isDaily || false,
      isTraining: isTraining || false,
      trainingMode: trainingMode ?? null,
    },
  });

  const aiOpening = await getAIOpening(topic, persona);

  await prisma.message.create({
    data: {
      debateId: debate.id,
      role: "assistant",
      content: aiOpening,
    },
  });

  return {
    id: debate.id,
    topic: debate.topic,
    difficulty: debate.difficulty,
    personaInitials: persona.initials,
    openingMessage: aiOpening,
  };
}
