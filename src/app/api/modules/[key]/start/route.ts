import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getModule } from "@/lib/modules/registry";
import { STEPS_SIGNATURE_KEY, getRunState, stepsSignature } from "@/lib/modules/run-state";

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

  // Already mid-module? Resume that run instead of stacking a second one (double-click,
  // second tab). `step` is null for a run that finished its last step but was never
  // finalized — the client completes it.
  const inProgress = await prisma.skillSession.findFirst({
    where: { userId, skillKey: moduleConfig.key, completedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const runState = inProgress ? getRunState(moduleConfig, inProgress) : null;
  // The module's steps changed since this run started, so it can't be resumed. Its row is left
  // as it is, and a fresh run (which becomes the latest one) is started below.
  if (inProgress && runState && runState.kind !== "stale") {
    return NextResponse.json({
      sessionId: inProgress.id,
      variant: runState.variant.key,
      step: runState.kind === "step" ? runState.step : null,
      resumed: true,
    });
  }

  const { variant } = await req.json().catch(() => ({ variant: undefined }));
  const variantKey = variant === "advanced" ? "advanced" : "standard";
  const chosenVariant =
    moduleConfig.variants.find((v) => v.key === variantKey) ?? moduleConfig.variants[0];

  const firstStep = chosenVariant.steps[0];

  const skillSession = await prisma.skillSession.create({
    data: {
      userId,
      skillKey: moduleConfig.key,
      variant: chosenVariant.key,
      stage: firstStep.id,
      // Lets getRunState notice later if the module's steps have changed under this run.
      stepResponses: { [STEPS_SIGNATURE_KEY]: stepsSignature(chosenVariant) },
    },
  });

  return NextResponse.json({
    sessionId: skillSession.id,
    variant: chosenVariant.key,
    step: firstStep,
  });
}
