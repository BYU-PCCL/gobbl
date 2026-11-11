"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";
import { useFlock } from "@/components/turkey/useFlock";
import { TopicPicker } from "@/components/conversation/TopicPicker";
import { StancePicker } from "@/components/conversation/StancePicker";
import { fetchJson } from "@/lib/fetchJson";
import { PARK_TURKEYS, type ParkTurkey } from "@/lib/flock/parkTurkeys";
import { DIFFICULTIES } from "@/lib/gamification";
import { TOPICS, getTopic } from "@/lib/topics";
import type { Stance } from "@/lib/conversation";

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
  const { turkeys, current, egg, loading, error, reload } = useFlock();

  // Who the user walked up to. null: still looking around the park.
  const [partner, setPartner] = useState<ParkTurkey | null>(null);
  const [step, setStep] = useState<"topic" | "stance">("topic");
  const [topicId, setTopicId] = useState<string | null>(null);
  const [stance, setStance] = useState<Stance | null>(null);
  const [difficulty, setDifficulty] = useState<string>("Friendly Cluck");
  const [allowProfanity, setAllowProfanity] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [lastTopicId, setLastTopicId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // The turkey you're here with: the one in the link, else the one selected on Home.
  const mine =
    (turkeyIdParam ? turkeys.find((t) => t.id === turkeyIdParam && t.hatched) : null) ?? current;

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  // The park needs a hatched turkey: pick an egg first, or go hatch the one you have.
  useEffect(() => {
    if (loading || error || mine) return;
    router.replace(egg ? "/home" : "/hatch");
  }, [loading, error, mine, egg, router]);

  // The topic talked about last time is offered first. Optional: the picker works without it.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetchJson<{ lastTopicId: string | null }>("/api/user")
      .then((u) => {
        if (!cancelled) setLastTopicId(u.lastTopicId && getTopic(u.lastTopicId) ? u.lastTopicId : null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status]);

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
  const topic = getTopic(topicId) ?? null;
  const isFullGobble = difficulty === "Full Gobble";

  function walkUpTo(t: ParkTurkey) {
    setPartner(t);
    setStep("topic");
    setStance(null);
    setStartError(null);
  }

  async function start() {
    if (!mine || !partner || !topic || !stance || starting) return;
    setStarting(true);
    setStartError(null);
    let res: Response;
    try {
      res = await fetch("/api/park/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: partner.personaId,
          turkeyId: mine.id,
          topicId: topic.id,
          userStance: stance,
          difficulty,
          // The toggle's state survives switching difficulty, so only send it for Full Gobble.
          allowProfanity: isFullGobble && allowProfanity,
        }),
      });
    } catch {
      setStartError("Couldn't reach the server. Check your connection and try again.");
      setStarting(false);
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStartError(data.error || `${partner.name} couldn't chat right now.`);
      setStarting(false);
      return;
    }
    router.push(`/chat/${data.id}?turkeyId=${encodeURIComponent(mine.id)}`);
  }

  // ── Looking around the park ──
  if (!partner) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div>
          <h1 className="font-display text-display-lg text-ink">Park</h1>
          <p className="font-body text-sm text-ink-soft">Who will {myName} talk to today?</p>
        </div>

        <div
          className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border border-line sm:aspect-[5/4]"
          style={{ background: "linear-gradient(180deg, #EDF4EE 0%, #D5DFD4 55%, #A8C0A6 100%)" }}
        >
          <ParkScenery />
          {PARK_TURKEYS.map((t) => (
            <button
              key={t.personaId}
              type="button"
              onClick={() => walkUpTo(t)}
              aria-label={`Talk to ${t.name}`}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-2xl p-1 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              style={{ left: `${t.x}%`, top: `${t.y}%` }}
            >
              <TurkeyCharacter stage={PARK_TURKEY_STAGE} mood="happy" skill={t.look} size={92} label={t.name} />
              <span className="-mt-1 rounded-full bg-surface px-2.5 py-0.5 font-body text-xs font-semibold text-ink shadow-soft">
                {t.name}
              </span>
            </button>
          ))}
        </div>

        <p className="text-center font-body text-sm text-ink-soft">
          Tap a turkey to say hi. You pick what to talk about.
        </p>
      </div>
    );
  }

  // ── Walked up to a turkey: pick the topic, then a side ──
  const optionsBlock = (
    <div className="rounded-2xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOptionsOpen((o) => !o)}
        aria-expanded={optionsOpen}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="font-body text-sm font-semibold text-ink">Options</span>
        <span className="flex items-center gap-2 font-body text-xs text-ink-soft">
          {difficulty}
          <Icon name="chevron-down" size={16} className={optionsOpen ? "rotate-180" : ""} />
        </span>
      </button>
      {optionsOpen && (
        <div className="space-y-4 border-t border-line px-4 py-4">
          <div>
            <p className="eyebrow mb-2">How hard should {partner.name} push back?</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Difficulty">
              {DIFFICULTIES.map((d) => (
                <Chip key={d.key} selected={difficulty === d.key} onClick={() => setDifficulty(d.key)}>
                  {d.label}
                </Chip>
              ))}
            </div>
            <p className="mt-2 font-body text-xs text-ink-soft">
              {DIFFICULTIES.find((d) => d.key === difficulty)?.description}
            </p>
          </div>

          {isFullGobble && (
            <button
              type="button"
              role="switch"
              aria-checked={allowProfanity}
              onClick={() => setAllowProfanity((on) => !on)}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-bg px-3.5 py-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="font-body text-sm font-semibold text-ink">Allow profanity</div>
                <div className="mt-0.5 font-body text-[11px] text-ink-soft">
                  {partner.name} may curse when things get heated. No slurs, ever.
                </div>
              </div>
              <span aria-hidden="true" className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${allowProfanity ? "bg-plume-500" : "bg-line"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${allowProfanity ? "translate-x-[18px]" : "translate-x-0.5"}`} />
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 pb-8">
      <div>
        <p className="font-body text-sm font-semibold text-primary">Park</p>
        <h1 className="mt-1 font-display text-[34px] font-bold leading-none tracking-[-0.035em] lg:text-[48px]">
          {step === "topic" ? "Pick a topic." : "Where do you land?"}
        </h1>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5">
        <TurkeyCharacter stage={PARK_TURKEY_STAGE} mood="happy" skill={partner.look} size={56} label={partner.name} />
        <div className="min-w-0 flex-1">
          <p className="font-body text-sm font-semibold text-ink">
            {myName} walked over to {partner.name}
          </p>
          <p className="font-body text-xs text-ink-soft">{partner.name} takes the other side of whatever you choose.</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setPartner(null)} disabled={starting}>
          Back to the park
        </Button>
      </div>

      {step === "topic" && (
        <>
          {topic && (
            <div className="sticky top-0 z-10 -mx-1 flex items-center gap-3 rounded-2xl border border-primary bg-surface px-4 py-2.5 shadow-soft">
              <div className="min-w-0 flex-1">
                <p className="eyebrow">Chosen</p>
                <p className="truncate font-display text-sm font-bold">{topic.title}</p>
              </div>
              <Button size="sm" onClick={() => setStep("stance")}>
                Next
              </Button>
            </div>
          )}
          <TopicPicker
            topics={TOPICS}
            suggestedTopicId={lastTopicId}
            suggestedLabel={lastTopicId ? "you" : undefined}
            value={topicId}
            onChange={(id) => {
              setTopicId(id);
              setStance(null);
            }}
          />
          {optionsBlock}
        </>
      )}

      {step === "stance" && topic && (
        <>
          <div className="rounded-2xl border-2 border-primary bg-surface p-4">
            <p className="eyebrow text-primary">{topic.category}</p>
            <p className="mt-1 font-display text-lg font-bold tracking-[-0.02em]">{topic.title}</p>
          </div>

          <StancePicker question={topic.description} value={stance} onChange={setStance} />

          {optionsBlock}

          {startError && <p role="alert" className="text-center font-body text-sm text-plume-500">{startError}</p>}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button size="lg" className="w-full shadow-lift sm:flex-1" onClick={start} disabled={!stance || starting} loading={starting}>
              Talk with {partner.name}
            </Button>
            <Button size="lg" variant="ghost" className="w-full sm:w-auto" onClick={() => setStep("topic")} disabled={starting}>
              Back to topics
            </Button>
          </div>
        </>
      )}
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
