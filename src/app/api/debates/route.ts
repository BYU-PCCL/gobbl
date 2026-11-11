import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { maxTurnsForDebate } from "@/lib/debates";
import { getPersonaById } from "@/lib/personas/pool";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const url = new URL(req.url);
  const debateId = url.searchParams.get("id");

  if (debateId) {
    const debate = await prisma.debate.findFirst({
      where: { id: debateId, userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!debate) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    const persona = getPersonaById(debate.personaId);
    // No feedback mid-conversation: scores are withheld until the debate is finished.
    const messages = debate.completed
      ? debate.messages
      : debate.messages.map((m) => ({
          id: m.id,
          debateId: m.debateId,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        }));
    return NextResponse.json({
      ...debate,
      messages,
      userStance: debate.userStance,
      dimensions: debate.dimensions,
      maxTurns: maxTurnsForDebate(debate.trainingMode),
      personaInitials: persona?.initials ?? null,
    });
  }

  const debates = await prisma.debate.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(debates);
}
