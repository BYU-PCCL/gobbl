import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isTurkeySkill } from "@/lib/flock/skills";
import { toTurkeyView } from "@/lib/flock/view";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  try {
    const [rows, user] = await Promise.all([
      prisma.turkey.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.user.findUnique({ where: { id: userId }, select: { featherBalance: true } }),
    ]);
    const now = new Date();
    return NextResponse.json({
      turkeys: rows.map((r) => toTurkeyView(r, now)),
      featherBalance: user?.featherBalance ?? 0,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not load flock" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  let body: { skill?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isTurkeySkill(body.skill)) {
    return NextResponse.json({ error: "Invalid skill" }, { status: 400 });
  }
  const skill = body.skill;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.turkey.count({ where: { userId } });
      if (count > 0) return null;
      return tx.turkey.create({ data: { userId, skill } });
    });
    if (!result) {
      return NextResponse.json({ error: "Buy more eggs in the shop" }, { status: 409 });
    }
    return NextResponse.json({ turkey: toTurkeyView(result, new Date()) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Buy more eggs in the shop" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Could not create egg" }, { status: 500 });
  }
}
