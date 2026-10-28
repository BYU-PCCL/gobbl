"use client";

import { useState } from "react";
import type { FinishResult } from "@/lib/conversation";
import { civilityLabel } from "@/lib/civility";
import { LEVELS } from "@/lib/gamification";
import { companionStage, getSpecies } from "@/lib/companion";
import { AvatarWithItems } from "@/components/gamification/AvatarWithItems";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { BadgeGrid, DimensionRow, FeatherLedger, LevelUpOverlay, XpLedger } from "@/components/chat/ScoreSummary";
import type { ConversationYou } from "./ConversationScene";
import { TurnReview } from "./TurnReview";

/**
 * Shown after wrap-up: level-up overlay if any, the four civility dimensions + label, XP and
 * feathers, new badges, then a per-turn review (POST /api/debates/[id]/analyze) with Nice/Try
 * notes under each of the user's turns.
 */
export interface ConversationResultsProps {
  debateId: string;
  result: FinishResult;
  you: ConversationYou;
  onContinue: () => void;
  continueLabel: string;
}

export function ConversationResults({ debateId, result, you, onContinue, continueLabel }: ConversationResultsProps) {
  const didLevelUp = result.newLevel > result.previousLevel;
  const [showLevelUp, setShowLevelUp] = useState(didLevelUp);
  const species = getSpecies(you.speciesId);
  const equipped = result.equippedCosmetics ?? you.equipped ?? {};

  if (showLevelUp) {
    return (
      <LevelUpOverlay
        previousLevel={result.previousLevel}
        newLevel={result.newLevel}
        equippedCosmetics={equipped}
        palette={species.palette}
        onDismiss={() => setShowLevelUp(false)}
      />
    );
  }

  const scoreTone =
    result.overallScore >= 8 ? "text-forest-fg" : result.overallScore >= 6 ? "text-ochre" : "text-plume-500";
  const newLevelName = LEVELS.find((l) => l.level === result.newLevel)?.name;

  return (
    <div className="mx-auto max-w-3xl animate-fade-in px-5 py-8 motion-reduce:animate-none sm:px-8">
      <div className="flex flex-col items-center text-center">
        <AvatarWithItems stage={companionStage(result.newLevel, true)} size={150} equipped={equipped} palette={species.palette} />
        <h2 className="mt-4 font-display text-[28px] font-bold leading-[1.05] tracking-[-0.03em]">
          Here is how it went.
        </h2>
        <div className="mt-4 flex items-baseline justify-center gap-2">
          <span className={`font-display text-[56px] font-bold leading-none tracking-[-0.04em] num-tabular ${scoreTone}`}>
            {result.overallScore.toFixed(1)}
          </span>
          <span className="font-body text-sm text-ink-muted">civility out of 10</span>
        </div>
        <p className="mt-1 font-body text-base font-semibold text-ink">{civilityLabel(result.overallScore)}</p>
        {didLevelUp && newLevelName && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-ochre-soft px-3.5 py-1.5 font-body text-sm font-bold text-ink">
            <Icon name="sparkle" size={16} />
            Evolved to {newLevelName}
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

      <BadgeGrid badges={result.newBadges} />

      <div className="mt-10">
        <TurnReview debateId={debateId} />
      </div>

      <div className="mt-10 flex justify-center">
        <Button size="lg" onClick={onContinue} className="w-full sm:w-auto">
          {continueLabel}
        </Button>
      </div>
    </div>
  );
}

