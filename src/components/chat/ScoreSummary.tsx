"use client";

import { useState, useEffect } from "react";
import { DIMENSION_LABELS, DIMENSION_DESCRIPTIONS } from "@/lib/civility";
import { BADGES, LEVELS } from "@/lib/gamification";
import { FinishResult } from "./ChatInterface";
import { Button } from "../ui/Button";
import { AvatarWithItems } from "../gamification/AvatarWithItems";
import type { EquippedCosmetics } from "@/lib/shop";
import Link from "next/link";

// [persona-rating: temporary] — debateId is only needed for the rating card.
interface ScoreSummaryProps {
  result: FinishResult;
  debateId?: string;
}

function LevelUpOverlay({
  previousLevel,
  newLevel,
  equippedCosmetics,
  onDismiss,
}: {
  previousLevel: number;
  newLevel: number;
  equippedCosmetics?: EquippedCosmetics;
  onDismiss: () => void;
}) {
  const [phase, setPhase] = useState<"old" | "morphing" | "new">("old");
  const oldStage = LEVELS.find((l) => l.level === previousLevel);
  const newStage = LEVELS.find((l) => l.level === newLevel);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("morphing"), 800);
    const t2 = setTimeout(() => setPhase("new"), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative mx-4 max-w-sm w-full rounded-3xl bg-gradient-to-br from-golden-50 via-gobbl-50 to-plume-50 p-8 text-center shadow-2xl">
        {/* Sparkle particles */}
        {phase !== "old" && (
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            {Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                className="absolute text-lg"
                style={{
                  left: `${15 + Math.random() * 70}%`,
                  top: `${20 + Math.random() * 50}%`,
                  animation: `sparkleFloat ${1.2 + Math.random() * 0.8}s ease-out ${i * 0.1}s forwards`,
                }}
              >
                {["✨", "🪶", "⭐", "💫"][i % 4]}
              </span>
            ))}
          </div>
        )}

        <div className="mb-2 text-sm font-bold uppercase tracking-widest text-golden-600">
          Evolution!
        </div>

        <div className="relative mx-auto mb-4 flex items-center justify-center gap-4">
          {phase === "old" && (
            <div className="animate-scale-in">
              <AvatarWithItems stage={previousLevel} size="lg" animate={false} />
              <div className="mt-2 text-sm font-semibold text-roost-500">
                {oldStage?.name}
              </div>
            </div>
          )}

          {phase === "morphing" && (
            <div
              className="relative"
              style={{ animation: "levelUpGlow 1.2s ease-out forwards" }}
            >
              <div style={{ animation: "levelUpPulse 1.2s ease-in-out" }}>
                <AvatarWithItems stage={previousLevel} size="lg" animate={false} />
              </div>
            </div>
          )}

          {phase === "new" && (
            <div>
              <div style={{ animation: "morphIn 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
                <AvatarWithItems stage={newLevel} size="xl" equipped={equippedCosmetics ?? {}} />
              </div>
              <div className="mt-3 text-xl font-extrabold text-gradient-gobbl">
                {newStage?.name}
              </div>
              <div className="text-sm text-roost-500 mt-1">
                {newStage?.description}
              </div>
            </div>
          )}
        </div>

        {phase === "new" && (
          <div className="animate-slide-up mt-4">
            <p className="mb-4 text-sm text-roost-500">
              Your turkey evolved from <strong>{oldStage?.name}</strong> to <strong>{newStage?.name}</strong>!
            </p>
            <Button onClick={onDismiss}>
              Continue
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Hover (mouse) or tap/click (touch, keyboard) the label to read what the dimension means. */
function DimensionRow({ dimKey, value }: { dimKey: string; value: number }) {
  const label = DIMENSION_LABELS[dimKey as keyof typeof DIMENSION_LABELS] || dimKey;
  const description = DIMENSION_DESCRIPTIONS[dimKey as keyof typeof DIMENSION_DESCRIPTIONS];
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const open = pinned || hovered;
  const pct = (value / 10) * 100;

  return (
    <div>
      <div className="relative mb-1 flex justify-between text-sm">
        {description ? (
          <button
            type="button"
            onClick={() => setPinned((p) => !p)}
            onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
            aria-expanded={open}
            className="flex items-center gap-1.5 text-left text-roost-500 underline decoration-dotted underline-offset-4"
          >
            {label}
            <span
              aria-hidden
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-bold leading-none"
            >
              ?
            </span>
          </button>
        ) : (
          <span className="text-roost-500">{label}</span>
        )}
        <span className="font-semibold text-roost-700">{value.toFixed(1)}</span>
        {open && description && (
          // Floats over the rows below instead of pushing them down, so hovering
          // down the list doesn't make the layout jump under the cursor.
          <p
            role="tooltip"
            className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs leading-snug text-ink-soft shadow-lift"
          >
            {description}
          </p>
        )}
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-roost-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gobbl-400 via-golden-400 to-gobbl-500 transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// [persona-rating: temporary] — entire component is part of the removable rating system.
function PersonaRatingCard({ debateId }: { debateId: string }) {
  const [submitted, setSubmitted] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (dismissed) return null;

  if (submitted != null) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-4 text-center">
        <p className="font-body text-sm text-ink-soft">
          Thanks — rated <strong className="text-ink">{submitted}/10</strong>.
        </p>
      </div>
    );
  }

  const submit = async (rating: number) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/persona-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debateId, rating }),
      });
      if (res.ok) {
        setSubmitted(rating);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
        Testing feedback
      </div>
      <h3 className="font-display text-base font-bold tracking-[-0.01em] text-ink">
        How did this persona feel?
      </h3>
      <p className="mt-1 font-body text-xs text-ink-soft">
        1 = trivially easy &nbsp;·&nbsp; 10 = brutally hard
      </p>
      <div className="mt-3 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={submitting}
            onClick={() => submit(n)}
            className="flex h-10 items-center justify-center rounded-xl border border-line bg-surface font-mono text-sm font-semibold text-ink hover:border-ink-muted disabled:opacity-50"
          >
            {n}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="mt-3 font-body text-xs font-semibold text-ink-muted hover:text-ink"
      >
        Skip
      </button>
    </div>
  );
}

export function ScoreSummary({ result, debateId }: ScoreSummaryProps) {
  const isGreat = result.overallScore >= 7;
  const didLevelUp = result.previousLevel !== undefined && result.newLevel > result.previousLevel;
  const [showLevelUp, setShowLevelUp] = useState(didLevelUp);

  const scoreColor =
    result.overallScore >= 8
      ? "text-emerald-500"
      : result.overallScore >= 6
        ? "text-golden-500"
        : "text-plume-500";

  if (showLevelUp) {
    return (
      <LevelUpOverlay
        previousLevel={result.previousLevel}
        newLevel={result.newLevel}
        equippedCosmetics={result.equippedCosmetics}
        onDismiss={() => setShowLevelUp(false)}
      />
    );
  }

  return (
    <div className="animate-fade-in space-y-6 p-6">
      <div className="text-center">
        <div className="mb-4 relative inline-block">
          <AvatarWithItems stage={result.newLevel} size="lg" equipped={result.equippedCosmetics ?? {}} />
          {isGreat && (
            <div className="absolute -top-2 -right-2 animate-bounce-in">
              <span className="text-2xl">✨</span>
            </div>
          )}
        </div>
        <h2 className="mb-2 font-display text-2xl font-bold text-roost-700">
          {isGreat ? "Gobble Gobble! Great Discussion!" : "Good effort! Keep strutting!"}
        </h2>
        <div className={`text-5xl font-bold ${scoreColor}`}>
          {result.overallScore.toFixed(1)}
        </div>
        <p className="text-sm text-roost-500 mt-1">Overall Civility Score</p>

        {isGreat && (
          <div className="mt-3 flex justify-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className="inline-block animate-feather-fall text-lg"
                style={{ animationDelay: `${i * 200}ms`, animationDuration: `${1.5 + i * 0.3}s` }}
              >
                🪶
              </span>
            ))}
          </div>
        )}

        {didLevelUp && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-golden-100 px-4 py-1.5 text-sm font-bold text-golden-700 animate-bounce-in">
            <span>🎉</span> Evolved to {LEVELS.find((l) => l.level === result.newLevel)?.name}!
          </div>
        )}
      </div>

      {result.dimensions && (
        <div className="rounded-2xl bg-roost-100 p-5">
          <h3 className="mb-4 font-bold text-roost-700">
            Civility breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(result.dimensions).map(([key, value]) => (
              <DimensionRow key={key} dimKey={key} value={value} />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-roost-100 p-5">
        <h3 className="mb-3 font-bold text-roost-700 flex items-center gap-2">
          <span>⭐</span> XP earned
        </h3>
        <p className="mb-3 text-xs text-roost-500">
          Based on civility, difficulty, daily challenge, and streak — levels up your turkey.
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-roost-500">Base XP</span>
            <span className="font-medium">+{result.xp.base}</span>
          </div>
          {result.xp.difficultyBonus > 0 && (
            <div className="flex justify-between">
              <span className="text-roost-500">Difficulty bonus</span>
              <span className="font-medium text-plume-500">+{result.xp.difficultyBonus}</span>
            </div>
          )}
          {result.xp.dailyBonus > 0 && (
            <div className="flex justify-between">
              <span className="text-roost-500">Daily Gobble</span>
              <span className="font-medium text-golden-600">+{result.xp.dailyBonus}</span>
            </div>
          )}
          {result.xp.streakMultiplier > 1 && (
            <div className="flex justify-between">
              <span className="text-roost-500">Migration bonus</span>
              <span className="font-medium text-gobbl-600">x{result.xp.streakMultiplier.toFixed(1)}</span>
            </div>
          )}
          <div className="col-span-2 border-t border-roost-200 pt-2">
            <div className="flex justify-between text-base font-bold">
              <span>Total XP</span>
              <span className="text-gobbl-600 flex items-center gap-1">+{result.xp.total}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-roost-100 p-5">
        <h3 className="mb-3 font-bold text-roost-700 flex items-center gap-2">
          <span>🪶</span> Feathers earned
        </h3>
        <p className="mb-3 text-xs text-roost-500">
          Based on how much you participated (messages), difficulty, and daily — spend in the Bazaar.
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-roost-500">Engagement (messages)</span>
            <span className="font-medium">+{result.feathers.base}</span>
          </div>
          {result.feathers.difficultyBonus !== 0 && (
            <div className="flex justify-between">
              <span className="text-roost-500">Difficulty</span>
              <span className="font-medium text-plume-500">+{result.feathers.difficultyBonus}</span>
            </div>
          )}
          {result.feathers.dailyBonus > 0 && (
            <div className="flex justify-between">
              <span className="text-roost-500">Daily Gobble</span>
              <span className="font-medium text-golden-600">+{result.feathers.dailyBonus}</span>
            </div>
          )}
          <div className="col-span-2 border-t border-roost-200 pt-2">
            <div className="flex justify-between text-base font-bold">
              <span>Total feathers</span>
              <span className="text-gobbl-600 flex items-center gap-1">🪶 +{result.feathers.total}</span>
            </div>
          </div>
        </div>
      </div>

      {result.newBadges.length > 0 && (
        <div className="rounded-2xl border-2 border-golden-400 bg-gradient-to-br from-golden-50 to-gobbl-50 p-5">
          <h3 className="mb-3 text-center font-bold text-golden-700">
            New Badges Hatched!
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            {result.newBadges.map((key) => {
              const badge = BADGES.find((b) => b.key === key);
              if (!badge) return null;
              return (
                <div key={key} className="flex flex-col items-center animate-hatch">
                  <span className="text-4xl mb-1">{badge.icon}</span>
                  <span className="text-sm font-bold text-roost-700">{badge.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* [persona-rating: temporary] */}
      {debateId && <PersonaRatingCard debateId={debateId} />}

      <div className="flex justify-center gap-3 pt-2">
        <Link href="/chat">
          <Button>Let&apos;s Talk Turkey Again</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="secondary">Back to Roost</Button>
        </Link>
      </div>
    </div>
  );
}
