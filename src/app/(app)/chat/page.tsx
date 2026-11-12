"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageShell } from "@/components/layout/PageShell";
import { MyTurkey } from "@/components/turkey/MyTurkey";
import { PartnerTurkey } from "@/components/turkey/PartnerTurkey";
import { useFlock } from "@/components/turkey/useFlock";
import { TopicPicker } from "@/components/conversation/TopicPicker";
import { StancePicker } from "@/components/conversation/StancePicker";
import { fetchJson, TimeoutError } from "@/lib/fetchJson";
import { parkLineup } from "@/lib/flock/parkTurkeys";
import { activityCta, activityHref, lockedReason } from "@/lib/flock/home";
import { getPersonaById, type Persona, type Tier } from "@/lib/personas/pool";
import { DIFFICULTIES } from "@/lib/gamification";
import { TOPICS, getTopic } from "@/lib/topics";
import type { Stance } from "@/lib/conversation";

const START_TIMEOUT_MS = 45_000;

/**
 * Where partners stand in the scene, as % of its width and height. Zigzag columns, so at
 * ~350px wide no two turkey buttons (about 88 x 108px each) overlap and each keeps its own tap area.
 */
const SCENE_SPOTS: { x: number; y: number }[] = [
  { x: 26, y: 13 },
  { x: 74, y: 26 },
  { x: 28, y: 42 },
  { x: 72, y: 58 },
  { x: 50, y: 84 },
];

export default function ParkPageRoute() {
  return (
    <Suspense fallback={<LoadingState message="Heading to the park..." />}>
      <ParkPage />
    </Suspense>
  );
}

function ParkPage() {
  const router = useRouter();
  const { status } = useSession();
  const searchParams = useSearchParams();
  const turkeyIdParam = searchParams.get("turkeyId");
  const { turkeys, current, egg, loading, error, reload } = useFlock();

  // Who the user walked up to lives in the URL, so the "Back to the Park" link and the
  // browser's back button both return to the park. null: still looking around.
  const partner: Persona | null = getPersonaById(searchParams.get("partner"));
  const [step, setStep] = useState<"topic" | "stance">("topic");
  const [topicId, setTopicId] = useState<string | null>(null);
  const [stance, setStance] = useState<Stance | null>(null);
  const [lobbyDifficulty, setDifficulty] = useState<Tier>("Friendly Cluck");
  const [allowProfanity, setAllowProfanity] = useState(false);
  const [lastTopicId, setLastTopicId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // The partner's own tier wins, so a reload on a partner link still starts the right conversation.
  const difficulty: Tier = partner?.tier ?? lobbyDifficulty;

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

  // Who stands where is shuffled once per difficulty, not on every render.
  const lineup = useMemo(() => parkLineup(difficulty), [difficulty]);

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
        <p className="font-body text-ink-soft">We could not load your flock.</p>
        <Button onClick={() => void reload()}>Try again</Button>
      </div>
    );
  }
  if (loading || !mine) return <LoadingState message="Heading to the park..." />;

  const myName = mine.name ?? "Your turkey";
  const parkHref = `/chat?turkeyId=${encodeURIComponent(mine.id)}`;

  if (!mine.unlocked.park) {
    const lock = lockedReason("park", mine);
    // lockedReason names the step that opens the Park: School if it is open, else Feed.
    const unlockStep = lock?.step === "school" ? "school" : "feed";
    return (
      <PageShell width="default" eyebrow="Park" title="The Park opens after School">
        <Card className="mx-auto flex w-full max-w-md flex-col items-center gap-3 p-6 text-center">
          <MyTurkey turkey={mine} size={120} />
          <p className="font-body text-sm text-ink-soft">
            {lock?.reason ?? `${myName} has nothing to talk about yet. Feed, then School, then the Park.`}
          </p>
          <div className="flex w-full flex-col gap-2">
            <ButtonLink href={activityHref(unlockStep, mine)}>{activityCta(unlockStep, mine.name)}</ButtonLink>
            <ButtonLink href="/home" variant="ghost">
              Back to {myName}
            </ButtonLink>
          </div>
        </Card>
      </PageShell>
    );
  }
  const topic = getTopic(topicId) ?? null;
  const isFullGobble = difficulty === "Full Gobble";

  function walkUpTo(t: Persona) {
    if (!mine) return;
    setStep("topic");
    setStance(null);
    setStartError(null);
    router.push(`/chat?turkeyId=${encodeURIComponent(mine.id)}&partner=${encodeURIComponent(t.id)}`);
  }

  async function start() {
    if (!mine || !partner || !topic || !stance || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const data = await fetchJson<{ id: string }>("/api/park/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        timeoutMs: START_TIMEOUT_MS,
        body: JSON.stringify({
          personaId: partner.id,
          turkeyId: mine.id,
          topicId: topic.id,
          userStance: stance,
          difficulty,
          // The toggle's state survives switching difficulty, so only send it for Full Gobble.
          allowProfanity: isFullGobble && allowProfanity,
        }),
      });
      router.push(`/chat/${data.id}?turkeyId=${encodeURIComponent(mine.id)}`);
    } catch (e) {
      if (e instanceof TimeoutError) {
        setStartError(`${partner.initials} is taking too long to answer. Try again.`);
      } else if (e instanceof TypeError) {
        setStartError("We could not reach the server. Check your connection and try again.");
      } else if (e instanceof Error && !/^Request failed/.test(e.message)) {
        setStartError(e.message);
      } else {
        setStartError(`${partner.initials} couldn't chat right now. Try again.`);
      }
      setStarting(false);
    }
  }

  // ── Looking around the park ──
  if (!partner) {
    return (
      <PageShell width="default" eyebrow="Park" title={`Who will ${myName} talk to?`}>
        <div className="space-y-4">
          <div>
            <p className="eyebrow mb-2">How hard should they push back?</p>
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

          <div className="relative mx-auto aspect-[4/5] w-full overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-surface-2 to-forest-soft sm:aspect-[5/4]">
            <ParkScenery />
            {lineup.map(({ persona: p }, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => walkUpTo(p)}
                aria-label={`Talk to ${p.initials}`}
                className="absolute flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-2xl p-1 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none"
                style={{ left: `${SCENE_SPOTS[i].x}%`, top: `${SCENE_SPOTS[i].y}%` }}
              >
                <PartnerTurkey personaId={p.id} initials={p.initials} size={80} />
                <span className="-mt-1 rounded-full bg-surface px-2.5 py-0.5 font-body text-xs font-semibold text-ink shadow-soft">
                  {p.initials}
                </span>
              </button>
            ))}
          </div>

          <p className="text-center font-body text-sm text-ink-soft">
            Tap a turkey to say hi. You pick what to talk about.
          </p>
        </div>
      </PageShell>
    );
  }

  // ── Walked up to a turkey: pick the topic, then a side ──
  const profanityToggle = isFullGobble ? (
    <button
      type="button"
      role="switch"
      aria-checked={allowProfanity}
      onClick={() => setAllowProfanity((on) => !on)}
      className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 text-left"
    >
      <div className="min-w-0 flex-1">
        <div className="font-body text-sm font-semibold text-ink">Allow profanity</div>
        <div className="mt-0.5 font-body text-xs text-ink-soft">
          {partner.initials} may curse when things get heated. No slurs, ever.
        </div>
      </div>
      <span aria-hidden="true" className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${allowProfanity ? "bg-primary" : "bg-line"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-transform motion-reduce:transition-none ${allowProfanity ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </span>
    </button>
  ) : null;

  const showStance = step === "stance" && topic;

  return (
    <PageShell
      width="default"
      eyebrow="Park"
      title={showStance ? topic.title : "Pick a topic"}
      subtitle={showStance ? topic.category : undefined}
      back={{ href: parkHref, label: "Back to the Park" }}
    >
      <div className="flex flex-col gap-5 pb-4">
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5">
          <PartnerTurkey personaId={partner.id} initials={partner.initials} size={56} />
          <div className="min-w-0 flex-1">
            <p className="font-body text-sm font-semibold text-ink">
              {myName} walked over to {partner.initials}
            </p>
            <p className="font-body text-xs text-ink-soft">{partner.initials} takes the other side of whatever you choose.</p>
          </div>
        </div>

        {!showStance && (
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
        )}

        {showStance && (
          <>
            <StancePicker question={topic.description} value={stance} onChange={setStance} />

            {profanityToggle}

            {startError && <p role="alert" className="text-center font-body text-sm text-danger">{startError}</p>}
            {starting && (
              <p role="status" className="text-center font-body text-sm text-ink-soft">
                {partner.initials} is thinking of an opener...
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button size="lg" className="w-full shadow-lift sm:flex-1" onClick={start} disabled={!stance || starting} loading={starting}>
                {startError ? "Try again" : `Talk with ${partner.initials}`}
              </Button>
              <Button size="lg" variant="ghost" className="w-full sm:w-auto" onClick={() => setStep("topic")} disabled={starting}>
                Back to topics
              </Button>
            </div>
          </>
        )}
      </div>

      {!showStance && (
        <div className="sticky bottom-0 z-10 -mx-1 mt-4 flex items-center gap-3 border-t border-line bg-bg px-1 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3">
          <div className="min-w-0 flex-1">
            {topic ? (
              <>
                <p className="eyebrow">Chosen</p>
                <p className="truncate font-display text-sm font-bold">{topic.title}</p>
              </>
            ) : (
              <p className="font-body text-sm text-ink-soft">Pick a topic</p>
            )}
          </div>
          <Button size="lg" onClick={() => setStep("stance")} disabled={!topic}>
            Next
          </Button>
        </div>
      )}
    </PageShell>
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
