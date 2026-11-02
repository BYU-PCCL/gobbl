import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toTurkeyView } from "@/lib/flock/view";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  let body: { name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 20) {
    return NextResponse.json({ error: "Name must be 1-20 characters" }, { status: 400 });
  }

  try {
    const turkey = await prisma.turkey.findFirst({ where: { id, userId } });
    if (!turkey) {
      return NextResponse.json({ error: "Turkey not found" }, { status: 404 });
    }
    const now = new Date();
    // Conditional update guards against double-hatch races.
    const res = await prisma.turkey.updateMany({
      where: { id, userId, hatchedAt: null },
      data: { name, hatchedAt: now, lastFedAt: now, lastSocialAt: now, lastTaughtAt: now },
    });
    if (res.count === 0) {
      return NextResponse.json({ error: "Already hatched" }, { status: 409 });
    }
    const updated = await prisma.turkey.findUniqueOrThrow({ where: { id } });
    return NextResponse.json(toTurkeyView(updated, now));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Hatch failed" }, { status: 500 });
  }
}
