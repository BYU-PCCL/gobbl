import { prisma } from "@/lib/db";
import { getAIOpening } from "@/lib/ai";
import { getUserBelief } from "@/lib/prompts/userBelief";
import { getModule } from "@/lib/modules/registry";
import { MAX_TURNS, type Stance } from "@/lib/conversation";
import { getPersonaById, isTier, opposingPersonas, pickOpposingPersona } from "@/lib/personas/pool";

interface CreateDebateParams {
  userId: string;
  topic: string;
  category?: string;
  difficulty?: string;
  /** A partner previewed on the setup screen; ignored unless it is in the chosen tier and opposes the user. */
  personaId?: string;
  isDaily?: boolean;
  /** Set when this debate is a module's practice step rather than a normal Chat-page debate. */
  isTraining?: boolean;
  trainingMode?: string;
  /** Setup-screen opt-in; dropped unless the tier is Full Gobble. */
  allowProfanity?: boolean;
  /** Which side the user said they take; the partner takes the other. */
  userStance?: Stance | null;
}

/** User messages allowed in a debate: the module's first practice step `maxTurns`, else MAX_TURNS. */
export function maxTurnsForDebate(trainingMode: string | null): number {
  if (!trainingMode) return MAX_TURNS;
  const practice = getModule(trainingMode)?.variants[0]?.steps.find((s) => s.kind === "practice");
  return practice && practice.kind === "practice" && practice.maxTurns ? practice.maxTurns : MAX_TURNS;
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
  personaId,
  isDaily,
  isTraining,
  trainingMode,
  allowProfanity,
  userStance,
}: CreateDebateParams) {
  const tier = difficulty && isTier(difficulty) ? difficulty : "Friendly Cluck";
  const profanity = tier === "Full Gobble" && allowProfanity === true;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { surveyResponses: true },
  });
  const userBelief = getUserBelief(user?.surveyResponses);

  // Honor the partner previewed on the setup screen only if it's still a valid match —
  // right tier and across the aisle from the user.
  const requested = getPersonaById(personaId);
  const persona =
    requested && opposingPersonas(tier, userBelief).includes(requested)
      ? requested
      : pickOpposingPersona(tier, userBelief);

  const debate = await prisma.debate.create({
    data: {
      userId,
      topic,
      category: category || "General",
      beliefKey: persona.beliefKey,
      difficulty: tier,
      personaId: persona.id,
      isDaily: isDaily || false,
      isTraining: isTraining || false,
      trainingMode: trainingMode ?? null,
      // Debate.mode exists for the audio/video work the setup screen's mode picker is
      // waiting on — only "text" is implemented, so every debate is created as one today.
      mode: "text",
      allowProfanity: profanity,
      userStance: userStance ?? null,
    },
  });

  const aiOpening = await getAIOpening(topic, persona, {
    allowProfanity: profanity,
    moduleKey: trainingMode,
    userStance: userStance ?? null,
  });

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
