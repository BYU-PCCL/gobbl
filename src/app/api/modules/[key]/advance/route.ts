import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getModule } from "@/lib/modules/registry";
import { createDebate } from "@/lib/debates";
import type { Prisma } from "@prisma/client";

export async function POST(req: Request, { params }: { params: { key: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const moduleConfig = getModule(params.key);
  if (!moduleConfig) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 });
  }

  const { sessionId, stepId, answer } = await req.json();

  const skillSession = await prisma.skillSession.findFirst({
    where: { id: sessionId, userId, skillKey: moduleConfig.key },
  });
  if (!skillSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const variant =
    moduleConfig.variants.find((v) => v.key === skillSession.variant) ?? moduleConfig.variants[0];
  const stepIndex = variant.steps.findIndex((s) => s.id === stepId);
  const step = variant.steps[stepIndex];
  if (!step) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  const updateData: Prisma.SkillSessionUpdateInput = {};
  const responsePayload: Record<string, unknown> = {};

  if (step.kind === "diagnostic" || step.kind === "content") {
    const existingResponses = (skillSession.stepResponses as Record<string, unknown>) ?? {};
    updateData.stepResponses = { ...existingResponses, [step.id]: answer ?? true };
  } else if (step.kind === "reflection") {
    if (!skillSession.statement1) {
      updateData.statement1 = String(answer ?? "");
    } else {
      updateData.statement2 = String(answer ?? "");
    }
  } else if (step.kind === "practice") {
    const debate = await createDebate({
      userId,
      topic: step.topic,
      category: "Training",
      difficulty: step.difficulty,
      isTraining: true,
      trainingMode: moduleConfig.key,
    });
    if (!skillSession.preDebateId) {
      updateData.preDebateId = debate.id;
    } else {
      updateData.postDebateId = debate.id;
    }
    responsePayload.debateId = debate.id;
    responsePayload.openingMessage = debate.openingMessage;
  }

  const nextStep = variant.steps[stepIndex + 1] ?? null;
  updateData.stage = nextStep ? nextStep.id : "complete";

  await prisma.skillSession.update({
    where: { id: skillSession.id },
    data: updateData,
  });

  return NextResponse.json({
    ...responsePayload,
    nextStep,
  });
}
