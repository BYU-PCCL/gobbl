"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TurkeyCharacter, type TurkeyReaction } from "@/components/turkey/TurkeyCharacter";
import { useFlock } from "@/components/turkey/useFlock";
import { fetchJson } from "@/lib/fetchJson";
import { TURKEY_SKILLS, type TurkeySkillKey } from "@/lib/flock/skills";
import type { TurkeyView } from "@/lib/flock/view";

const TAPS_TO_HATCH = 5;
const NAME_MAX = 20;

/** Crack lines drawn over the egg; more appear with each tap. */
const CRACKS = [
  "M96 62 L102 74 L95 84",
  "M70 96 L82 100 L78 112 L90 116",
  "M130 92 L118 104 L124 114",
  "M88 138 L98 130 L108 142 L118 134",
];

function CrackOverlay({ taps, size }: { taps: number; size: number }) {
  const shown = Math.min(CRACKS.length, Math.ceil((taps / TAPS_TO_HATCH) * CRACKS.length));
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className="pointer-events-none absolute inset-0"
      aria-hidden
    >
      {CRACKS.slice(0, shown).map((d, i) => (
        <path key={i} d={d} stroke="#561B0F" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.7} />
      ))}
    </svg>
  );
}

export default function HatchPage() {
  const router = useRouter();
  const { status } = useSession();
  const { turkeys, select, reload, loading, error } = useFlock();

  const [picking, setPicking] = useState<TurkeySkillKey | null>(null);
  const [pickError, setPickError] = useState("");
  const [taps, setTaps] = useState(0);
  const [reaction, setReaction] = useState<TurkeyReaction>("none");
  const [name, setName] = useState("Gobbles");
  const [naming, setNaming] = useState(false);
  const [nameError, setNameError] = useState("");

  const unhatched = turkeys.find((t) => !t.hatched) ?? null;
  const hasTurkeys = turkeys.length > 0;

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    if (!loading && hasTurkeys && !unhatched) router.replace("/home");
  }, [loading, hasTurkeys, unhatched, router]);

  async function pickEgg(skill: TurkeySkillKey) {
    setPicking(skill);
    setPickError("");
    try {
      await fetchJson<{ turkey: TurkeyView }>("/api/turkeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill }),
      });
      await reload();
    } catch (e) {
      setPickError(e instanceof Error ? e.message : "Could not pick that egg");
    } finally {
      setPicking(null);
    }
  }

  function tapEgg() {
    if (taps >= TAPS_TO_HATCH) return;
    setTaps((n) => n + 1);
    setReaction("cheer");
  }

  async function hatch(e: React.FormEvent) {
    e.preventDefault();
    if (!unhatched) return;
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > NAME_MAX) {
      setNameError(`Pick a name between 1 and ${NAME_MAX} characters.`);
      return;
    }
    setNaming(true);
    setNameError("");
    try {
      const turkey = await fetchJson<TurkeyView>(`/api/turkeys/${unhatched.id}/hatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      select(turkey.id);
      router.push("/home");
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Could not hatch your turkey");
      setNaming(false);
    }
  }

  if (status === "unauthenticated") return null;

  if (loading || status === "loading" || (hasTurkeys && !unhatched)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center font-body text-ink-soft">
        Warming the nest...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <p className="font-body text-ink-soft">We could not load your flock: {error}</p>
        <Button onClick={() => void reload()}>Try again</Button>
      </div>
    );
  }

  // (a) Pick an egg
  if (!hasTurkeys) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-display-lg text-ink">Choose your egg</h1>
        <p className="mt-2 font-body text-ink-soft">
          Every turkey grows alongside a skill. Pick the one you want to nurture first.
        </p>
        {pickError && <p className="mt-3 font-body text-sm text-plume-500">{pickError}</p>}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {TURKEY_SKILLS.map((s) => (
            <Card key={s.key} hover className="flex flex-col items-center gap-1 p-4 text-center">
              <TurkeyCharacter stage={1} mood="happy" skill={s.key} size={104} label={`${s.label} egg`} />
              <h2 className="font-display text-lg font-bold text-ink">{s.label}</h2>
              <p className="flex-1 font-body text-xs text-ink-soft">{s.blurb}</p>
              <Button
                size="sm"
                className="mt-2"
                loading={picking === s.key}
                disabled={picking !== null}
                onClick={() => pickEgg(s.key)}
              >
                Choose
              </Button>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const egg = unhatched!;
  const cracked = taps >= TAPS_TO_HATCH;
  const size = 240;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-10 text-center">
      {!cracked ? (
        <>
          <h1 className="font-display text-display-lg text-ink">Your egg is stirring</h1>
          <p className="mt-2 font-body text-ink-soft">
            Tap the egg to help it hatch. {taps === 0 ? "Gently now." : `${TAPS_TO_HATCH - taps} more.`}
          </p>
          <div className="relative mt-6" style={{ width: size, height: size }}>
            <TurkeyCharacter
              stage={1}
              mood="happy"
              skill={egg.skill}
              size={size}
              label="Your egg"
              reaction={reaction}
              onReactionEnd={() => setReaction("none")}
              onTap={tapEgg}
            />
            <CrackOverlay taps={taps} size={size} />
          </div>
          <div className="mt-4 flex gap-2" aria-hidden>
            {Array.from({ length: TAPS_TO_HATCH }).map((_, i) => (
              <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < taps ? "bg-primary" : "bg-line"}`} />
            ))}
          </div>
        </>
      ) : (
        <>
          <h1 className="font-display text-display-lg text-ink">It is hatching!</h1>
          <p className="mt-2 font-body text-ink-soft">What will you call your new turkey?</p>
          <div className="relative mt-6" style={{ width: size, height: size }}>
            <TurkeyCharacter stage={1} mood="happy" skill={egg.skill} size={size} label="Your egg" />
            <CrackOverlay taps={TAPS_TO_HATCH} size={size} />
          </div>
          <form onSubmit={hatch} className="mt-6 w-full space-y-4 text-left">
            <Input
              label="Name"
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              error={nameError}
              hint={`${NAME_MAX} characters at most`}
              autoFocus
            />
            <Button type="submit" size="lg" className="w-full" loading={naming}>
              Hatch {name.trim() || "my turkey"}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
