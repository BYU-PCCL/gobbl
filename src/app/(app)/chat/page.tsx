"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchJson } from "@/lib/fetchJson";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { FlatTurkey } from "@/components/gamification/FlatTurkey";
import { Companion } from "@/components/companion/Companion";
import { TopicPicker } from "@/components/conversation/TopicPicker";
import { StancePicker } from "@/components/conversation/StancePicker";
import { TOPICS, MODULE_TOPIC, getTopic, getDailyTopic, formatTopicForDebate, type Topic } from "@/lib/topics";
import { DIFFICULTIES } from "@/lib/gamification";
import { companionLine, playgroundPickedLine, isHatched, PARTNER_PALETTE, partnerStage, type SpeciesId } from "@/lib/companion";
import { getMove } from "@/lib/moves";
import type { Stance } from "@/lib/conversation";
import type { EquippedCosmetics } from "@/lib/shop";

interface UserData {
  level?: number;
  equippedCosmetics?: EquippedCosmetics | null;
  companion?: {
    speciesId: SpeciesId | null;
    hatched: boolean;
    stage: number;
    learnedMoves: string[];
    lastTopicId: string | null;
  } | null;
}

interface ModuleSummary {
  key: string;
  title: string;
  progress: { stage: number; inProgress: boolean } | null;
  timesCompleted: number;
}

function PlaygroundContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDaily = searchParams.get("daily") === "true";
  const topicParam = searchParams.get("topic");

  const [difficulty, setDifficulty] = useState(searchParams.get("difficulty") ?? "Spirited Strut");
  const [topicId, setTopicId] = useState<string | null>(isDaily ? null : (getTopic(topicParam)?.id ?? null));
  const [stance, setStance] = useState<Stance | null>(null);
  const [step, setStep] = useState<1 | 2>(isDaily ? 2 : 1);
  const [user, setUser] = useState<UserData | null>(null);
  const [modules, setModules] = useState<ModuleSummary[] | null>(null);
  const [partner, setPartner] = useState<{ id: string; initials: string } | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [allowProfanity, setAllowProfanity] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const isFullGobble = difficulty === "Full Gobble";
  const topic: Topic | null = isDaily ? getDailyTopic() : (getTopic(topicId) ?? null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/"); return; }
    if (status === "authenticated") {
      // Non-critical: without these the Playground still works with defaults.
      fetchJson<UserData>("/api/user").then(setUser).catch(() => {});
      fetchJson<ModuleSummary[]>("/api/modules").then(setModules).catch(() => {});
    }
  }, [status, router]);

  // Preview the partner for the chosen difficulty so this screen shows the same
  // initials the conversation will; re-picked whenever the difficulty changes.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    setPartner(null);
    fetch(`/api/personas/preview?tier=${encodeURIComponent(difficulty)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data) setPartner(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [status, difficulty]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <FlatTurkey stage={1} size="md" animate />
      </div>
    );
  }

  const companion = user?.companion ?? null;
  const hatched = companion?.hatched ?? isHatched({ companionHatchedAt: null, level: user?.level ?? 1 });
  const learned = companion?.learnedMoves ?? [];
  const moveName = (learned.length ? getMove(learned[learned.length - 1])?.name : undefined) ?? "ASK";

  // Current module: the one in progress, else the first never completed.
  const currentModule = modules?.find((m) => m.progress?.inProgress) ?? modules?.find((m) => m.timesCompleted === 0);
  const moduleTopicId = currentModule ? MODULE_TOPIC[currentModule.key] : undefined;
  const suggestedTopicId = companion?.lastTopicId && getTopic(companion.lastTopicId) ? companion.lastTopicId : (moduleTopicId ?? null);
  const suggestedLabel = companion?.lastTopicId && getTopic(companion.lastTopicId) ? "you" : currentModule?.title;

  const pickTopic = (id: string) => {
    setTopicId(id);
    setStance(null);
    const t = getTopic(id);
    if (t) setLine(playgroundPickedLine(t.title, moveName));
  };

  const startConversation = async () => {
    if (!topic || !stance) return;
    setLoading(true);
    setStartError(null);

    // Split into two failure modes: whether the request reached the server at all
    // changes what's worth telling the user.
    let res: Response;
    try {
      res = await fetch("/api/debates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: formatTopicForDebate(topic),
          category: topic.category,
          difficulty,
          personaId: partner?.id,
          isDaily,
          // The toggle's state survives switching tiers, so only send it for Full Gobble.
          allowProfanity: isFullGobble && allowProfanity,
          userStance: stance,
          topicId: topic.id,
        }),
      });
    } catch {
      setStartError("Couldn't reach the server. Check your connection and try again.");
      setLoading(false);
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStartError(data.error || "Something went wrong on our end. Please try again.");
      setLoading(false);
      return;
    }

    const data = await res.json();
    router.push(`/chat/${data.id}`);
  };

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
            <p className="eyebrow mb-2">How hard should {partner?.initials ?? "your partner"} push back?</p>
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

          <div className="flex items-center gap-3 rounded-xl bg-bg px-3 py-2.5">
            <FlatTurkey stage={partnerStage(difficulty)} size={44} palette={PARTNER_PALETTE} />
            <div className="min-w-0">
              <p className="font-body text-sm font-semibold text-ink">{partner?.initials ?? "Your partner"}</p>
              <p className="font-body text-xs text-ink-soft">Takes the other side of whatever you choose.</p>
            </div>
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
                  {partner?.initials ?? "Your partner"} may curse when things get heated. No slurs, ever.
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
        <p className="font-body text-sm font-semibold text-primary">{isDaily ? "Daily Gobble" : "Playground"}</p>
        <h1 className="mt-1 font-display text-[34px] font-bold leading-none tracking-[-0.035em] lg:text-[48px]">
          {step === 1 ? "Pick a topic." : "Where do you land?"}
        </h1>
      </div>

      {user && (
        <Companion
          variant="row"
          speciesId={companion?.speciesId ?? null}
          level={user.level ?? 1}
          hatched={hatched}
          equipped={user.equippedCosmetics ?? null}
          line={line ?? companionLine("playground", hatched)}
        />
      )}

      {step === 1 && !isDaily && (
        <>
          {topic && (
            <div className="sticky top-0 z-10 -mx-1 flex items-center gap-3 rounded-2xl border border-primary bg-surface px-4 py-2.5 shadow-soft">
              <div className="min-w-0 flex-1">
                <p className="eyebrow">Chosen</p>
                <p className="truncate font-display text-sm font-bold">{topic.title}</p>
              </div>
              <Button size="sm" onClick={() => setStep(2)}>
                Next
              </Button>
            </div>
          )}
          <TopicPicker
            topics={TOPICS}
            suggestedTopicId={suggestedTopicId}
            suggestedLabel={suggestedLabel}
            value={topicId}
            onChange={pickTopic}
          />
          {optionsBlock}
        </>
      )}

      {step === 2 && topic && (
        <>
          <div className="rounded-2xl border-2 border-primary bg-surface p-4">
            <p className="eyebrow text-primary">{topic.category}{isDaily ? " · Daily" : ""}</p>
            <p className="mt-1 font-display text-lg font-bold tracking-[-0.02em]">{topic.title}</p>
            {isDaily && <p className="mt-1 font-body text-xs text-ink-soft">+50 feathers, daily bonus</p>}
          </div>

          <StancePicker question={topic.description} value={stance} onChange={setStance} />

          {optionsBlock}

          {startError && <p role="alert" className="text-center font-body text-sm text-plume-500">{startError}</p>}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button size="lg" className="w-full shadow-lift sm:flex-1" onClick={startConversation} disabled={!topic || !stance || loading} loading={loading}>
              Head to the Playground
            </Button>
            {!isDaily && (
              <Button size="lg" variant="ghost" className="w-full sm:w-auto" onClick={() => setStep(1)} disabled={loading}>
                Back to topics
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <FlatTurkey stage={1} size="md" animate />
      </div>
    }>
      <PlaygroundContent />
    </Suspense>
  );
}
