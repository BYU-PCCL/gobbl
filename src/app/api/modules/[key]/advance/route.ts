import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getModule } from "@/lib/modules/registry";
import { createDebate } from "@/lib/debates";
import { isStance } from "@/lib/conversation";
import { formatTopicForDebate, getTopic } from "@/lib/topics";
import { MODULE_MOVES, parseLearnedMoves } from "@/lib/moves";
import { QUIZ_PASS } from "@/lib/quizzes";
import { XP_LEARN, XP_TEACH, getLevelInfo } from "@/lib/gamification";
import { isAnswerValid } from "@/lib/survey/questions";
import type { Prisma } from "@prisma/client";

const bad = (error: string, status: number, extra?: Record<string, unknown>) =>
  NextResponse.json({ error, ...extra }, { status });

type XpAward = { amount: number; previousLevel: number; newLevel: number };

/** Adds XP inside a transaction and recomputes the level from the new total. */
async function awardXp(tx: Prisma.TransactionClient, userId: string, amount: number): Promise<XpAward> {
  const before = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { level: true } });
  const after = await tx.user.update({
    where: { id: userId },
    data: { xp: { increment: amount } },
    select: { xp: true },
  });
  const newLevel = getLevelInfo(after.xp).level;
  if (newLevel !== before.level) await tx.user.update({ where: { id: userId }, data: { level: newLevel } });
  return { amount, previousLevel: before.level, newLevel };
}

const asObject = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

export async function POST(req: Request, { params }: { params: { key: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return bad("Unauthorized", 401);
  const userId = (session.user as { id: string }).id;

  const moduleConfig = getModule(params.key);
  if (!moduleConfig) return bad("Module not found", 404);

  let body: { sessionId?: string; stepId?: string; answer?: unknown; action?: string };
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON", 400);
  }
  const { sessionId, stepId, answer, action } = body;

  const skillSession = await prisma.skillSession.findFirst({
    where: { id: String(sessionId), userId, skillKey: moduleConfig.key },
  });
  if (!skillSession) return bad("Session not found", 404);
  if (skillSession.completedAt) return bad("Session already completed", 409);

  const variant =
    moduleConfig.variants.find((v) => v.key === skillSession.variant) ?? moduleConfig.variants[0];
  const stepIndex = variant.steps.findIndex((s) => s.id === stepId);
  const step = variant.steps[stepIndex];
  if (!step) return bad("Step not found", 404);

  // Steps must be taken in order: submitting anything but the current step would let a
  // client skip ahead or send the session backwards.
  if (skillSession.stage !== step.id) {
    return bad("Not the current step", 409, { currentStage: skillSession.stage });
  }

  const updateData: Prisma.SkillSessionUpdateInput = {};
  const responsePayload: Record<string, unknown> = {};

  if (step.kind === "diagnostic") {
    const given = answer && typeof answer === "object" ? (answer as Record<string, unknown>) : null;
    if (
      !given ||
      !step.questions.every((q) => typeof given[q.key] === "string" && isAnswerValid(q, given[q.key] as string))
    ) {
      return bad("Please answer every question", 400);
    }
    const cleaned = Object.fromEntries(step.questions.map((q) => [q.key, given[q.key]]));
    const existingResponses = (skillSession.stepResponses as Record<string, unknown>) ?? {};
    updateData.stepResponses = { ...existingResponses, [step.id]: cleaned } as Prisma.InputJsonObject;
  } else if (step.kind === "content") {
    const existingResponses = (skillSession.stepResponses as Record<string, unknown>) ?? {};
    updateData.stepResponses = { ...existingResponses, [step.id]: true } as Prisma.InputJsonObject;
  } else if (step.kind === "reflection") {
    const text = typeof answer === "string" ? answer.trim() : "";
    if (!text || text.length > step.maxLength) {
      return bad(`Reflection must be 1-${step.maxLength} characters`, 400);
    }
    if (!skillSession.statement1) {
      updateData.statement1 = text;
    } else {
      updateData.statement2 = text;
    }
  } else if (step.kind === "quiz") {
    const picks = Array.isArray(answer) ? answer : null;
    if (
      !picks ||
      picks.length !== step.questions.length ||
      !picks.every((a, i) => Number.isInteger(a) && a >= 0 && a < step.questions[i].options.length)
    ) {
      return bad("Answer every question", 400);
    }
    const lastAnswers = picks as number[];
    const results = step.questions.map((q, i) => ({ correct: lastAnswers[i] === q.answer, why: q.why }));
    const correctCount = results.filter((r) => r.correct).length;
    const passed = correctCount >= (step.passScore || QUIZ_PASS);
    const existingResponses = asObject(skillSession.stepResponses);
    const prevAttempts = Number(asObject(existingResponses[step.id]).attempts) || 0;
    const stepResponses = {
      ...existingResponses,
      [step.id]: { attempts: prevAttempts + 1, passed, lastAnswers },
    } as Prisma.InputJsonObject;

    if (!passed) {
      const saved = await prisma.skillSession.updateMany({
        where: { id: skillSession.id, stage: step.id },
        data: { stepResponses },
      });
      if (saved.count === 0) return bad("Not the current step", 409);
      return NextResponse.json({ passed: false, results, nextStep: null });
    }

    // Teach XP is paid once per module: skip if another session of this module already passed.
    const otherSessions = await prisma.skillSession.findMany({
      where: { userId, skillKey: moduleConfig.key, id: { not: skillSession.id } },
      select: { stepResponses: true },
    });
    const alreadyTaught = otherSessions.some((s) => asObject(asObject(s.stepResponses)[step.id]).passed === true);
    const move = MODULE_MOVES[moduleConfig.key] ?? null;
    const nextQuizStep = variant.steps[stepIndex + 1] ?? null;
    const now = new Date();

    const outcome = await prisma.$transaction(async (tx) => {
      const advanced = await tx.skillSession.updateMany({
        where: { id: skillSession.id, stage: step.id },
        data: { stepResponses, stage: nextQuizStep ? nextQuizStep.id : "complete" },
      });
      if (advanced.count === 0) return null;

      const hatchedNow = await tx.user.updateMany({
        where: { id: userId, companionHatchedAt: null },
        data: { companionHatchedAt: now },
      });
      const me = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { learnedMoves: true, level: true } });
      // Users already at level 2+ were shown as hatched before the column existed: stamp it quietly, no overlay.
      const wasEgg = me.level < 2;
      const learned = parseLearnedMoves(me.learnedMoves);
      if (move && !learned.includes(move.id)) learned.push(move.id);
      await tx.user.update({
        where: { id: userId },
        data: { learnedMoves: learned, lastActiveDate: now },
      });
      const xp = alreadyTaught ? null : await awardXp(tx, userId, XP_TEACH);
      return { hatched: hatchedNow.count > 0 && wasEgg, xp };
    });
    if (!outcome) return bad("Not the current step", 409);

    return NextResponse.json({
      passed: true,
      results,
      hatched: outcome.hatched,
      learnedMove: move,
      xp: outcome.xp,
      nextStep: nextQuizStep,
    });
  } else if (step.kind === "practice") {
    // First practice step in a variant uses the "pre" slot, the second uses "post".
    const practiceIndex = variant.steps.filter((s) => s.kind === "practice").findIndex((s) => s.id === step.id);
    if (practiceIndex > 1) return bad("Modules support at most two practice steps", 400);
    const slot = practiceIndex === 0 ? "preDebateId" : "postDebateId";
    const linkedId = skillSession[slot];

    if (action !== "finish") {
      // Starting, or re-entering after a reload mid-conversation: reuse this slot's debate
      // and leave `stage` alone so the user resumes here rather than skipping ahead.
      if (linkedId) return NextResponse.json({ debateId: linkedId });

      const given = asObject(answer);
      const chosenTopic = typeof given.topicId === "string" ? getTopic(given.topicId) : undefined;
      const userStance = isStance(given.userStance) ? given.userStance : null;

      const debate = await createDebate({
        userId,
        topic: chosenTopic ? formatTopicForDebate(chosenTopic) : step.topic,
        category: "Training",
        difficulty: step.difficulty,
        isTraining: true,
        trainingMode: moduleConfig.key,
        userStance,
      });
      if (chosenTopic) {
        await prisma.user.update({ where: { id: userId }, data: { lastTopicId: chosenTopic.id } }).catch(() => {});
      }
      // Claim the slot only if still empty, so a double-click can't attach two debates.
      const claimed = await prisma.skillSession.updateMany({
        where: slot === "preDebateId" ? { id: skillSession.id, preDebateId: null } : { id: skillSession.id, postDebateId: null },
        data: slot === "preDebateId" ? { preDebateId: debate.id } : { postDebateId: debate.id },
      });
      if (claimed.count === 0) {
        const fresh = await prisma.skillSession.findUnique({ where: { id: skillSession.id } });
        return NextResponse.json({ debateId: fresh?.[slot] ?? debate.id });
      }
      return NextResponse.json({ debateId: debate.id });
    }

    // "finish": only valid once the conversation has really ended (ConversationScene.onFinish).
    const debate = linkedId ? await prisma.debate.findUnique({ where: { id: linkedId } }) : null;
    if (!debate || !debate.completed) {
      return bad("Finish the conversation before continuing", 409);
    }
    responsePayload.debateId = debate.id;
  }

  const nextStep = variant.steps[stepIndex + 1] ?? null;
  updateData.stage = nextStep ? nextStep.id : "complete";

  // "Learn" XP: the step right before the quiz finishes the lesson. Paid once per module,
  // across all of the user's sessions for it (flag lives in stepResponses.__learnXp).
  let learnXp = false;
  if (nextStep?.kind === "quiz") {
    const sessions = await prisma.skillSession.findMany({
      where: { userId, skillKey: moduleConfig.key },
      select: { stepResponses: true },
    });
    const paid = sessions.some((s) => asObject(s.stepResponses).__learnXp === true);
    if (!paid) {
      learnXp = true;
      const base = updateData.stepResponses ?? skillSession.stepResponses;
      updateData.stepResponses = { ...asObject(base), __learnXp: true } as Prisma.InputJsonObject;
    }
  }

  if (learnXp) {
    const outcome = await prisma.$transaction(async (tx) => {
      const advanced = await tx.skillSession.updateMany({
        where: { id: skillSession.id, stage: step.id },
        data: updateData as Prisma.SkillSessionUpdateManyMutationInput,
      });
      if (advanced.count === 0) return null;
      return awardXp(tx, userId, XP_LEARN);
    });
    if (!outcome) return bad("Not the current step", 409);
    return NextResponse.json({ ...responsePayload, xp: outcome, nextStep });
  }

  // Advance only if nobody else already did (double-click / two tabs).
  const advanced = await prisma.skillSession.updateMany({
    where: { id: skillSession.id, stage: step.id },
    data: updateData as Prisma.SkillSessionUpdateManyMutationInput,
  });
  if (advanced.count === 0) return bad("Not the current step", 409);

  return NextResponse.json({ ...responsePayload, nextStep });
}
