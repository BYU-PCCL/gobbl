"use client";

import Link from "next/link";
import { FlatTurkey } from "@/components/gamification/FlatTurkey";
import { Icon } from "@/components/ui/Icon";

interface DailyChallengeProps {
  topic: {
    id: string;
    title: string;
    description: string;
    category: string;
  };
  completed?: boolean;
  className?: string;
}

/**
 * Daily Gobble card — Harvest direction.
 * Inverted (ink-on-bg → bg-on-ink) hero card with a background turkey silhouette
 * and ochre CTA. Difficulty chips show what Robert's running today.
 *
 * Edit the chips/CTA to your own difficulty preset once the user picks one.
 */
export function DailyChallenge({ topic, completed = false, className = "" }: DailyChallengeProps) {
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-ink p-6 text-bg shadow-soft lg:p-8 ${className}`}>
      {/* Background turkey silhouette */}
      <div className="pointer-events-none absolute -bottom-8 -right-8 opacity-20">
        <FlatTurkey stage={6} size={180} />
      </div>

      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ochre">
            {completed ? "Completed today" : `Today's Gobble · ${topic.category}`}
          </span>
          <span className="font-mono text-[10px] text-bg/60">
            {completed ? <Icon name="check" size={14} label="Completed" /> : "6h left"}
          </span>
        </div>

        <h2 className="mt-2 max-w-[78%] font-display text-[22px] lg:text-[26px] font-semibold leading-[1.15] tracking-[-0.02em]">
          {topic.title}
        </h2>

        {!completed && (
          <>
            <div className="mt-3.5 flex gap-1.5">
              {["Friendly Cluck", "Spirited Strut", "Full Gobble"].map((d, i) => (
                <span
                  key={d}
                  className={`rounded-full px-2.5 py-1 font-body text-[11px] font-semibold ${
                    i === 1 ? "bg-ochre text-ink" : "bg-white/10 text-bg"
                  }`}
                >
                  {d}
                </span>
              ))}
            </div>

            <Link
              href={`/chat/setup?daily=true&topic=${topic.id}`}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-ochre px-5 py-3 font-body text-sm font-bold text-ink transition-transform active:scale-[0.98]"
            >
              Start practice
            </Link>
            <div className="mt-3 font-mono text-[10px] text-bg/55">+50 feathers · +120 XP</div>
          </>
        )}

        {completed && (
          <p className="mt-3 max-w-[80%] font-body text-sm text-bg/70">
            Nice gobble. Come back tomorrow for a fresh topic.
          </p>
        )}
      </div>
    </div>
  );
}
