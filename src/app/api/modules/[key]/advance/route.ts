/**
 * POST /api/modules/[key]/advance
 *
 * Submits the user's work for the CURRENT step of a skill-module session and moves the
 * session to the next step. Steps must be taken in order.
 *
 * Request body (JSON):
 *   { sessionId: string, stepId: string, answer?: unknown, action?: string }
 *   - sessionId / stepId: from the start response (`sessionId`, `step.id`) or the previous
 *     advance response (`nextStep.id`). stepId must equal the session's current stage,
 *     otherwise 409 `{ error: "Not the current step", currentStage }`.
 *
 * What to send, per `step.kind`:
 *   - "diagnostic": `answer` = object keyed by question key, one string value for EVERY
 *       entry in `step.questions` (`{ [question.key]: string }`); each value must pass the
 *       question's validation. Otherwise 400 "Please answer every question". No `action`.
 *   - "content": nothing. `answer` and `action` are ignored.
 *   - "reflection": `answer` = string, trimmed, 1..`step.maxLength` characters. Otherwise
 *       400. No `action`.
 *   - "practice" (two calls):
 *       1. Call WITHOUT `action: "finish"` (omit `action`, no `answer`). Creates (or, on
 *          re-entry/reload, reuses) the training debate for this step and returns
 *          `{ debateId }` only. The session does NOT advance. Run the chat on that debate.
 *       2. Once that debate is completed (`completed` true), call again with
 *          `action: "finish"` (no `answer`). If the debate is not completed: 409
 *          "Finish the conversation before continuing". On success the session advances.
 *       A variant supports at most two practice steps (400 otherwise).
 *
 * Response on an advancing call (200):
 *   {
 *     nextStep: ModuleStep | null,   // next step object; null when the last step was done
 *     moduleTitle: string,
 *     stepIndex: number | null,      // 0-based index of nextStep in the variant; null if nextStep is null
 *     stepCount: number,             // total steps in the variant
 *     debateId?: string              // only after a practice "finish"
 *   }
 * `nextStep: null` means every step is done; the session stage is now "complete" and the
 * client should call the module's complete endpoint to finalize it.
 *
 * Response to the first practice call (200): `{ debateId: string }` only (no nextStep,
 * no step metadata).
 *
 * Errors: 401 unauthenticated; 404 module/session/step not found; 400 invalid JSON or
 * invalid answer; 409 session already completed, not the current step, or practice debate
 * not finished.
 */
import { NextResponse } from "next/server";
import { getSessionUser, unauthorized } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getModule } from "@/lib/modules/registry";
import { stepMeta } from "@/lib/modules/dto";
import { createDebate } from "@/lib/debates";
import { isAnswerValid } from "@/lib/survey/questions";
import type { Prisma } from "@prisma/client";

const bad = (error: string, status: number, extra?: Record<string, unknown>) =>
  NextResponse.json({ error, ...extra }, { status });

export const maxDuration = 60; // practice step creates a debate with a blocking AI call

export async function POST(req: Request, { params }: { params: { key: string } }) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return bad("Unauthorized", 401);
  const userId = sessionUser.id;

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

  return NextResponse.json({
    ...responsePayload,
    nextStep,
    moduleTitle: moduleConfig.title,
    ...stepMeta(variant, nextStep),
  });
}
