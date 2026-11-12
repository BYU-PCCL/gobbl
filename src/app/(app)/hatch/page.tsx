"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";
import { EggHatch } from "@/components/companion/EggHatch";
import { useFlock } from "@/components/turkey/useFlock";
import { fetchJson } from "@/lib/fetchJson";
import { getSpecies, professorIntro, PROFESSOR_NAME } from "@/lib/companion";
import { EGG_SKILLS, getTurkeySkill, type TurkeySkillKey } from "@/lib/flock/skills";
import { getModule } from "@/lib/modules/registry";
import type { TurkeyView } from "@/lib/flock/view";

const TAPS_TO_HATCH = 5;
const NAME_MAX = 20;
/** Lets the last rock play before the shell breaks apart. */
const FINAL_TAP_DELAY_MS = 500;

const TWIG = "repeating-linear-gradient(100deg, rgb(var(--coop-plank)) 0 5px, rgb(var(--coop-shade)) 5px 8px, rgb(var(--coop-plank)) 8px 14px)";
const TWIG_FRONT = "repeating-linear-gradient(80deg, rgb(var(--coop-plank)) 0 6px, rgb(var(--coop-shade)) 6px 9px, rgb(var(--coop-plank)) 9px 15px)";

/**
 * Where each egg sits in the nest: back row of 3, front row of 2 (percent of the scene).
 * Rows are far enough apart that a label under a back egg clears the front row.
 */
const NEST_POS = [
  { x: 21, y: 36, r: -9, z: 1, s: 0.84 },
  { x: 50, y: 33, r: 3, z: 1, s: 0.84 },
  { x: 79, y: 36, r: 9, z: 1, s: 0.84 },
  { x: 34, y: 72, r: -5, z: 2, s: 1 },
  { x: 66, y: 71, r: 6, z: 2, s: 1 },
];

// The drawn egg is about 46% x 58% of its 150px square: 69 x 87px. The hit area is that plus padding.
const EGG_BOX = { w: 76, h: 96 };

/** The first egg: five eggs in a nest, one per skill, introduced by the professor. */
function NestPicker({ username, onPicked }: { username: string | null; onPicked: () => Promise<void> }) {
  const [chosen, setChosen] = useState<TurkeySkillKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  const skill = chosen ? getTurkeySkill(chosen) : null;
  const species = skill ? getSpecies(skill.species) : null;
  const mod = skill?.moduleKey ? getModule(skill.moduleKey) : null;

  // The details and the CTA sit below the nest, behind the hotbar on a phone: bring them up.
  useEffect(() => {
    if (!chosen) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    detailsRef.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [chosen]);

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
    } catch {
      setError("We could not save your egg. Try again.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 pb-4">
      <h1 className="font-display text-display-md text-ink lg:text-display-lg">Pick your first egg</h1>

      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft">
          <TurkeyCharacter stage={7} size={30} crop="head" decorative />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{PROFESSOR_NAME}</div>
          <p aria-live="polite" className="rounded-2xl border border-line bg-surface px-4 py-3 font-body text-[15px] leading-snug text-ink">
            {species ? species.professorLine : professorIntro(username)}
          </p>
        </div>
      </div>

      <div className="relative isolate min-h-[340px] overflow-hidden rounded-[28px] border border-line bg-surface-2 sm:min-h-[420px]">
        <div aria-hidden className="absolute -right-8 -top-10 -z-10 h-36 w-36 rounded-full bg-ochre-soft" />
        <div
          aria-hidden
          className="absolute bottom-2.5 left-[3%] h-[62%] w-[94%] rounded-[50%] bg-ochre-soft"
          style={{ boxShadow: "inset 0 -6px 0 rgb(var(--ochre) / 0.35)" }}
        >
          <div
            className="absolute bottom-[12%] left-1/2 h-[74%] w-[84%] -translate-x-1/2 rounded-[50%] border-[3px] border-coop-shade"
            style={{ backgroundImage: TWIG }}
          />
          <div
            className="absolute bottom-[6%] left-1/2 h-[36%] w-[84%] -translate-x-1/2 border-[3px] border-t-0 border-coop-shade"
            style={{ backgroundImage: TWIG_FRONT, borderRadius: "0 0 50% 50% / 0 0 100% 100%" }}
          />
        </div>
        {EGG_SKILLS.map((s, i) => {
          const sp = getSpecies(s.species);
          const p = NEST_POS[i % NEST_POS.length];
          const lifted = chosen === s.key;
          const dim = chosen !== null && !lifted;
          return (
            <div
              key={s.key}
              className="absolute"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: EGG_BOX.w,
                height: EGG_BOX.h,
                transform: "translate(-50%, -50%)",
                zIndex: lifted ? 10 : p.z,
              }}
            >
              <button
                type="button"
                aria-pressed={lifted}
                aria-label={`${s.label} egg, ${sp.commonName}`}
                onClick={() => setChosen(s.key)}
                className="absolute inset-0 rounded-[40%] transition-[transform,opacity] duration-200 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-forest-500"
                style={{
                  opacity: dim ? 0.55 : 1,
                  transform: `translateY(${lifted ? "-12px" : "0px"}) rotate(${p.r}deg) scale(${p.s * (lifted ? 1.1 : 1)})`,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ filter: lifted ? "drop-shadow(0 14px 8px rgb(var(--ink-soft) / 0.32))" : "drop-shadow(0 8px 5px rgb(var(--ink-soft) / 0.25))" }}
                >
                  <TurkeyCharacter stage={1} size={150} palette={sp.palette} eggPattern={sp.eggPattern} animate={false} showShadow={false} decorative />
                </span>
              </button>
              {/* Upright, directly under its own egg, above every egg */}
              <span className="pointer-events-none absolute left-1/2 top-full z-20 -mt-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-[0.06em] text-ink">
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <div ref={detailsRef} className="flex scroll-mb-28 flex-col gap-2">
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
            {error && <p role="alert" className="font-body text-sm text-danger">{error}</p>}
            <Button className="mt-2 w-full" size="lg" onClick={choose} loading={saving}>
              Choose this egg
            </Button>
          </>
        ) : (
          <>
            <p className="font-body text-sm text-ink-soft">
              Every turkey grows alongside one skill. Tap an egg to meet it.
            </p>
            {error && <p role="alert" className="font-body text-sm text-danger">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}

function HatchFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const wantedId = params.get("turkeyId");
  const { data: session, status } = useSession();
  const { turkeys, current, firstEggReady, select, reload, loading, error } = useFlock();

  const [taps, setTaps] = useState(0);
  const [hatched, setHatched] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [name, setName] = useState("Gobbles");
  const [naming, setNaming] = useState(false);
  const [nameError, setNameError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const breakTimer = useRef<number | null>(null);

  const hasTurkeys = turkeys.length > 0;
  const unhatched =
    (wantedId ? turkeys.find((t) => !t.hatched && t.id === wantedId) : null) ?? turkeys.find((t) => !t.hatched) ?? null;
  // The first egg hatches by passing a quiz, so it can only be tapped open here once that is done.
  // Eggs bought later (there is already a hatched turkey) are always tapped open here.
  const tappable = unhatched !== null && (current !== null || firstEggReady);
  const leave = !loading && !error && hasTurkeys && !tappable;

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    if (leave) router.replace("/flock");
  }, [leave, router]);

  useEffect(() => () => {
    if (breakTimer.current) window.clearTimeout(breakTimer.current);
  }, []);

  // Focus the name only after the chick has been revealed, so the keyboard never covers the reveal.
  useEffect(() => {
    if (revealed) inputRef.current?.select();
  }, [revealed]);

  function tap() {
    if (taps >= TAPS_TO_HATCH) return;
    const n = taps + 1;
    setTaps(n);
    if (n >= TAPS_TO_HATCH) {
      breakTimer.current = window.setTimeout(() => setHatched(true), FINAL_TAP_DELAY_MS);
    }
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
    } catch {
      setNameError("We could not hatch your turkey. Check your connection and try again.");
      setNaming(false);
    }
  }

  if (status === "unauthenticated") return null;

  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <p role="alert" className="font-body text-danger">We could not load your flock.</p>
        <Button onClick={() => void reload()}>Try again</Button>
      </div>
    );
  }

  if (loading || status === "loading" || leave) {
    return <LoadingState message="Warming the eggs..." />;
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
  const size = 240;
  const speciesId = getTurkeySkill(egg.skill).species;
  const look = speciesId ? { palette: getSpecies(speciesId).palette, eggPattern: getSpecies(speciesId).eggPattern } : { skill: egg.skill };
  const remaining = TAPS_TO_HATCH - taps;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center py-6 text-center">
      <h1 className="font-display text-display-md text-ink lg:text-display-lg">
        {revealed ? "It hatched!" : taps >= TAPS_TO_HATCH ? "It is hatching!" : "Your egg is stirring"}
      </h1>
      <p className="mt-2 font-body text-ink-soft" aria-live="polite">
        {revealed
          ? "What will you call your new turkey?"
          : taps >= TAPS_TO_HATCH
            ? "Here it comes."
            : `Tap the egg to help it hatch. ${taps === 0 ? "Gently now." : `${remaining} more.`}`}
      </p>

      <div className="relative mt-6" style={{ width: size, height: size }}>
        <EggHatch
          {...look}
          progress={taps}
          total={TAPS_TO_HATCH}
          hatched={hatched}
          size={size}
          onHatched={() => setRevealed(true)}
        />
        {taps < TAPS_TO_HATCH && (
          <button
            type="button"
            onClick={tap}
            aria-label={`Tap the egg. ${remaining} ${remaining === 1 ? "tap" : "taps"} to go.`}
            className="absolute left-1/2 top-1/2 h-[75%] w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-[45%] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-primary"
            style={{ WebkitTapHighlightColor: "transparent" }}
          />
        )}
      </div>

      {!revealed ? (
        <>
          <div className="mt-4 flex gap-2" aria-hidden>
            {Array.from({ length: TAPS_TO_HATCH }).map((_, i) => (
              <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < taps ? "bg-primary" : "bg-line"}`} />
            ))}
          </div>
          {taps < TAPS_TO_HATCH && (
            <ButtonLink href="/flock" variant="secondary" className="mt-6">
              Back to your flock
            </ButtonLink>
          )}
        </>
      ) : (
        <form onSubmit={hatch} className="mt-6 w-full space-y-4 text-left">
          <Input
            ref={inputRef}
            label="Name"
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            error={nameError}
            hint={`${NAME_MAX} characters at most`}
          />
          <Button type="submit" size="lg" className="w-full" loading={naming}>
            Hatch {name.trim() || "my turkey"}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function HatchPage() {
  return (
    <Suspense fallback={<LoadingState message="Warming the eggs..." />}>
      <HatchFlow />
    </Suspense>
  );
}
