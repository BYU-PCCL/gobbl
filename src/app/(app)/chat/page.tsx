"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";
import { useFlock } from "@/components/turkey/useFlock";
import { PARK_TURKEYS, type ParkTurkey } from "@/lib/flock/parkTurkeys";

/** Grown-up turkeys stand around the park. */
const PARK_TURKEY_STAGE = 5;

export default function ParkPageRoute() {
  return (
    <Suspense fallback={<ParkMessage text="Heading to the park..." />}>
      <ParkPage />
    </Suspense>
  );
}

function ParkPage() {
  const router = useRouter();
  const { status } = useSession();
  const turkeyIdParam = useSearchParams().get("turkeyId");
  const { turkeys, current, loading, error, reload } = useFlock();
  const [walkingTo, setWalkingTo] = useState<string | null>(null);
  const [visitError, setVisitError] = useState<string | null>(null);

  // The turkey you're here with: the one in the link, else the one selected on Home.
  const mine =
    (turkeyIdParam ? turkeys.find((t) => t.id === turkeyIdParam && t.hatched) : null) ?? current;

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    if (!loading && !error && !mine) router.replace("/hatch");
  }, [loading, error, mine, router]);

  async function visit(t: ParkTurkey) {
    if (!mine || walkingTo) return;
    setWalkingTo(t.personaId);
    setVisitError(null);
    try {
      const res = await fetch("/api/park/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: t.personaId, turkeyId: mine.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `${t.name} couldn't chat right now.`);
      router.push(`/chat/${data.id}?turkeyId=${encodeURIComponent(mine.id)}`);
    } catch (e) {
      setVisitError(e instanceof Error ? e.message : "Something went wrong.");
      setWalkingTo(null);
    }
  }

  if (status === "unauthenticated") return null;
  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <p className="font-body text-ink-soft">We could not load your flock: {error}</p>
        <Button onClick={() => void reload()}>Try again</Button>
      </div>
    );
  }
  if (loading || !mine) return <ParkMessage text="Heading to the park..." />;

  const myName = mine.name ?? "Your turkey";
  const walkingName = PARK_TURKEYS.find((t) => t.personaId === walkingTo)?.name;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="font-display text-display-lg text-ink">Park</h1>
        <p className="font-body text-sm text-ink-soft">
          Who will {myName} talk to today?
        </p>
      </div>

      <div
        className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border border-line sm:aspect-[5/4]"
        style={{ background: "linear-gradient(180deg, #EDF4EE 0%, #D5DFD4 55%, #A8C0A6 100%)" }}
      >
        <ParkScenery />
        {PARK_TURKEYS.map((t) => {
          const busy = walkingTo === t.personaId;
          return (
            <button
              key={t.personaId}
              type="button"
              onClick={() => void visit(t)}
              disabled={walkingTo !== null}
              aria-label={`Talk to ${t.name}`}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-2xl p-1 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-wait"
              style={{ left: `${t.x}%`, top: `${t.y}%` }}
            >
              <TurkeyCharacter
                stage={PARK_TURKEY_STAGE}
                mood="happy"
                skill={t.look}
                reaction={busy ? "cheer" : "none"}
                size={92}
                label={t.name}
              />
              <span className="-mt-1 rounded-full bg-surface px-2.5 py-0.5 font-body text-xs font-semibold text-ink shadow-soft">
                {t.name}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-center font-body text-sm text-ink-soft" aria-live="polite">
        {visitError ??
          (walkingName
            ? `${myName} is walking over to ${walkingName}...`
            : "Tap a turkey to say hi. They'll bring up something they've been thinking about.")}
      </p>
    </div>
  );
}

function ParkMessage({ text }: { text: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center font-body text-ink-soft">{text}</div>
  );
}

/** A path, a pond and a few trees, drawn behind the turkeys. Decorative. */
function ParkScenery() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <path d="M-5 96 C 25 70, 60 78, 105 48" stroke="#F4ECDD" strokeWidth="9" fill="none" opacity="0.9" />
      <ellipse cx="86" cy="94" rx="16" ry="7" fill="#A8C0A6" />
      <ellipse cx="86" cy="94" rx="13" ry="5" fill="#EDF4EE" opacity="0.7" />
      {[
        [8, 12],
        [50, 8],
        [94, 14],
        [6, 50],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x - 0.8} y={y + 3} width="1.6" height="6" fill="#704F14" />
          <circle cx={x} cy={y + 2} r="5" fill="#477649" />
          <circle cx={x - 2} cy={y} r="3" fill="#759B73" />
        </g>
      ))}
    </svg>
  );
}
