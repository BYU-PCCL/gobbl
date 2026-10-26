import { NextResponse } from "next/server";
import { getSessionUser, unauthorized } from "@/lib/session";
import { prisma } from "@/lib/db";
import { MODULES } from "@/lib/modules/registry";

export async function GET(req: Request) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return unauthorized();
  const userId = sessionUser.id;

  const sessions = await prisma.skillSession.findMany({
    where: { userId, skillKey: { in: MODULES.map((m) => m.key) } },
    orderBy: { createdAt: "desc" },
  });

  const modules = MODULES.map((module) => {
    const moduleSessions = sessions.filter((s) => s.skillKey === module.key);
    const latest = moduleSessions[0] ?? null;
    const timesCompleted = moduleSessions.filter((s) => s.completedAt).length;

    return {
      key: module.key,
      skill: module.skill,
      title: module.title,
      description: module.description,
      estimatedMinutes: module.estimatedMinutes,
      variants: module.variants.map((v) => ({ key: v.key, stepCount: v.steps.length })),
      hasAdvancedVariant: module.variants.some((v) => v.key === "advanced"),
      timesCompleted,
      progress: latest
        ? {
            sessionId: latest.id,
            stage: latest.stage,
            variant: latest.variant,
            inProgress: !latest.completedAt,
          }
        : null,
    };
  });

  return NextResponse.json(modules);
}
