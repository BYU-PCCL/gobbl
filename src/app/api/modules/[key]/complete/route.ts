import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getModule } from "@/lib/modules/registry";

/**
 * Flat bonus for finishing a module, separate from the practice debate's own
 * XP/feathers — those are already awarded by /api/chat's finishDebate when
 * the practice conversation itself ends, so this must not re-score the debate.
 */
const MODULE_COMPLETION_FEATHERS = 30;

class AlreadyCompleted extends Error {}

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

  const { sessionId } = await req.json().catch(() => ({ sessionId: undefined }));

  const skillSession = await prisma.skillSession.findFirst({
    where: { id: String(sessionId), userId, skillKey: moduleConfig.key },
  });
  if (!skillSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (skillSession.completedAt) {
    return NextResponse.json({ error: "Session already completed" }, { status: 409 });
  }
  // Only a session that has been through every step may pay out.
  if (skillSession.stage !== "complete") {
    return NextResponse.json({ error: "Module not finished" }, { status: 409 });
  }

  const [preDebate, postDebate] = await Promise.all([
    skillSession.preDebateId
      ? prisma.debate.findUnique({ where: { id: skillSession.preDebateId } })
      : null,
    skillSession.postDebateId
      ? prisma.debate.findUnique({ where: { id: skillSession.postDebateId } })
      : null,
  ]);

  const preCivility = preDebate?.overallScore ?? null;
  const postCivility = postDebate?.overallScore ?? null;

  try {
    await prisma.$transaction(async (tx) => {
      // Claim the completion atomically so concurrent requests can't both pay out.
      const claimed = await tx.skillSession.updateMany({
        where: { id: skillSession.id, completedAt: null },
        data: {
          preCivility,
          postCivility,
          feathersEarned: MODULE_COMPLETION_FEATHERS,
          completedAt: new Date(),
        },
      });
      if (claimed.count === 0) throw new AlreadyCompleted();

      // increment (not read-modify-write) so it can't clobber a concurrent balance change.
      await tx.user.update({
        where: { id: userId },
        data: { featherBalance: { increment: MODULE_COMPLETION_FEATHERS } },
      });
    });
  } catch (e) {
    if (e instanceof AlreadyCompleted) {
      return NextResponse.json({ error: "Session already completed" }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({
    completed: true,
    preCivility,
    postCivility,
    feathersEarned: MODULE_COMPLETION_FEATHERS,
  });
}
