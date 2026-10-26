import { NextResponse } from "next/server";
import { getSessionUser, unauthorized } from "@/lib/session";
import { prisma } from "@/lib/db";
import { createDebate } from "@/lib/debates";
import { getDailyTopicForDate, utcDayBounds } from "@/lib/daily";
import { formatTopicForDebate } from "@/lib/topics";
import { toDebateDTO, toDebateSummaryDTO } from "@/lib/dto";

// Creating a debate makes a blocking Grok call for the opening line.
export const maxDuration = 60;

export async function POST(req: Request) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return unauthorized();

  const userId = sessionUser.id;

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
  const { difficulty, personaId, isDaily, allowProfanity } = body;
  let { topic, category } = body;

  if (isDaily) {
    // The server owns the Daily Gobble: one topic per UTC day (published by /api/config),
    // one daily debate per user per day. Clients can't pick the topic or repeat the bonus.
    const now = new Date();
    const daily = getDailyTopicForDate(now);
    topic = formatTopicForDebate(daily);
    category = daily.category;

    const { start, end } = utcDayBounds(now);
    const existing = await prisma.debate.findFirst({
      where: { userId, isDaily: true, createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (existing && !existing.completed) {
      // Resume rather than stack a second daily (double-tap, second device).
      const opening = existing.messages.find((m) => m.role === "assistant");
      return NextResponse.json({
        id: existing.id,
        topic: existing.topic,
        difficulty: existing.difficulty,
        personaInitials: toDebateSummaryDTO(existing).personaInitials,
        openingMessage: opening?.content ?? "",
        resumed: true,
      });
    }
    if (existing) {
      return NextResponse.json(
        { error: "You've already done today's Daily Gobble", code: "DAILY_DONE", debateId: existing.id },
        { status: 409 }
      );
    }
  }

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
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return unauthorized();

  const userId = sessionUser.id;
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
    return NextResponse.json(toDebateDTO(debate));
  }

  const debates = await prisma.debate.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(debates.map(toDebateSummaryDTO));
}
