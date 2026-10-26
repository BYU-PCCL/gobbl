import { NextResponse } from "next/server";
import { getSessionUser, unauthorized } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getShopItem, isValidItemId } from "@/lib/shop";

export async function POST(req: Request) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return unauthorized();

  const userId = sessionUser.id;

  let body: { itemId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const itemId = body.itemId;
  if (!itemId || typeof itemId !== "string" || !isValidItemId(itemId)) {
    return NextResponse.json({ error: "Invalid item" }, { status: 400 });
  }

  const catalogItem = getShopItem(itemId)!;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { inventory: { where: { itemId } } },
      });

      if (!user) {
        return { error: "User not found" as const };
      }

      if (user.inventory.length > 0) {
        return { alreadyOwned: true as const, featherBalance: user.featherBalance };
      }

      if (catalogItem.unlockAt !== undefined && user.level < catalogItem.unlockAt) {
        return { locked: true as const, unlockAt: catalogItem.unlockAt };
      }

      if (user.featherBalance < catalogItem.cost) {
        return { insufficient: true as const, featherBalance: user.featherBalance };
      }

      await tx.user.update({
        where: { id: userId },
        data: { featherBalance: { decrement: catalogItem.cost } },
      });

      await tx.userInventory.create({
        data: { userId, itemId },
      });

      const updated = await tx.user.findUnique({
        where: { id: userId },
        select: { featherBalance: true },
      });

      return {
        success: true as const,
        featherBalance: updated!.featherBalance,
        itemId,
      };
    });

    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    if ("alreadyOwned" in result && result.alreadyOwned) {
      return NextResponse.json(
        { error: "Already owned", code: "ALREADY_OWNED", featherBalance: result.featherBalance },
        { status: 409 }
      );
    }
    if ("locked" in result && result.locked) {
      return NextResponse.json(
        { error: `Unlocks at level ${result.unlockAt}`, code: "LOCKED", unlockAt: result.unlockAt },
        { status: 403 }
      );
    }
    if ("insufficient" in result && result.insufficient) {
      return NextResponse.json(
        { error: "Not enough feathers", code: "NOT_ENOUGH_FEATHERS", featherBalance: result.featherBalance },
        { status: 402 }
      );
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Purchase failed" }, { status: 500 });
  }
}
