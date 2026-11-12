"use client";

import type { FinishResult } from "@/lib/conversation";
import { civilityLabel } from "@/lib/civility";
import type { TurkeyView } from "@/lib/flock/view";
import { ActivityResults } from "@/components/activity/ActivityResults";
import { DimensionRow, FeatherLedger, XpLedger } from "@/components/chat/ScoreSummary";
import { TurnReview } from "./TurnReview";

/**
 * Shown after wrap-up: the shared activity results (level-up, turkey, rewards, badges) with the
 * civility score and dimensions, a folded "How this was scored" ledger, then a per-turn review (POST /api/debates/[id]/analyze) with Nice/Try
 * notes under each of the user's turns.
 */
export interface ConversationResultsProps {
  debateId: string;
  result: FinishResult;
  turkey: TurkeyView | null;
  /** The partner's initials, shown in the review. */
  personaInitials?: string | null;
  onContinue: () => void;
  continueLabel: string;
  /** false when the page around it already adds side padding. */
  padded?: boolean;
}

export function ConversationResults({
  debateId,
  result,
  turkey,
  personaInitials,
  onContinue,
  continueLabel,
  padded = true,
}: ConversationResultsProps) {
  const rewards = { ...result.rewards, turkey: result.rewards.turkey ?? turkey };
  const scoreTone =
    result.overallScore >= 8 ? "text-forest-fg" : result.overallScore >= 6 ? "text-ink" : "text-danger";

  return (
    <ActivityResults kind="park" rewards={rewards} onContinue={onContinue} continueLabel={continueLabel} padded={padded}>
      <div className="flex flex-col items-center text-center">
        <div className="flex items-baseline justify-center gap-2">
          <span className={`font-display text-[56px] font-bold leading-none tracking-[-0.04em] num-tabular ${scoreTone}`}>
            {result.overallScore.toFixed(1)}
          </span>
          <span className="font-body text-sm text-ink-muted">civility out of 10</span>
        </div>
        <p className="mt-1 font-body text-base font-semibold text-ink">{civilityLabel(result.overallScore)}</p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {result.dimensions && (
          <section className="rounded-2xl border border-line bg-surface p-5 sm:col-span-2">
            <h3 className="mb-4 font-display text-lg font-bold tracking-[-0.02em]">Civility breakdown</h3>
            <div className="space-y-4">
              {Object.entries(result.dimensions).map(([key, value]) => (
                <DimensionRow key={key} dimKey={key} value={value} />
              ))}
            </div>
          </section>
        )}
      </div>

      <details className="group mt-4 rounded-2xl border border-line bg-surface">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-5 font-body text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
          How this was scored
          <span aria-hidden className="text-ink-muted transition-transform group-open:rotate-180">
            &#9662;
          </span>
        </summary>
        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
          <XpLedger xp={result.xp} />
          <FeatherLedger feathers={result.feathers} />
        </div>
      </details>

      <div className="mt-10">
        <TurnReview debateId={debateId} personaInitials={personaInitials} />
      </div>
    </ActivityResults>
  );
}
