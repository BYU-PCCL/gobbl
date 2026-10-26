import { NextResponse } from "next/server";
import { getSessionUser, unauthorized } from "@/lib/session";
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
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return unauthorized();

  const userId = sessionUser.id;

  let body: { slot?: string; itemId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

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

  const owned = new Set(user.inventory.map((i) => i.itemId));
  let next: EquippedCosmetics = parseEquippedCosmetics(user.equippedCosmetics);

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

  await prisma.user.update({
    where: { id: userId },
    data: { equippedCosmetics: next },
  });

  return NextResponse.json({ equipped: next });
}
