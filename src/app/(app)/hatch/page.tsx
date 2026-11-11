"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FlatTurkey, FlatTurkeyGlyph } from "@/components/gamification/FlatTurkey";
import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";
import { useFlock } from "@/components/turkey/useFlock";
import { fetchJson } from "@/lib/fetchJson";
import { getSpecies, professorIntro, PROFESSOR_NAME } from "@/lib/companion";
import { EGG_SKILLS, getTurkeySkill, type TurkeySkillKey } from "@/lib/flock/skills";
import { getModule } from "@/lib/modules/registry";
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

const TWIG = "repeating-linear-gradient(100deg, #8A5A34 0 5px, #5E3B1F 5px 8px, #8A5A34 8px 14px)";
const TWIG_FRONT = "repeating-linear-gradient(80deg, #8A5A34 0 6px, #5E3B1F 6px 9px, #8A5A34 9px 15px)";

/** Where each egg sits in the nest: back row of 3, front row of 2 (percent of the scene). */
const NEST_POS = [
  { x: 21, y: 44, r: -9, z: 1, s: 0.84 },
  { x: 50, y: 40, r: 3, z: 1, s: 0.84 },
  { x: 79, y: 44, r: 9, z: 1, s: 0.84 },
  { x: 34, y: 68, r: -5, z: 2, s: 1 },
  { x: 66, y: 67, r: 6, z: 2, s: 1 },
];

/** The first egg: five eggs in a nest, one per skill, introduced by the professor. */
function NestPicker({ username, onPicked }: { username: string | null; onPicked: () => Promise<void> }) {
  const [chosen, setChosen] = useState<TurkeySkillKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const skill = chosen ? getTurkeySkill(chosen) : null;
  const species = skill ? getSpecies(skill.species) : null;
  const mod = skill?.moduleKey ? getModule(skill.moduleKey) : null;

  async function choose() {
    if (!chosen || saving) return;
    setSaving(true);
    setError(null);
    try {
      await fetchJson<{ turkey: TurkeyView }>("/api/turkeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill: chosen }),
      });
      await onPicked();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your egg");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft">
          <FlatTurkeyGlyph size={30} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="eyebrow mb-1 text-ink-muted">{PROFESSOR_NAME}</div>
          <p aria-live="polite" className="rounded-2xl border border-line bg-surface px-4 py-3 font-body text-[15px] leading-snug text-ink">
            {species ? species.professorLine : professorIntro(username)}
          </p>
        </div>
      </div>

      <div className="relative isolate min-h-[360px] overflow-hidden rounded-[28px] border border-line bg-surface-2 sm:min-h-[420px]">
        <div aria-hidden className="absolute -right-8 -top-10 -z-10 h-36 w-36 rounded-full bg-ochre-soft" />
        <div
          aria-hidden
          className="absolute bottom-2.5 left-[3%] h-[68%] w-[94%] rounded-[50%] bg-ochre-soft"
          style={{ boxShadow: "inset 0 -6px 0 rgba(228,165,71,0.35)" }}
        >
          <div
            className="absolute bottom-[12%] left-1/2 h-[74%] w-[84%] -translate-x-1/2 rounded-[50%] border-[3px]"
            style={{ backgroundImage: TWIG, borderColor: "#5E3B1F" }}
          />
          <div
            className="absolute bottom-[6%] left-1/2 h-[36%] w-[84%] -translate-x-1/2 border-[3px] border-t-0"
            style={{ backgroundImage: TWIG_FRONT, borderColor: "#5E3B1F", borderRadius: "0 0 50% 50% / 0 0 100% 100%" }}
          />
        </div>
        {EGG_SKILLS.map((s, i) => {
          const sp = getSpecies(s.species);
          const p = NEST_POS[i % NEST_POS.length];
          const lifted = chosen === s.key;
          const dim = chosen !== null && !lifted;
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={lifted}
              aria-label={`${s.label} egg, ${sp.commonName}`}
              onClick={() => setChosen(s.key)}
              className="absolute flex flex-col items-center rounded-[40%] transition-[transform,opacity] duration-200 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-forest-500"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                zIndex: lifted ? 10 : p.z + 1,
                opacity: dim ? 0.55 : 1,
                transform: `translate(-50%, calc(-50% + ${lifted ? "-16px" : "0px"})) rotate(${p.r}deg) scale(${p.s * (lifted ? 1.1 : 1)})`,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span style={{ filter: lifted ? "drop-shadow(0 14px 8px rgba(92,74,58,0.32))" : "drop-shadow(0 8px 5px rgba(92,74,58,0.25))" }}>
                <FlatTurkey stage={1} size={150} palette={sp.palette} eggPattern={sp.eggPattern} />
              </span>
              <span className="pointer-events-none absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink">
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        {skill && species ? (
          <>
            <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-forest-fg">
              {skill.label} <span className="font-body text-base font-semibold text-ink-soft">· {species.commonName}</span>
            </h2>
            <p className="font-body text-[15px] font-semibold text-ink">{skill.blurb}</p>
            <p className="font-body text-sm leading-snug text-ink-soft">{species.eggDesc}</p>
            {mod && (
              <p className="font-mono text-xs text-ink-muted">
                First lesson: {mod.title} · {mod.estimatedMinutes} min
              </p>
            )}
            {error && <p role="alert" className="font-body text-sm text-primary">{error}</p>}
            <Button className="mt-2 w-full" size="lg" onClick={choose} loading={saving}>
              Choose this egg
            </Button>
          </>
        ) : (
          <>
            <p className="font-body text-sm text-ink-soft">
              Every turkey grows alongside one skill. Tap an egg to meet it.
            </p>
            {error && <p role="alert" className="font-body text-sm text-primary">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}

/** An egg in its species colours, with a fallback drawing for a skill that has no species. */
function EggArt({ egg, size }: { egg: TurkeyView; size: number }) {
  const speciesId = getTurkeySkill(egg.skill).species;
  if (!speciesId) return <TurkeyCharacter stage={1} mood="happy" skill={egg.skill} size={size} label="Your egg" />;
  const sp = getSpecies(speciesId);
  return <FlatTurkey stage={1} size={size} palette={sp.palette} eggPattern={sp.eggPattern} />;
}

export default function HatchPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { turkeys, current, egg: firstEgg, firstEggReady, select, reload, loading, error } = useFlock();

  const [taps, setTaps] = useState(0);
  const [name, setName] = useState("Gobbles");
  const [naming, setNaming] = useState(false);
  const [nameError, setNameError] = useState("");

  const hasTurkeys = turkeys.length > 0;
  const unhatched = turkeys.find((t) => !t.hatched) ?? null;
  // The first egg hatches by passing a quiz, so it can only be tapped open here once that is done.
  // Eggs bought later (there is already a hatched turkey) are always tapped open here.
  const tappable = unhatched !== null && (current !== null || firstEggReady);
  const goHome = !loading && !error && hasTurkeys && !tappable;

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    if (goHome) router.replace("/home");
  }, [goHome, router]);

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

  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <p className="font-body text-ink-soft">We could not load your flock: {error}</p>
        <Button onClick={() => void reload()}>Try again</Button>
      </div>
    );
  }

  if (loading || status === "loading" || goHome) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center font-body text-ink-soft">
        Warming the nest...
      </div>
    );
  }

  // (a) No turkey yet: pick the first egg. It goes Home as an egg and hatches on the first passed quiz.
  if (!hasTurkeys) {
    return (
      <NestPicker
        username={session?.user?.name ?? null}
        onPicked={async () => {
          await reload();
          router.replace("/home");
        }}
      />
    );
  }

  // (b) Tap the egg open, then (c) name the turkey.
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
          <button
            type="button"
            onClick={() => setTaps((n) => Math.min(TAPS_TO_HATCH, n + 1))}
            aria-label={`Tap the egg. ${TAPS_TO_HATCH - taps} taps to go.`}
            className="relative mt-6 rounded-[40%] transition-transform active:scale-95 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-primary"
            style={{ width: size, height: size }}
          >
            <span key={taps} className={taps > 0 ? "block animate-wiggle" : "block"}>
              <EggArt egg={egg} size={size} />
            </span>
            <CrackOverlay taps={taps} size={size} />
          </button>
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
            <EggArt egg={egg} size={size} />
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
