import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pickPersona, isTier } from "@/lib/personas/pool";

/**
 * Picks the partner for a difficulty tier ahead of time so the setup screen can show
 * their initials. Only id + initials leave the server — backstory/params stay private.
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

  const persona = pickPersona(tier);
  return NextResponse.json({ id: persona.id, initials: persona.initials });
}
