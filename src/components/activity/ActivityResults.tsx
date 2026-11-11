"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { ActivityRewards } from "@/lib/conversation";
import { stageProgress, STAGE_NAMES } from "@/lib/flock/growth";
import { MyTurkey } from "@/components/turkey/MyTurkey";
import { useFlock } from "@/components/turkey/useFlock";
import { LevelUpModal } from "@/components/gamification/LevelUpModal";
import { BadgeGrid } from "@/components/chat/ScoreSummary";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";

export type ActivityKind = "feed" | "school" | "park";

export interface ActivityResultsProps {
  kind: ActivityKind;
  rewards: ActivityRewards;
  /** Overrides the heading. */
  title?: string;
  /** Activity-specific extras, shown after the rewards and badges. */
  children?: ReactNode;
  onContinue: () => void;
  continueLabel: string;
}

/**
 * The one end screen for Feed, School and Park: the turkey, how it grew, what you earned
 * (feathers, XP, streak, badges), then whatever the activity adds. A level-up is shown first,
 * once, and only here.
 */
export function ActivityResults({ kind, rewards, title, children, onContinue, continueLabel }: ActivityResultsProps) {
  const { reload } = useFlock();
  const didLevelUp = rewards.newLevel > rewards.previousLevel;
  const [showLevelUp, setShowLevelUp] = useState(didLevelUp);

  // Every mounted flock / user summary refreshes (hotbar, user bubble, level, feathers).
  useEffect(() => {
    void reload();
    // Once, when the results appear.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (showLevelUp) {
    return (
      <LevelUpModal
        open
        fromLevel={rewards.previousLevel}
        toLevel={rewards.newLevel}
        turkey={rewards.turkey}
        rewards={{ feathers: 0 }}
        onClose={() => setShowLevelUp(false)}
      />
    );
  }

  const turkey = rewards.turkey;
  const name = turkey?.name ?? "Your turkey";
  const heading =
    title ??
    (kind === "feed" ? `${name} is fed.` : kind === "school" ? `${name} learned something.` : "Here is how it went.");

  const grew = turkey !== null && rewards.previousStage !== null && turkey.stage > rewards.previousStage;
  const progress = turkey ? stageProgress(turkey.activityCount, turkey.hatched) : null;
  const remaining = progress && progress.nextStage !== null ? Math.max(0, progress.needed - progress.done) : 0;

  return (
    <div className="mx-auto max-w-3xl animate-fade-in px-5 py-8 motion-reduce:animate-none sm:px-8">
      <div className="flex flex-col items-center text-center">
        <MyTurkey turkey={turkey} size={150} inScene reaction="cheer" />
        <h2 className="mt-4 font-display text-[28px] font-bold leading-[1.05] tracking-[-0.03em]">{heading}</h2>

        {grew && turkey ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-ochre-soft px-3.5 py-1.5 font-body text-sm font-bold text-ink">
            <Icon name="sparkle" size={16} />
            {name} grew into a {STAGE_NAMES[turkey.stage]}!
          </p>
        ) : (
          progress &&
          progress.nextStage !== null &&
          progress.needed > 0 && (
            <div className="mt-3 w-full max-w-xs">
              <div
                role="progressbar"
                aria-label={`Progress to ${STAGE_NAMES[progress.nextStage]}`}
                aria-valuemin={0}
                aria-valuemax={progress.needed}
                aria-valuenow={progress.done}
                className="h-2 overflow-hidden rounded-full bg-line"
              >
                <div
                  className="h-full rounded-full bg-forest-500 transition-[width] duration-700"
                  style={{ width: `${Math.min(100, (progress.done / progress.needed) * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 font-body text-xs text-ink-soft">
                {remaining === 1 ? "1 more activity" : `${remaining} more activities`} to {STAGE_NAMES[progress.nextStage]}
              </p>
            </div>
          )
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-stretch justify-center gap-3">
        <RewardTile icon="feather" value={`+${rewards.feathers}`} label="Feathers" tone="text-golden-700" />
        {rewards.xp > 0 && <RewardTile icon="xp" value={`+${rewards.xp}`} label="XP" tone="text-primary" />}
        <RewardTile
          icon="streak"
          value={`${rewards.streak}`}
          label="day streak"
          tone="text-ink"
        />
      </div>

      <BadgeGrid badges={rewards.newBadges} />

      {children && <div className="mt-8">{children}</div>}

      <div className="mt-10 flex justify-center">
        <Button size="lg" onClick={onContinue} className="w-full sm:w-auto">
          {continueLabel}
        </Button>
      </div>
    </div>
  );
}

function RewardTile({ icon, value, label, tone }: { icon: IconName; value: string; label: string; tone: string }) {
  return (
    <div className="flex min-w-[96px] flex-1 basis-24 flex-col items-center rounded-2xl border border-line bg-surface px-4 py-3 sm:max-w-[150px]">
      <span className={`flex items-center gap-1.5 font-display text-2xl font-bold tracking-[-0.03em] num-tabular ${tone}`}>
        <Icon name={icon} size={18} />
        {value}
      </span>
      <span className="mt-0.5 font-body text-xs text-ink-muted">{label}</span>
    </div>
  );
}
