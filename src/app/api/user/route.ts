import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseEquippedCosmetics } from "@/lib/shop";
import { getUserBelief } from "@/lib/prompts/userBelief";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      inventory: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const equippedCosmetics = parseEquippedCosmetics(user.equippedCosmetics);

  return NextResponse.json({
    id: user.id,
    username: user.username,
    featherBalance: user.featherBalance,
    equippedCosmetics,
    ownedItemIds: user.inventory.map((i) => i.itemId),
    civilityScore: user.civilityScore,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    beliefKey: getUserBelief(user.surveyResponses),
    createdAt: user.createdAt,
  });
}
