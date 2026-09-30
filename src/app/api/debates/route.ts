import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createDebate } from "@/lib/debates";
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
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { topic, category, difficulty, personaId, isDaily, allowProfanity } = body;
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
    });
    return NextResponse.json(result);
  } catch {
    // Without this, a failure here (e.g. the Grok call for the opening message) bubbles
    // up as Next's generic unhandled-error response instead of the JSON the client reads
    // `data.error` from.
    return NextResponse.json({ error: "Couldn't start the debate — please try again" }, { status: 502 });
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
      return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    }
    const persona = getPersonaById(debate.personaId);
    return NextResponse.json({
      ...debate,
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
