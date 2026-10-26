import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorized } from "@/lib/session";
import { parseEquippedCosmetics } from "@/lib/shop";

export async function GET(req: Request) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return unauthorized();

  const url = new URL(req.url);
  const sortBy = url.searchParams.get("sort") || "xp";
  const period = url.searchParams.get("period") || "all";

  let orderBy: Record<string, string> = {};
  switch (sortBy) {
    case "civility":
      orderBy = { civilityScore: "desc" };
      break;
    case "streak":
      orderBy = { longestStreak: "desc" };
      break;
    default:
      orderBy = { xp: "desc" };
  }

  const users = await prisma.user.findMany({
    orderBy,
    take: 50,
    select: {
      id: true,
      username: true,
      xp: true,
      level: true,
      civilityScore: true,
      currentStreak: true,
      longestStreak: true,
      equippedCosmetics: true,
      _count: { select: { debates: { where: { completed: true } } } },
    },
  });

  const currentUserId = sessionUser.id;

  return NextResponse.json(
    users.map((u, idx) => ({
      rank: idx + 1,
      id: u.id,
      username: u.username,
      xp: u.xp,
      level: u.level,
      civilityScore: Math.round(u.civilityScore * 10) / 10,
      streak: u.currentStreak,
      longestStreak: u.longestStreak,
      totalDebates: u._count.debates,
      isCurrentUser: u.id === currentUserId,
      equippedCosmetics: parseEquippedCosmetics(u.equippedCosmetics),
    }))
  );
}
