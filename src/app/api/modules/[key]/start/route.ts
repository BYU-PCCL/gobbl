import { NextResponse } from "next/server";
import { getSessionUser, unauthorized } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getModule } from "@/lib/modules/registry";
import { stepMeta } from "@/lib/modules/dto";

export async function POST(req: Request, { params }: { params: { key: string } }) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return unauthorized();
  const userId = sessionUser.id;

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
  if (inProgress) {
    const resumedVariant =
      moduleConfig.variants.find((v) => v.key === inProgress.variant) ?? moduleConfig.variants[0];
    const resumedStep = resumedVariant.steps.find((s) => s.id === inProgress.stage) ?? null;
    return NextResponse.json({
      sessionId: inProgress.id,
      variant: resumedVariant.key,
      step: resumedStep,
      moduleTitle: moduleConfig.title,
      ...stepMeta(resumedVariant, resumedStep),
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
    },
  });

  return NextResponse.json({
    sessionId: skillSession.id,
    variant: chosenVariant.key,
    step: firstStep,
    moduleTitle: moduleConfig.title,
    ...stepMeta(chosenVariant, firstStep),
  });
}
