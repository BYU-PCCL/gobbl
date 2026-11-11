"use client";

import { useState } from "react";
import type { FinishResult } from "@/lib/conversation";
import { civilityLabel } from "@/lib/civility";
import type { TurkeyView } from "@/lib/flock/view";
import { ActivityResults } from "@/components/activity/ActivityResults";
import { Icon } from "@/components/ui/Icon";
import { DimensionRow, FeatherLedger, XpLedger } from "@/components/chat/ScoreSummary";
import { TurnReview } from "./TurnReview";

/**
 * Shown after wrap-up: the shared activity results (level-up, turkey, rewards, badges) with the
 * civility score and dimensions, XP and feather ledgers, then a per-turn review (POST /api/debates/[id]/analyze) with Nice/Try
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
}

export function ConversationResults({ debateId, result, turkey, personaInitials, onContinue, continueLabel }: ConversationResultsProps) {
  const rewards = { ...result.rewards, turkey: result.rewards.turkey ?? turkey };
  const didLevelUp = rewards.newLevel > rewards.previousLevel;
  const scoreTone =
    result.overallScore >= 8 ? "text-forest-fg" : result.overallScore >= 6 ? "text-ochre" : "text-plume-500";

  return (
    <ActivityResults kind="park" rewards={rewards} onContinue={onContinue} continueLabel={continueLabel}>
      <div className="flex flex-col items-center text-center">
        <div className="flex items-baseline justify-center gap-2">
          <span className={`font-display text-[56px] font-bold leading-none tracking-[-0.04em] num-tabular ${scoreTone}`}>
            {result.overallScore.toFixed(1)}
          </span>
          <span className="font-body text-sm text-ink-muted">civility out of 10</span>
        </div>
        <p className="mt-1 font-body text-base font-semibold text-ink">{civilityLabel(result.overallScore)}</p>
        {didLevelUp && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-ochre-soft px-3.5 py-1.5 font-body text-sm font-bold text-ink">
            <Icon name="sparkle" size={16} />
            Reached level {result.newLevel}
          </div>
        )}
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
        <XpLedger xp={result.xp} />
        <FeatherLedger feathers={result.feathers} />
      </div>

      <div className="mt-10">
        <TurnReview debateId={debateId} personaInitials={personaInitials} />
      </div>
    </ActivityResults>
  );
}
