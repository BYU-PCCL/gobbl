"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { ActivityRewards } from "@/lib/conversation";
import { stageProgress, STAGE_NAMES } from "@/lib/flock/growth";
import { MyTurkey } from "@/components/turkey/MyTurkey";
import { useFlock } from "@/components/turkey/useFlock";
import { LevelUpModal } from "@/components/gamification/LevelUpModal";
import { BadgeGrid } from "@/components/chat/ScoreSummary";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { activityCta, activityHref } from "@/lib/flock/home";
import { followUp } from "@/lib/flock/progress";

export type ActivityKind = "feed" | "school" | "park";

export interface ActivityResultsProps {
  kind: ActivityKind;
  rewards: ActivityRewards;
  /** Activity-specific extras, shown after the rewards and badges. */
  children?: ReactNode;
  /** The way back to the turkey. Shown beside the next step, or alone when there is none. */
  onContinue: () => void;
  continueLabel: string;
  /** true where nothing around this adds side padding (the full-screen conversation view). */
  padded?: boolean;
}

/**
 * The one end screen for Feed, School and Park: the turkey, how it grew, what you earned
 * (feathers, XP, streak, badges), then whatever the activity adds. A level-up is shown first,
 * once, and only here. The main button leads on to what just opened (Feed to School, School to
 * the Park, the Park to another chat); the way back to the turkey sits beside it.
 */
export function ActivityResults({ kind, rewards, children, onContinue, continueLabel, padded = false }: ActivityResultsProps) {
  const { reload, turkeys } = useFlock();
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
    kind === "feed" ? `${name} is fed.` : kind === "school" ? `${name} learned something.` : "Here is how it went.";

  // The flock was just reloaded, so this is the turkey as it stands after the activity.
  const fresh = turkeys.find((t) => t.id === turkey?.id) ?? null;
  const nextKind = followUp(kind);
  const next =
    fresh && fresh.hatched && fresh.unlocked[nextKind]
      ? {
          href: activityHref(nextKind, fresh),
          label: kind === "park" ? "Talk to someone else" : activityCta(nextKind, fresh.name),
          note: kind === "feed" ? "School is open now." : kind === "school" ? "The Park is open now." : null,
        }
      : null;

  const grew = turkey !== null && rewards.previousStage !== null && turkey.stage > rewards.previousStage;
  const progress = turkey ? stageProgress(turkey.activityCount, turkey.hatched) : null;
  const remaining = progress && progress.nextStage !== null ? Math.max(0, progress.needed - progress.done) : 0;

  return (
    <div className={`mx-auto max-w-3xl animate-fade-in motion-reduce:animate-none ${padded ? "px-5 pt-8 sm:px-8" : "pt-2"}`}>
      <div className="flex flex-col items-center text-center">
        <MyTurkey turkey={turkey} size={150} inScene reaction="cheer" />
        <h1 className="mt-4 font-display text-display-md text-ink">{heading}</h1>

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
        <RewardTile icon="feather" value={`+${rewards.feathers}`} label="Feathers" tone="text-ink" />
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

      {/* Stays in reach however long the review above is. */}
      <div className="sticky bottom-0 z-10 -mx-1 mt-10 bg-gradient-to-t from-bg from-70% to-bg/0 px-1 pb-[max(env(safe-area-inset-bottom),1rem)] pt-6">
        {next?.note && <p className="mb-2 text-center font-body text-sm font-semibold text-forest-fg">{next.note}</p>}
        <div className="flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
          {next ? (
            <>
              <ButtonLink href={next.href} size="lg">
                {next.label}
              </ButtonLink>
              <Button size="lg" variant="outline" onClick={onContinue}>
                {continueLabel}
              </Button>
            </>
          ) : (
            <Button size="lg" onClick={onContinue} className="w-full sm:w-auto">
              {continueLabel}
            </Button>
          )}
        </div>
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
