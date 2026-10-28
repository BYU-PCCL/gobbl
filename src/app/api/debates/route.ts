import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createDebate, maxTurnsForDebate } from "@/lib/debates";
import { isStance } from "@/lib/conversation";
import { getTopic } from "@/lib/topics";
import { getPersonaById } from "@/lib/personas/pool";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  let body: {
    topic?: string;
    category?: string;
    difficulty?: string;
    personaId?: string;
    isDaily?: boolean;
    allowProfanity?: boolean;
    userStance?: unknown;
    topicId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { topic, category, difficulty, personaId, isDaily, allowProfanity, topicId } = body;
  const userStance = isStance(body.userStance) ? body.userStance : null;
  if (!topic) {
    return NextResponse.json({ error: "A topic is required" }, { status: 400 });
  }

  try {
    const result = await createDebate({
      userId,
      topic,
      category,
      difficulty,
      personaId,
      isDaily,
      allowProfanity,
      userStance,
    });
    if (typeof topicId === "string" && getTopic(topicId)) {
      await prisma.user.update({ where: { id: userId }, data: { lastTopicId: topicId } }).catch(() => {});
    }
    return NextResponse.json(result);
  } catch {
    // Without this, a failure here (e.g. the Grok call for the opening message) bubbles
    // up as Next's generic unhandled-error response instead of the JSON the client reads
    // `data.error` from.
    return NextResponse.json({ error: "Couldn't start the conversation — please try again" }, { status: 502 });
  }
}

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
          moveId: m.moveId,
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
