"use client";

import React from "react";
import { FlatTurkey, type FlatTurkeyPalette } from "./FlatTurkey";
import type { EggPattern } from "@/lib/companion";
import { ItemLayer, ITEM_RENDERERS } from "./ItemLayers";
import { getShopItem } from "@/lib/shop";
import type { EquippedCosmetics } from "@/lib/shop";
import { getSlotOffset } from "@/lib/avatarAnchors";

const SIZE_PX: Record<string, number> = { xs: 40, sm: 64, md: 96, lg: 160, xl: 220 };

function resolvePx(size: number | string): number {
  return typeof size === "number" ? size : (SIZE_PX[size] ?? 96);
}

export interface AvatarWithItemsProps {
  stage: number;
  size?: number | "xs" | "sm" | "md" | "lg" | "xl";
  equipped?: EquippedCosmetics;
  palette?: FlatTurkeyPalette;
  eggPattern?: EggPattern;
  animate?: boolean;
  showShadow?: boolean;
  className?: string;
}

export function AvatarWithItems({
  stage,
  size = "md",
  equipped = {},
  palette,
  eggPattern,
  animate = false,
  showShadow = true,
  className,
}: AvatarWithItemsProps) {
  const px = resolvePx(size);
  const BgRenderer = equipped.background ? ITEM_RENDERERS[equipped.background] : undefined;

  return (
    <div className={className} style={{ position: "relative", width: px, height: px, flexShrink: 0 }}>
      {/* Background — clipped to squircle */}
      {BgRenderer && (
        <div style={{ position: "absolute", inset: 0, borderRadius: "32%", overflow: "hidden" }}>
          <svg viewBox="0 0 200 200" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
            <BgRenderer />
          </svg>
        </div>
      )}
      {/* Ground shadow */}
      {showShadow && (
        <svg
          viewBox="0 0 200 200"
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          <ellipse cx="100" cy="184" rx="42" ry="5" fill="#1A1612" opacity="0.18" />
        </svg>
      )}
      {/* Cape (behind turkey) */}
      {equipped.cape && <ItemLayer id={equipped.cape} translate={getSlotOffset(stage, "cape")} />}
      {/* Turkey */}
      <div style={{ position: "absolute", inset: 0 }}>
        <FlatTurkey stage={stage} size={px} palette={palette} eggPattern={eggPattern} animate={animate} />
      </div>
      {/* Hat */}
      {equipped.hat && <ItemLayer id={equipped.hat} translate={getSlotOffset(stage, "hat")} />}
      {/* Face */}
      {equipped.face && <ItemLayer id={equipped.face} translate={getSlotOffset(stage, "face")} />}
      {/* Neck */}
      {equipped.neck && <ItemLayer id={equipped.neck} translate={getSlotOffset(stage, "neck")} />}
      {/* Chest */}
      {equipped.chest && <ItemLayer id={equipped.chest} translate={getSlotOffset(stage, "chest")} />}
    </div>
  );
}

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
    <AvatarWithItems
      stage={stage}
      size={size}
      equipped={{ [item.slot]: item.id }}
      showShadow={false}
    />
  );
}
