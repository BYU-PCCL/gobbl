"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EggHatch } from "@/components/companion/EggHatch";
import { fetchJson } from "@/lib/fetchJson";
import { getSpecies, type SpeciesId } from "@/lib/companion";
import type { TurkeyView } from "@/lib/flock/view";

const NAME_MAX = 20;
const ROCKS = 3;
const ROCK_MS = 450;

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Full-screen moment shown when the first egg hatches (the first passed Teach quiz): the egg
 * rocks, its shell breaks apart and a hatchling rises out (the same EggHatch the Hatch page
 * uses), then the user names it. Naming is what records the hatch
 * (POST /api/turkeys/[id]/hatch).
 */
export interface HatchOverlayProps {
  /** The egg that is hatching. */
  turkeyId: string;
  speciesId: SpeciesId | null;
  /** Called with the hatched turkey once it has been named and saved. */
  onDone: (turkey: TurkeyView) => void;
  /** Kept for the existing caller; the button always says what it does ("Name and hatch"). */
  doneLabel?: string;
}

export function HatchOverlay({ turkeyId, speciesId, onDone }: HatchOverlayProps) {
  const species = getSpecies(speciesId);
  const [progress, setProgress] = useState(0);
  const [hatched, setHatched] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [name, setName] = useState("Gobbles");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // The egg rocks a few times on its own, then breaks apart.
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setProgress(ROCKS);
      setHatched(true);
      return;
    }
    const timers: number[] = [];
    for (let i = 1; i <= ROCKS; i++) timers.push(window.setTimeout(() => setProgress(i), i * ROCK_MS));
    timers.push(window.setTimeout(() => setHatched(true), ROCKS * ROCK_MS + 300));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  // Focus moves into the dialog on open, then to the name field (text selected) once it shows.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);
  useEffect(() => {
    if (revealed) inputRef.current?.select();
  }, [revealed]);

  // Keep Tab inside the dialog. Not dismissible: Escape does nothing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const panel = panelRef.current;
      if (e.key === "Escape") {
        e.preventDefault();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

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
    } catch {
      setError("We could not hatch your turkey. Check your connection and try again.");
      setSaving(false);
    }
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hatch-title"
      tabIndex={-1}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 overflow-y-auto bg-ink p-6 text-center text-bg focus:outline-none"
    >
      <EggHatch
        palette={species.palette}
        eggPattern={species.eggPattern}
        progress={progress}
        total={ROCKS}
        hatched={hatched}
        size={220}
        onHatched={() => setRevealed(true)}
      />
      <h2 id="hatch-title" className="font-display text-3xl font-bold tracking-[-0.03em]" aria-live="polite">
        {revealed ? "It hatched!" : "Something is stirring..."}
      </h2>
      {revealed && (
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
            onFocus={(e) => e.currentTarget.select()}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "hatch-name-error" : undefined}
            className="min-h-[44px] rounded-xl border border-line bg-surface px-4 py-3 text-center font-body text-base text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          {error && (
            <p id="hatch-name-error" role="alert" className="font-body text-sm text-ochre">
              {error}
            </p>
          )}
          <Button type="submit" loading={saving}>
            Name and hatch
          </Button>
        </form>
      )}
    </div>
  );
}
