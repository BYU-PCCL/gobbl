"use client";

import { FlatTurkey } from "@/components/gamification/FlatTurkey";
import { AvatarWithItems } from "@/components/gamification/AvatarWithItems";
import { companionStage, getSpecies, type SpeciesId } from "@/lib/companion";
import type { EquippedCosmetics } from "@/lib/shop";

/**
 * The egg/turkey plus a speech bubble. Appears on every Learn/Teach/Reflect step, the Playground
 * topic picker and the Nest. `row`: art left, bubble right. `scene`: bubble above, art centered.
 */
export interface CompanionProps {
  speciesId: SpeciesId | null;
  level: number;
  hatched: boolean;
  equipped?: EquippedCosmetics | null;
  line: string;
  variant: "row" | "scene";
  size?: number;
  className?: string;
}

const TWIG = "repeating-linear-gradient(100deg, #8A5A34 0 5px, #5E3B1F 5px 8px, #8A5A34 8px 14px)";

/** Straw pad the companion stands on. */
export function StrawPad({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[50%] border-[3px] bg-ochre-soft ${className}`}
      style={{ width: "118%", height: "26%", borderColor: "#5E3B1F", backgroundImage: TWIG, boxShadow: "inset 0 -3px 0 rgba(228,165,71,0.35)" }}
    />
  );
}

export function Companion({ speciesId, level, hatched, equipped, line, variant, size, className }: CompanionProps) {
  const species = getSpecies(speciesId);
  const stage = companionStage(level, hatched);
  const scene = variant === "scene";
  const px = size ?? (scene ? 140 : 88);

  const art = (
    <div className="relative flex shrink-0 items-end justify-center" style={{ width: px, height: px }}>
      <StrawPad />
      <div className="relative z-10 drop-shadow-[0_6px_4px_rgba(92,74,58,0.2)]">
        {stage === 1 ? (
          <div className="animate-wiggle" style={{ transformOrigin: "50% 92%" }}>
            <FlatTurkey stage={1} size={px} palette={species.palette} eggPattern={species.eggPattern} />
          </div>
        ) : (
          <AvatarWithItems stage={stage} size={px} palette={species.palette} equipped={equipped ?? {}} showShadow={false} />
        )}
      </div>
    </div>
  );

  const bubble = (
    <div
      className={`relative min-w-0 rounded-2xl border border-line bg-surface px-4 py-2.5 shadow-soft ${
        scene ? "w-full max-w-[330px] text-center" : "flex-1"
      }`}
    >
      <p aria-live="polite" className="font-body text-[15px] leading-snug text-ink">
        {line}
      </p>
      <span
        aria-hidden
        className={`absolute h-3 w-3 rotate-45 bg-surface ${
          scene
            ? "-bottom-[7px] left-1/2 -ml-1.5 border-b border-r border-line"
            : "-left-[7px] top-1/2 -mt-1.5 border-b border-l border-line"
        }`}
      />
    </div>
  );

  if (scene) {
    return (
      <div className={["flex flex-col items-center gap-4", className].filter(Boolean).join(" ")}>
        {bubble}
        {art}
      </div>
    );
  }
  return <div className={["flex items-center gap-4", className].filter(Boolean).join(" ")}>{art}{bubble}</div>;
}
