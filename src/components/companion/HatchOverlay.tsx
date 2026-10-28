"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FlatTurkey } from "@/components/gamification/FlatTurkey";
import { getSpecies, type SpeciesId } from "@/lib/companion";

/**
 * Full-screen moment shown the first time a Teach quiz is passed: the egg cracks (animate-hatch)
 * and becomes the stage-2 turkey in the species palette.
 */
export interface HatchOverlayProps {
  speciesId: SpeciesId | null;
  /** Name of the move the module taught, e.g. "COMMON GROUND". */
  moveName: string;
  onDone: () => void;
  /** Button label. */
  doneLabel?: string;
}

export function HatchOverlay({ speciesId, moveName, onDone, doneLabel = "To the Nest" }: HatchOverlayProps) {
  const species = getSpecies(speciesId);
  const [hatched, setHatched] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setHatched(true);
      return;
    }
    const t = setTimeout(() => setHatched(true), 1100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    btnRef.current?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hatch-title"
      onKeyDown={(e) => {
        // Not dismissible: keep Escape from doing anything.
        if (e.key === "Escape") e.preventDefault();
      }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-ink p-6 text-center text-bg"
    >
      <div className="flex h-[220px] w-[220px] items-center justify-center">
        {hatched ? (
          <div className="animate-strut">
            <FlatTurkey stage={2} size={200} palette={species.palette} />
          </div>
        ) : (
          <div className="animate-hatch">
            <FlatTurkey stage={1} size={200} palette={species.palette} eggPattern={species.eggPattern} />
          </div>
        )}
      </div>
      <h2 id="hatch-title" className="font-display text-3xl font-bold tracking-[-0.03em]">It hatched!</h2>
      <p className="max-w-xs font-body text-base" aria-live="polite">
        {species.commonName} learned {moveName}.
      </p>
      <Button ref={btnRef} onClick={onDone}>{doneLabel}</Button>
    </div>
  );
}
