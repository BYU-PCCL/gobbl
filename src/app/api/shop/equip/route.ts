import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  SHOP_SLOTS,
  type EquippedCosmetics,
  type ShopSlot,
  getShopItem,
  isValidItemId,
  parseEquippedCosmetics,
  serializeEquippedCosmetics,
} from "@/lib/shop";

function isSlot(s: string): s is ShopSlot {
  return SHOP_SLOTS.includes(s as ShopSlot);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  let body: { turkeyId?: string; slot?: string; itemId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.turkeyId || typeof body.turkeyId !== "string") {
    return NextResponse.json({ error: "Missing turkeyId" }, { status: 400 });
  }
  const turkeyId = body.turkeyId;

  const slot = body.slot;
  if (!slot || typeof slot !== "string" || !isSlot(slot)) {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  }

  const rawItemId = body.itemId;
  if (rawItemId !== null && rawItemId !== undefined && typeof rawItemId !== "string") {
    return NextResponse.json({ error: "Invalid itemId" }, { status: 400 });
  }

  const itemId = rawItemId === undefined ? undefined : rawItemId;

  if (itemId !== null && itemId !== undefined) {
    if (!isValidItemId(itemId)) {
      return NextResponse.json({ error: "Unknown item" }, { status: 400 });
    }
    const item = getShopItem(itemId)!;
    if (item.slot !== slot) {
      return NextResponse.json({ error: "Item does not match slot" }, { status: 400 });
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { inventory: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const turkey = await prisma.turkey.findFirst({ where: { id: turkeyId, userId } });
  if (!turkey) {
    return NextResponse.json({ error: "Turkey not found" }, { status: 404 });
  }

  const owned = new Set(user.inventory.map((i) => i.itemId));
  let next: EquippedCosmetics = parseEquippedCosmetics(turkey.equippedCosmetics);

  if (itemId === null) {
    delete next[slot];
  } else if (itemId === undefined) {
    return NextResponse.json({ error: "Missing itemId (use null to unequip)" }, { status: 400 });
  } else {
    if (!owned.has(itemId)) {
      return NextResponse.json({ error: "You do not own this item" }, { status: 403 });
    }
    next = { ...next, [slot]: itemId };
  }

  next = serializeEquippedCosmetics(next);

  await prisma.turkey.update({
    where: { id: turkey.id },
    data: { equippedCosmetics: next },
  });

  return NextResponse.json({ equipped: next });
}
