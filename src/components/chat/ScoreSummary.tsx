"use client";

import { useState } from "react";
import Link from "next/link";
import { DIMENSION_LABELS, DIMENSION_DESCRIPTIONS } from "@/lib/civility";
import type { EquippedCosmetics } from "@/lib/shop";
import { FinishResult } from "./ChatInterface";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { TurkeyCharacter } from "../turkey/TurkeyCharacter";
import type { TurkeyView } from "@/lib/flock/view";

interface ScoreSummaryProps {
  result: FinishResult;
  /** The turkey this conversation was for, when known. */
  turkey?: TurkeyView | null;
  /** Show the "talk a little longer" notice (the visit did not count). */
  tooShort?: boolean;
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

function LedgerRow({ label, value, tone = "text-ink" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="font-body text-sm text-ink-soft">{label}</span>
      <span className={`font-mono text-sm font-semibold num-tabular ${tone}`}>{value}</span>
    </div>
  );
}

export function ScoreSummary({ result, turkey, tooShort }: ScoreSummaryProps) {
  const turkeyName = turkey?.name ?? "your turkey";
  const isGreat = result.overallScore >= 7;
  const scoreTone =
    result.overallScore >= 8
      ? "text-forest-600"
      : result.overallScore >= 6
        ? "text-golden-600"
        : "text-plume-500";

  return (
    <div className="mx-auto max-w-4xl animate-fade-in px-5 py-8 sm:px-8 lg:py-12">
      {/* Headline result */}
      <div className="flex flex-col items-center text-center lg:flex-row lg:items-center lg:gap-10 lg:text-left">
        {turkey && (
          <TurkeyCharacter
            stage={turkey.stage}
            mood={turkey.mood}
            skill={turkey.skill}
            equipped={result.equippedCosmetics}
            size={150}
            label={turkeyName}
          />
        )}
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
          {tooShort && (
            <p className="mt-3 font-body text-sm font-semibold text-golden-700">
              Talk a little longer next time so it counts for {turkeyName}.
            </p>
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

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
        <Link href="/home">
          <Button className="w-full sm:w-auto">{turkey ? `Back to ${turkeyName}` : "Back home"}</Button>
        </Link>
        <Link href={turkey ? `/chat?turkeyId=${turkey.id}` : "/chat"}>
          <Button variant="secondary" className="w-full sm:w-auto">Visit the park again</Button>
        </Link>
      </div>
    </div>
  );
}
