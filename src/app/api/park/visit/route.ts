import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createDebate } from "@/lib/debates";
import { startActivity } from "@/lib/flock/activities";
import { activityDone } from "@/lib/flock/progressQueries";
import { unlockedFor } from "@/lib/flock/progress";
import { getPersonaById, isTier } from "@/lib/personas/pool";
import { prisma } from "@/lib/db";
import { isStance } from "@/lib/conversation";
import { formatTopicForDebate, getRandomTopic, getTopic } from "@/lib/topics";

/**
 * Walk up to a turkey at the park. Starts a conversation with that turkey on the topic and
 * side the user picked (a random topic if none was sent), and links the visit to the user's
 * turkey so wrapping up refills loneliness.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  let body: {
    personaId?: unknown;
    turkeyId?: unknown;
    topicId?: unknown;
    userStance?: unknown;
    difficulty?: unknown;
    allowProfanity?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tier = typeof body.difficulty === "string" && isTier(body.difficulty) ? body.difficulty : "Friendly Cluck";
  const persona = typeof body.personaId === "string" ? getPersonaById(body.personaId) : null;
  if (!persona || persona.tier !== tier) {
    return NextResponse.json({ error: "That turkey isn't at the park" }, { status: 400 });
  }

  const turkey =
    typeof body.turkeyId === "string"
      ? await prisma.turkey.findFirst({ where: { id: body.turkeyId, userId }, select: { id: true } })
      : null;
  if (!turkey) {
    return NextResponse.json({ error: "Pick one of your turkeys first" }, { status: 400 });
  }
  const done = await activityDone(turkey.id);
  if (!unlockedFor(true, done).park) {
    return NextResponse.json({ error: "Take your turkey to School first" }, { status: 409 });
  }

  const picked = typeof body.topicId === "string" ? getTopic(body.topicId) : undefined;
  const topic = picked ?? getRandomTopic();
  const userStance = isStance(body.userStance) ? body.userStance : null;
  let debate: Awaited<ReturnType<typeof createDebate>>;
  try {
    debate = await createDebate({
      userId,
      topic: formatTopicForDebate(topic),
      category: topic.category,
      difficulty: tier,
      allowProfanity: body.allowProfanity === true,
      userStance,
      parkPersonaId: persona.id,
    });
  } catch {
    return NextResponse.json(
      { error: `${persona.initials} couldn't chat right now. Try again in a moment.` },
      { status: 502 },
    );
  }

  if (picked) {
    await prisma.user.update({ where: { id: userId }, data: { lastTopicId: picked.id } }).catch(() => {});
  }

  try {
    await startActivity({ userId, turkeyId: body.turkeyId, kind: "park", refId: debate.id });
  } catch (e) {
    // Linking is best-effort; the conversation still starts.
    console.error("park visit: startActivity failed", e);
  }

  return NextResponse.json({ id: debate.id });
}
