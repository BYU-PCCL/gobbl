"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DIMENSION_LABELS, DIMENSION_DESCRIPTIONS } from "@/lib/civility";
import { BADGES, LEVELS } from "@/lib/gamification";
import type { EquippedCosmetics } from "@/lib/shop";
import { FinishResult } from "./ChatInterface";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { AvatarWithItems } from "../gamification/AvatarWithItems";
import { BadgeMark } from "../gamification/BadgeMark";

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
  const [revealed, setRevealed] = useState(false);
  const oldStage = LEVELS.find((l) => l.level === previousLevel);
  const newStage = LEVELS.find((l) => l.level === newLevel);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Your turkey evolved"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-surface p-8 text-center shadow-lift">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-ochre-soft/70" />
        <div className="relative">
          <p className="font-body text-sm font-semibold text-primary">Your turkey evolved</p>

          <div className="mt-4 flex min-h-[200px] items-center justify-center">
            {revealed ? (
              <div className="animate-level-pulse">
                <AvatarWithItems stage={newLevel} size={180} equipped={equippedCosmetics ?? {}} />
              </div>
            ) : (
              <div className="opacity-60">
                <AvatarWithItems stage={previousLevel} size={150} animate={false} />
              </div>
            )}
          </div>

          <h2 className="mt-3 font-display text-[32px] font-bold leading-none tracking-[-0.03em]">
            {revealed ? newStage?.name : oldStage?.name}
          </h2>
          <p className="mt-2 min-h-[1.25rem] font-body text-sm text-ink-soft">
            {revealed ? newStage?.description : ""}
          </p>

          {revealed && (
            <div className="mt-6 animate-slide-up">
              <p className="mb-4 font-body text-sm text-ink-soft">
                From {oldStage?.name} to {newStage?.name}.
              </p>
              <Button onClick={onDismiss} className="w-full">
                See your results
              </Button>
            </div>
          )}
        </div>
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
      <div className="relative mb-1.5 flex items-baseline justify-between gap-3">
        {description ? (
          <button
            type="button"
            onClick={() => setPinned((p) => !p)}
            onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
            aria-expanded={open}
            className="flex items-center gap-1.5 text-left font-body text-[13px] font-semibold text-ink underline decoration-line decoration-dotted underline-offset-4"
          >
            {label}
            <span
              aria-hidden
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-ink-muted text-[10px] font-bold leading-none text-ink-muted"
            >
              ?
            </span>
          </button>
        ) : (
          <span className="font-body text-[13px] font-semibold text-ink">{label}</span>
        )}
        <span className="font-mono text-[13px] font-semibold text-forest-600 num-tabular">
          {value.toFixed(1)}
        </span>
        {open && description && (
          // Floats over the rows below instead of pushing them down, so hovering
          // down the list doesn't make the layout jump under the cursor.
          <p
            role="tooltip"
            className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-line bg-surface px-3 py-2 font-body text-xs leading-snug text-ink-soft shadow-lift"
          >
            {description}
          </p>
        )}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-bg">
        <div
          className="h-full rounded-full bg-forest-500 transition-[width] duration-700"
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
          Thanks. You rated this partner <strong className="text-ink">{submitted} out of 10</strong>.
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
    <div className="rounded-2xl border border-line bg-surface p-5">
      <h3 className="font-display text-base font-bold tracking-[-0.01em] text-ink">
        How hard did this partner push?
      </h3>
      <p className="mt-1 font-body text-xs text-ink-soft">
        Testing feedback. 1 is trivially easy, 10 is brutally hard.
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

function LedgerRow({ label, value, tone = "text-ink" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="font-body text-sm text-ink-soft">{label}</span>
      <span className={`font-mono text-sm font-semibold num-tabular ${tone}`}>{value}</span>
    </div>
  );
}

export function ScoreSummary({ result, debateId }: ScoreSummaryProps) {
  const isGreat = result.overallScore >= 7;
  const didLevelUp = result.previousLevel !== undefined && result.newLevel > result.previousLevel;
  const [showLevelUp, setShowLevelUp] = useState(didLevelUp);

  const scoreTone =
    result.overallScore >= 8
      ? "text-forest-600"
      : result.overallScore >= 6
        ? "text-golden-600"
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

  const newLevelName = LEVELS.find((l) => l.level === result.newLevel)?.name;

  return (
    <div className="mx-auto max-w-4xl animate-fade-in px-5 py-8 sm:px-8 lg:py-12">
      {/* Headline result */}
      <div className="flex flex-col items-center text-center lg:flex-row lg:items-center lg:gap-10 lg:text-left">
        <AvatarWithItems stage={result.newLevel} size={150} equipped={result.equippedCosmetics ?? {}} />
        <div className="mt-4 lg:mt-0">
          <h2 className="font-display text-[28px] font-bold leading-[1.05] tracking-[-0.03em] lg:text-[40px]">
            {isGreat ? "That was a good conversation." : "Good effort. Keep practicing."}
          </h2>
          <div className="mt-4 flex items-baseline justify-center gap-2 lg:justify-start">
            <span className={`font-display text-[56px] font-bold leading-none tracking-[-0.04em] num-tabular ${scoreTone}`}>
              {result.overallScore.toFixed(1)}
            </span>
            <span className="font-body text-sm text-ink-muted">civility, out of 10</span>
          </div>
          {didLevelUp && newLevelName && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-ochre-soft px-3.5 py-1.5 font-body text-sm font-bold text-golden-700">
              <Icon name="sparkle" size={16} />
              Evolved to {newLevelName}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:mt-10 lg:grid-cols-2 lg:gap-6">
        {result.dimensions && (
          <section className="rounded-2xl border border-line bg-surface p-5 lg:row-span-2 lg:self-start">
            <h3 className="mb-4 font-display text-lg font-bold tracking-[-0.02em]">Civility breakdown</h3>
            <div className="space-y-4">
              {Object.entries(result.dimensions).map(([key, value]) => (
                <DimensionRow key={key} dimKey={key} value={value} />
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold tracking-[-0.02em]">
            <Icon name="xp" size={18} className="text-primary" />
            XP earned
          </h3>
          <p className="mb-2 mt-1 font-body text-xs text-ink-muted">
            From civility, difficulty, the daily topic and your streak. XP grows your turkey.
          </p>
          <LedgerRow label="Base" value={`+${result.xp.base}`} />
          {result.xp.difficultyBonus > 0 && (
            <LedgerRow label="Difficulty bonus" value={`+${result.xp.difficultyBonus}`} tone="text-plume-500" />
          )}
          {result.xp.dailyBonus > 0 && (
            <LedgerRow label="Daily Gobble" value={`+${result.xp.dailyBonus}`} tone="text-golden-600" />
          )}
          {result.xp.streakMultiplier > 1 && (
            <LedgerRow label="Streak multiplier" value={`×${result.xp.streakMultiplier.toFixed(1)}`} tone="text-primary" />
          )}
          <div className="mt-1.5 flex items-baseline justify-between border-t border-line pt-2.5">
            <span className="font-body text-sm font-bold">Total</span>
            <span className="font-mono text-base font-bold text-primary num-tabular">+{result.xp.total} XP</span>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold tracking-[-0.02em]">
            <Icon name="feather" size={18} />
            Feathers earned
          </h3>
          <p className="mb-2 mt-1 font-body text-xs text-ink-muted">
            From how much you took part. Spend them in the shop.
          </p>
          <LedgerRow label="Messages sent" value={`+${result.feathers.base}`} />
          {result.feathers.difficultyBonus !== 0 && (
            <LedgerRow label="Difficulty" value={`+${result.feathers.difficultyBonus}`} tone="text-plume-500" />
          )}
          {result.feathers.dailyBonus > 0 && (
            <LedgerRow label="Daily Gobble" value={`+${result.feathers.dailyBonus}`} tone="text-golden-600" />
          )}
          <div className="mt-1.5 flex items-baseline justify-between border-t border-line pt-2.5">
            <span className="font-body text-sm font-bold">Total</span>
            <span className="font-mono text-base font-bold text-golden-700 num-tabular">
              +{result.feathers.total}
            </span>
          </div>
        </section>
      </div>

      {result.newBadges.length > 0 && (
        <section className="mt-4 rounded-2xl border-2 border-ochre bg-ochre-soft/40 p-5 lg:mt-6">
          <h3 className="mb-4 text-center font-display text-lg font-bold tracking-[-0.02em]">
            {result.newBadges.length === 1 ? "New badge" : "New badges"}
          </h3>
          <div className="flex flex-wrap justify-center gap-6">
            {result.newBadges.map((key) => {
              const badge = BADGES.find((b) => b.key === key);
              if (!badge) return null;
              return (
                <div key={key} className="flex w-28 flex-col items-center gap-2 text-center animate-hatch">
                  <BadgeMark badgeKey={key} size={56} />
                  <span className="font-body text-sm font-bold text-ink">{badge.name}</span>
                  <span className="font-body text-xs text-ink-soft">{badge.description}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* [persona-rating: temporary] */}
      {debateId && (
        <div className="mt-4 lg:mt-6">
          <PersonaRatingCard debateId={debateId} />
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
        <Link href="/chat">
          <Button className="w-full sm:w-auto">Start another debate</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="secondary" className="w-full sm:w-auto">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
