import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MODULES } from "@/lib/modules/registry";

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
    const latest = moduleSessions[0] ?? null;
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
