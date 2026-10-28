"use client";

import { Companion } from "@/components/companion/Companion";
import type { SpeciesId } from "@/lib/companion";
import type { EquippedCosmetics } from "@/lib/shop";

/** The companion on its pad with the contextual nest line, inside a soft framed scene. */
export function NestScene({
  speciesId, level, hatched, equipped, line,
}: {
  speciesId: SpeciesId | null;
  level: number;
  hatched: boolean;
  equipped?: EquippedCosmetics | null;
  line: string;
}) {
  return (
    <div className="relative isolate overflow-hidden rounded-[28px] border border-line bg-surface-2 px-3 pb-6 pt-5">
      <div aria-hidden className="absolute -right-8 -top-10 -z-10 h-36 w-36 rounded-full bg-ochre-soft" />
      <Companion variant="scene" speciesId={speciesId} level={level} hatched={hatched} equipped={equipped} line={line} />
    </div>
  );
}
