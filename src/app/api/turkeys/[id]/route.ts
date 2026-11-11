import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TREND_WINDOW } from "@/lib/flock/config";
import { skillTrend } from "@/lib/flock/trend";
import { toTurkeyView } from "@/lib/flock/view";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  try {
    const turkey = await prisma.turkey.findFirst({ where: { id, userId } });
    if (!turkey) {
      return NextResponse.json({ error: "Turkey not found" }, { status: 404 });
    }

    const [scored, recent] = await Promise.all([
      prisma.turkeyActivity.findMany({
        where: { turkeyId: id, counted: true, score: { not: null } },
        orderBy: { completedAt: "desc" },
        take: TREND_WINDOW,
        select: { score: true },
      }),
      prisma.turkeyActivity.findMany({
        where: { turkeyId: id, completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
        take: 10,
        select: { kind: true, score: true, feathers: true, completedAt: true },
      }),
    ]);

    const scores = scored.map((a) => a.score as number).reverse();
    return NextResponse.json({
      turkey: toTurkeyView(turkey, new Date()),
      trend: skillTrend(scores),
      recent,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not load turkey" }, { status: 500 });
  }
}
