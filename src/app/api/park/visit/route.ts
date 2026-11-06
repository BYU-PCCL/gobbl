import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createDebate } from "@/lib/debates";
import { startActivity } from "@/lib/flock/activities";
import { getParkTurkey } from "@/lib/flock/parkTurkeys";
import { formatTopicForDebate, getRandomTopic } from "@/lib/topics";

/**
 * Walk up to a turkey at the park. Starts an easy conversation with that
 * turkey's persona on a topic it brings up itself (a random topic each visit),
 * and links the visit to the user's turkey so wrapping up refills loneliness.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  let body: { personaId?: unknown; turkeyId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parkTurkey = typeof body.personaId === "string" ? getParkTurkey(body.personaId) : null;
  if (!parkTurkey) {
    return NextResponse.json({ error: "That turkey isn't at the park" }, { status: 400 });
  }

  const topic = getRandomTopic();
  let debate: Awaited<ReturnType<typeof createDebate>>;
  try {
    debate = await createDebate({
      userId,
      topic: formatTopicForDebate(topic),
      category: topic.category,
      difficulty: "Friendly Cluck",
      parkPersonaId: parkTurkey.personaId,
    });
  } catch {
    return NextResponse.json(
      { error: `${parkTurkey.name} couldn't chat right now. Try again in a moment.` },
      { status: 502 },
    );
  }

  try {
    await startActivity({ userId, turkeyId: body.turkeyId, kind: "park", refId: debate.id });
  } catch (e) {
    // Linking is best-effort; the conversation still starts.
    console.error("park visit: startActivity failed", e);
  }

  return NextResponse.json({ id: debate.id });
}
