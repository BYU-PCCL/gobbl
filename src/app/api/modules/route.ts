import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MODULES } from "@/lib/modules/registry";
import { getRunState } from "@/lib/modules/run-state";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const sessions = await prisma.skillSession.findMany({
    where: { userId, skillKey: { in: MODULES.map((m) => m.key) } },
    orderBy: { createdAt: "desc" },
  });

  const modules = MODULES.map((module) => {
    const moduleSessions = sessions.filter((s) => s.skillKey === module.key);
    // Skip unfinished runs from before the module's steps changed: they can't be resumed, so
    // they shouldn't show as in progress (see run-state.ts).
    const latest =
      moduleSessions.find((s) => s.completedAt || getRunState(module, s).kind !== "stale") ?? null;
    const timesCompleted = moduleSessions.filter((s) => s.completedAt).length;

    return {
      key: module.key,
      skill: module.skill,
      title: module.title,
      description: module.description,
      estimatedMinutes: module.estimatedMinutes,
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
