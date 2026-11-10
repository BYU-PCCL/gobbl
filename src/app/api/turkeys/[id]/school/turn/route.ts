import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSchoolTurn } from "@/lib/ai";
import { buildSchoolPrompt, parseSchoolHistory, schoolPhase } from "@/lib/flock/school";
import { getTurkeySkill, isTurkeySkill } from "@/lib/flock/skills";

/**
 * The turkey's next line in a School lesson. The client sends the lesson so far;
 * the reply is the turkey's next question, or — once every round is answered —
 * what it learned (`done: true`). Finishing the lesson is a separate call to
 * POST /api/turkeys/[id]/school, which pays out.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const history = parseSchoolHistory(body?.history);
  if (!history) {
    return NextResponse.json({ error: "That lesson doesn't add up. Start it again." }, { status: 400 });
  }

  const turkey = await prisma.turkey.findFirst({
    where: { id, userId, hatchedAt: { not: null } },
    select: { name: true, skill: true },
  });
  if (!turkey || !isTurkeySkill(turkey.skill)) {
    return NextResponse.json({ error: "Turkey not found" }, { status: 404 });
  }

  const skill = getTurkeySkill(turkey.skill);
  const messages = buildSchoolPrompt({
    turkeyName: turkey.name ?? "your turkey",
    skillLabel: skill.label,
    skillBlurb: skill.blurb,
    history,
  });

  try {
    const message = await getSchoolTurn(messages);
    return NextResponse.json({ message, done: schoolPhase(history) === "closing" });
  } catch (e) {
    console.error("school turn failed", e);
    return NextResponse.json({ error: "Your turkey is feeling sleepy. Try again in a moment." }, { status: 502 });
  }
}
