import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getModule } from "@/lib/modules/registry";

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
  if (inProgress) {
    const resumedVariant =
      moduleConfig.variants.find((v) => v.key === inProgress.variant) ?? moduleConfig.variants[0];
    return NextResponse.json({
      sessionId: inProgress.id,
      variant: resumedVariant.key,
      step: resumedVariant.steps.find((s) => s.id === inProgress.stage) ?? null,
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
  });
}
