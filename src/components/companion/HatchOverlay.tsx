"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FlatTurkey } from "@/components/gamification/FlatTurkey";
import { fetchJson } from "@/lib/fetchJson";
import { getSpecies, type SpeciesId } from "@/lib/companion";
import type { TurkeyView } from "@/lib/flock/view";

const NAME_MAX = 20;

/**
 * Full-screen moment shown when the first egg hatches (the first passed Teach quiz): the egg
 * cracks (animate-hatch), becomes a hatchling in its species colours, and the user names it.
 * Naming is what records the hatch (POST /api/turkeys/[id]/hatch).
 */
export interface HatchOverlayProps {
  /** The egg that is hatching. */
  turkeyId: string;
  speciesId: SpeciesId | null;
  /** Called with the hatched turkey once it has been named and saved. */
  onDone: (turkey: TurkeyView) => void;
  /** Button label. */
  doneLabel?: string;
}

export function HatchOverlay({ turkeyId, speciesId, onDone, doneLabel = "Keep going" }: HatchOverlayProps) {
  const species = getSpecies(speciesId);
  const [hatched, setHatched] = useState(false);
  const [name, setName] = useState("Gobbles");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (hatched) inputRef.current?.select();
  }, [hatched]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > NAME_MAX) {
      setError(`Pick a name between 1 and ${NAME_MAX} characters.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const turkey = await fetchJson<TurkeyView>(`/api/turkeys/${turkeyId}/hatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      onDone(turkey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not hatch your turkey");
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hatch-title"
      onKeyDown={(e) => {
        // Not dismissible: keep Escape from doing anything.
        if (e.key === "Escape") e.preventDefault();
      }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 overflow-y-auto bg-ink p-6 text-center text-bg"
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
      <h2 id="hatch-title" className="font-display text-3xl font-bold tracking-[-0.03em]" aria-live="polite">
        {hatched ? "It hatched!" : "Something is stirring..."}
      </h2>
      {hatched && (
        <form onSubmit={submit} className="flex w-full max-w-xs flex-col items-stretch gap-3">
          <label htmlFor="hatch-name" className="font-body text-base">
            You taught your {species.commonName} egg enough to come out. What will you call it?
          </label>
          <input
            id="hatch-name"
            ref={inputRef}
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "hatch-name-error" : undefined}
            className="rounded-xl border border-line bg-surface px-4 py-3 text-center font-body text-base text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          {error && (
            <p id="hatch-name-error" role="alert" className="font-body text-sm">
              {error}
            </p>
          )}
          <Button type="submit" loading={saving}>
            {doneLabel}
          </Button>
        </form>
      )}
    </div>
  );
}
