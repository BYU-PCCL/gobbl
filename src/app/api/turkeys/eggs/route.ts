import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EGG_COST } from "@/lib/flock/config";
import { canBuyEgg } from "@/lib/flock/eggs";
import { isTurkeySkill } from "@/lib/flock/skills";
import { toTurkeyView } from "@/lib/flock/view";

const REJECTIONS = {
  invalid: { status: 400, error: "Invalid skill" },
  owned: { status: 409, error: "Already owned" },
  insufficient: { status: 402, error: "Not enough feathers" },
} as const;

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
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { featherBalance: true },
      });
      if (!user) return { notFound: true as const };

      const owned = await tx.turkey.findMany({ where: { userId }, select: { skill: true } });
      const verdict = canBuyEgg(
        user.featherBalance,
        owned.map((t) => t.skill),
        skill,
      );
      if (verdict !== "ok") {
        return { verdict, featherBalance: user.featherBalance };
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: { featherBalance: { decrement: EGG_COST } },
        select: { featherBalance: true },
      });
      const turkey = await tx.turkey.create({ data: { userId, skill } });
      return { turkey, featherBalance: updated.featherBalance };
    });

    if ("notFound" in result) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if ("verdict" in result) {
      const { status, error } = REJECTIONS[result.verdict as keyof typeof REJECTIONS];
      return NextResponse.json({ error, featherBalance: result.featherBalance }, { status });
    }
    return NextResponse.json({
      turkey: toTurkeyView(result.turkey, new Date()),
      featherBalance: result.featherBalance,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Already owned" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Purchase failed" }, { status: 500 });
  }
}
