import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getModule } from "@/lib/modules/registry";
import { createDebate } from "@/lib/debates";
import { isAnswerValid } from "@/lib/survey/questions";
import type { Prisma } from "@prisma/client";

const bad = (error: string, status: number, extra?: Record<string, unknown>) =>
  NextResponse.json({ error, ...extra }, { status });

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

      const debate = await createDebate({
        userId,
        topic: step.topic,
        category: "Training",
        difficulty: step.difficulty,
        isTraining: true,
        trainingMode: moduleConfig.key,
      });
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

    // "finish": only valid once the conversation has really ended (ChatInterface.onFinish).
    const debate = linkedId ? await prisma.debate.findUnique({ where: { id: linkedId } }) : null;
    if (!debate || !debate.completed) {
      return bad("Finish the conversation before continuing", 409);
    }
    responsePayload.debateId = debate.id;
  }

  const nextStep = variant.steps[stepIndex + 1] ?? null;
  updateData.stage = nextStep ? nextStep.id : "complete";

  // Advance only if nobody else already did (double-click / two tabs).
  const advanced = await prisma.skillSession.updateMany({
    where: { id: skillSession.id, stage: step.id },
    data: updateData as Prisma.SkillSessionUpdateManyMutationInput,
  });
  if (advanced.count === 0) return bad("Not the current step", 409);

  return NextResponse.json({ ...responsePayload, nextStep });
}
