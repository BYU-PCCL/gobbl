import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pickOpposingPersona, isTier } from "@/lib/personas/pool";
import { getUserBelief } from "@/lib/prompts/userBelief";

/**
 * Picks the partner for a difficulty tier ahead of time so the setup screen can show
 * their initials and politics. Only id + initials + beliefKey leave the server —
 * backstory/params stay private.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = new URL(req.url).searchParams.get("tier") ?? "";
  if (!isTier(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { surveyResponses: true },
  });

  const persona = pickOpposingPersona(tier, getUserBelief(user?.surveyResponses));
  return NextResponse.json({ id: persona.id, initials: persona.initials, beliefKey: persona.beliefKey });
}
