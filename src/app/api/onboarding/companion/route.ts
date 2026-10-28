import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { companionStage, isHatched, isSpeciesId, type CompanionInfo } from "@/lib/companion";
import { parseLearnedMoves } from "@/lib/moves";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  let body: { speciesId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!isSpeciesId(body.speciesId)) {
    return NextResponse.json({ error: "Pick one of the five eggs" }, { status: 400 });
  }
  const speciesId = body.speciesId;

  // Only set it if still empty, so a double-click or second tab can't change the choice.
  const claimed = await prisma.user.updateMany({
    where: { id: userId, companionSpecies: null },
    data: { companionSpecies: speciesId },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ error: "You already chose an egg" }, { status: 409 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const hatched = isHatched(user);
  const companion: CompanionInfo = {
    speciesId,
    hatched,
    stage: companionStage(user.level, hatched),
    learnedMoves: parseLearnedMoves(user.learnedMoves),
    lastTopicId: user.lastTopicId ?? null,
  };
  return NextResponse.json({ companion });
}
