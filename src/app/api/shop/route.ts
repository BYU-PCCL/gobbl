import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SHOP_CATALOG } from "@/lib/shop";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { inventory: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const ownedIds = new Set(user.inventory.map((i) => i.itemId));

  const items = SHOP_CATALOG.map((item) => ({
    ...item,
    owned: ownedIds.has(item.id),
    canAfford: user.featherBalance >= item.cost,
  }));

  return NextResponse.json({
    featherBalance: user.featherBalance,
    level: user.level,
    items,
  });
}
