"use client";

import { useState } from "react";
import { DIMENSION_LABELS, DIMENSION_DESCRIPTIONS } from "@/lib/civility";
import { BADGES } from "@/lib/gamification";
import type { FinishResult } from "@/lib/conversation";
import { Icon } from "../ui/Icon";
import { BadgeMark } from "../gamification/BadgeMark";

/** Hover (mouse) or tap/click (touch, keyboard) the label to read what the dimension means. */
export function DimensionRow({ dimKey, value }: { dimKey: string; value: number }) {
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

export function LedgerRow({ label, value, tone = "text-ink" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="font-body text-sm text-ink-soft">{label}</span>
      <span className={`font-mono text-sm font-semibold num-tabular ${tone}`}>{value}</span>
    </div>
  );
}

export function XpLedger({ xp }: { xp: FinishResult["xp"] }) {
  return (
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold tracking-[-0.02em]">
          <Icon name="xp" size={18} className="text-primary" />
          XP earned
        </h3>
        <p className="mb-2 mt-1 font-body text-xs text-ink-muted">
          From civility, difficulty and your streak. XP raises your level.
        </p>
        <LedgerRow label="Base" value={`+${xp.base}`} />
        {xp.difficultyBonus > 0 && (
          <LedgerRow label="Difficulty bonus" value={`+${xp.difficultyBonus}`} tone="text-plume-500" />
        )}
        {xp.streakMultiplier > 1 && (
          <LedgerRow label="Streak multiplier" value={`×${xp.streakMultiplier.toFixed(1)}`} tone="text-primary" />
        )}
        <div className="mt-1.5 flex items-baseline justify-between border-t border-line pt-2.5">
          <span className="font-body text-sm font-bold">Total</span>
          <span className="font-mono text-base font-bold text-primary num-tabular">+{xp.total} XP</span>
        </div>
      </section>
  );
}

export function FeatherLedger({ feathers }: { feathers: FinishResult["feathers"] }) {
  return (
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold tracking-[-0.02em]">
          <Icon name="feather" size={18} />
          Feathers earned
        </h3>
        <p className="mb-2 mt-1 font-body text-xs text-ink-muted">
          From how much you took part. Spend them in the shop.
        </p>
        <LedgerRow label="Messages sent" value={`+${feathers.base}`} />
        {feathers.difficultyBonus !== 0 && (
          <LedgerRow label="Difficulty" value={`+${feathers.difficultyBonus}`} tone="text-plume-500" />
        )}
        <div className="mt-1.5 flex items-baseline justify-between border-t border-line pt-2.5">
          <span className="font-body text-sm font-bold">Total</span>
          <span className="font-mono text-base font-bold text-golden-700 num-tabular">
            +{feathers.total}
          </span>
        </div>
      </section>
  );
}

export function BadgeGrid({ badges }: { badges: string[] }) {
  if (badges.length === 0) return null;
  return (
    <section className="mt-4 rounded-2xl border-2 border-ochre bg-ochre-soft/40 p-5 lg:mt-6">
      <h3 className="mb-4 text-center font-display text-lg font-bold tracking-[-0.02em]">
        {badges.length === 1 ? "New badge" : "New badges"}
      </h3>
      <div className="flex flex-wrap justify-center gap-6">
        {badges.map((key) => {
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
  );
}
