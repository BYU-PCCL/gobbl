import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stageForActivityCount } from "@/lib/flock/growth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    orderBy: { lastActiveDate: { sort: "desc", nulls: "last" } },
    take: 50,
    select: {
      id: true,
      username: true,
      currentStreak: true,
      turkeys: {
        select: { skill: true, name: true, hatchedAt: true, activityCount: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { debates: { where: { completed: true } } } },
    },
  });

  const currentUserId = (session.user as { id: string }).id;

  return NextResponse.json(
    users.map((u) => {
      // Lead turkey: the first hatched turkey, else the first egg.
      const lead = u.turkeys.find((t) => t.hatchedAt !== null) ?? u.turkeys[0] ?? null;
      return {
        id: u.id,
        username: u.username,
        streak: u.currentStreak,
        totalDebates: u._count.debates,
        isCurrentUser: u.id === currentUserId,
        turkey: lead
          ? {
              skill: lead.skill,
              name: lead.name,
              hatched: lead.hatchedAt !== null,
              stage: stageForActivityCount(lead.activityCount, lead.hatchedAt !== null),
            }
          : null,
      };
    })
  );
}
