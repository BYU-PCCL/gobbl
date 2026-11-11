"use client";

import { ITEM_RENDERERS } from "./ItemLayers";
import { getShopItem } from "@/lib/shop";
import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";

/** One shop item shown on a plain turkey (or, for a background, as the scene itself). */
export function ItemProductShot({
  itemId,
  stage = 5,
  size = 120,
}: {
  itemId: string;
  stage?: number;
  size?: number;
}) {
  const item = getShopItem(itemId);
  if (!item) return null;

  if (item.slot === "background") {
    const BgRenderer = ITEM_RENDERERS[itemId];
    if (!BgRenderer) return null;
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit" }}>
        <svg viewBox="0 0 200 200" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <BgRenderer />
        </svg>
      </div>
    );
  }

  return (
    <TurkeyCharacter
      stage={stage}
      size={size}
      equipped={{ [item.slot]: item.id }}
      showShadow={false}
      animate={false}
      decorative
    />
  );
}
