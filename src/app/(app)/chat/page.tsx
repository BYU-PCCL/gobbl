"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { FlatTurkey } from "@/components/gamification/FlatTurkey";
import { TOPICS, getDailyTopic, formatTopicForDebate, type Topic } from "@/lib/topics";
import { DIFFICULTIES } from "@/lib/gamification";
import { describeFlip, flipBelief } from "@/lib/prompts/flipBelief";
import { parseBeliefKey, type BeliefKey } from "@/lib/prompts/beliefs";

// Map difficulty key → stage avatar + tone for the picker.
const DIFFICULTY_META: Record<string, { stage: number; tone: "forest" | "primary" | "rust"; xp: number }> = {
  "Friendly Cluck": { stage: 3, tone: "forest",  xp: 60  },
  "Spirited Strut": { stage: 5, tone: "primary", xp: 120 },
  "Full Gobble":    { stage: 7, tone: "rust",    xp: 200 },
};

const TONE_BG: Record<string, string> = {
  forest:  "bg-forest-100",
  primary: "bg-primary-soft",
  rust:    "bg-plume-100",
};
const TONE_FG: Record<string, string> = {
  forest:  "text-forest-600",
  primary: "text-primary",
  rust:    "text-plume-500",
};
const TONE_BORDER: Record<string, string> = {
  forest:  "border-forest-500",
  primary: "border-primary",
  rust:    "border-plume-500",
};

function SetupContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDaily = searchParams.get("daily") === "true";
  const topicId = searchParams.get("topic");

  const initialDifficulty = searchParams.get("difficulty") ?? "Spirited Strut";
  const [selectedDifficulty, setSelectedDifficulty] = useState(initialDifficulty);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(
    isDaily ? null : (topicId ?? null),
  );
  const [userBelief, setUserBelief] = useState<BeliefKey | null>(null);
  const [partner, setPartner] = useState<{ id: string; initials: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);

  const topic: Topic | null = (() => {
    if (isDaily) return getDailyTopic();
    if (!selectedTopicId) return null;
    return TOPICS.find((t) => t.id === selectedTopicId) ?? null;
  })();

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/"); return; }
    if (status === "authenticated") {
      fetch("/api/user").then((r) => r.json()).then((data) => {
        setUserBelief(parseBeliefKey(data.beliefKey));
      });
    }
  }, [status, router]);

  // Preview the partner for the chosen difficulty so the setup screen shows the same
  // initials the debate screen will; re-picked whenever the difficulty changes.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    setPartner(null);
    fetch(`/api/personas/preview?tier=${encodeURIComponent(selectedDifficulty)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data) setPartner(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [status, selectedDifficulty]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <FlatTurkey stage={1} size="md" animate />
      </div>
    );
  }

  const startDebate = async () => {
    if (!topic) return;
    setLoading(true);
    try {
      const res = await fetch("/api/debates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: formatTopicForDebate(topic),
          category: topic.category,
          difficulty: selectedDifficulty,
          personaId: partner?.id,
          beliefKey: flipBelief(userBelief),  // ← auto-flipped from onboarding
          isDaily,
        }),
      });
      if (!res.ok) throw new Error("Failed to start");
      const data = await res.json();
      router.push(`/chat/${data.id}`);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-8">
      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
        {isDaily ? "Daily Gobble" : "New debate"}
      </div>

      <div>
        <h1 className="font-display text-[38px] font-bold leading-none tracking-[-0.035em]">
          Set up your debate.
        </h1>
        <p className="mt-2 font-body text-sm text-ink-soft">
          Pick a topic and how hard you want {partner?.initials ?? "your partner"} to push back.
        </p>
      </div>

      {/* 01 Topic */}
      <section>
        <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
          01 — Topic
        </div>

        {isDaily && topic ? (
          <div className="relative rounded-2xl border-2 border-primary bg-surface p-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-primary">
              {topic.category} · Daily
            </div>
            <div className="mt-1.5 font-display text-[20px] font-bold tracking-[-0.02em]">
              {topic.title}
            </div>
            <div className="mt-1 font-body text-xs text-ink-soft">
              +50 feathers · daily bonus
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setTopicDropdownOpen((open) => !open)}
              aria-expanded={topicDropdownOpen}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 bg-surface p-4 text-left transition-colors ${
                topic ? "border-primary" : "border-line hover:border-ink-muted"
              }`}
            >
              <div className="min-w-0 flex-1">
                {topic ? (
                  <>
                    <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-primary">
                      {topic.category}
                    </div>
                    <div className="mt-1.5 truncate font-display text-[18px] font-bold tracking-[-0.02em]">
                      {topic.title}
                    </div>
                    <div className="mt-1 line-clamp-2 font-body text-xs text-ink-soft">
                      {topic.description}
                    </div>
                  </>
                ) : (
                  <span className="font-body text-sm text-ink-muted">Choose a topic…</span>
                )}
              </div>
              <svg
                className={`shrink-0 transition-transform ${topicDropdownOpen ? "rotate-180" : ""}`}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {topicDropdownOpen && (
              <div className="mt-2 max-h-72 overflow-y-auto rounded-2xl border border-line bg-surface">
                {TOPICS.map((t, i) => {
                  const selected = selectedTopicId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTopicId(t.id);
                        setTopicDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors ${
                        i < TOPICS.length - 1 ? "border-b border-line" : ""
                      } ${selected ? "bg-primary-soft" : "hover:bg-bg"}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-body text-[13px] font-medium text-ink">
                          {t.title}
                        </div>
                        <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-muted">
                          {t.category}
                        </div>
                      </div>
                      {selected && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M5 13l4 4 10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      {/* Robert auto-flip note */}
      <div className="flex items-center gap-3 rounded-2xl border border-forest-300/40 bg-forest-100 px-3.5 py-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-500 text-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M21 7L12 17l-4-4M3 12l4 4M14 7l3 3"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-body text-xs font-bold text-forest-700">
            {partner?.initials ?? "Your partner"} opposes you today.
          </div>
          <div className="mt-0.5 font-body text-[11px] text-ink-soft">
            {describeFlip(userBelief)}
          </div>
        </div>
      </div>

      {/* 02 Difficulty */}
      <section>
        <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
          02 — Difficulty
        </div>
        <div className="flex flex-col gap-2.5">
          {DIFFICULTIES.map((d) => {
            const meta = DIFFICULTY_META[d.key];
            const selected = selectedDifficulty === d.key;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => setSelectedDifficulty(d.key)}
                className={`relative flex items-center gap-3.5 rounded-2xl border-2 bg-surface p-3.5 text-left transition-colors ${
                  selected ? TONE_BORDER[meta.tone] : "border-line hover:border-ink-muted"
                }`}
              >
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${TONE_BG[meta.tone]}`}>
                  <FlatTurkey stage={meta.stage} size={50} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`font-display text-base font-bold tracking-[-0.02em] ${TONE_FG[meta.tone]}`}>
                    {d.label}
                  </div>
                  <div className="mt-0.5 font-body text-xs text-ink-soft">{d.description}</div>
                </div>
                <div className={`whitespace-nowrap font-mono text-[11px] font-semibold ${TONE_FG[meta.tone]}`}>
                  +{meta.xp} XP
                </div>
                {selected && (
                  <div
                    className={`absolute -top-2 right-3.5 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-white`}
                    style={{ background: `var(--tw-color, currentColor)` }}
                  >
                    <span className={TONE_FG[meta.tone]}>Selected</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <Button
        size="lg"
        className="w-full shadow-lift"
        onClick={startDebate}
        disabled={!topic || loading}
        loading={loading}
      >
        {topic ? "Start the debate" : "Pick a topic to continue"}
      </Button>
    </div>
  );
}

export default function ChatSetupPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <FlatTurkey stage={1} size="md" animate />
      </div>
    }>
      <SetupContent />
    </Suspense>
  );
}
