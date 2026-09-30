"use client";

import { useEffect } from "react";
import { FlatTurkey, TURKEY_STAGE_LABELS } from "@/components/gamification/FlatTurkey";

interface LevelUpModalProps {
  open: boolean;
  fromLevel: number;
  toLevel: number;
  rewards: {
    feathers: number;
    outfits?: number;
    newBadge?: string;
  };
  onClose: () => void;
  onSeeWhatsNew?: () => void;
}

/**
 * Level-up celebration overlay — Harvest direction.
 *
 * Full-screen takeover: ink background with radial ochre glow, confetti dots,
 * before/after turkey transition, and reward summary tiles. Two CTAs:
 * "Show me what's new" (ochre) and "Skip for now" (text).
 *
 * Show this when the dashboard detects level-up (e.g. on first mount after
 * a debate that pushed user.level up).
 */
export function LevelUpModal({
  open,
  fromLevel,
  toLevel,
  rewards,
  onClose,
  onSeeWhatsNew,
}: LevelUpModalProps) {
  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  // Deterministic confetti positions (avoid SSR mismatch + repaints)
  const confetti = Array.from({ length: 36 }).map((_, i) => {
    const x = (i * 37 + 7) % 100;     // vw %
    const y = (i * 79 + 31) % 80;     // vh %
    const rot = (i * 47) % 360;
    const colors = ["bg-ochre", "bg-primary", "bg-forest-500", "bg-plume-500", "bg-white"];
    const c = colors[i % colors.length];
    const shape = i % 4; // 0 round, 1 sm rect, 2 wide rect, 3 sm rect
    const sizeClass =
      shape === 0 ? "h-1 w-1 rounded-full" :
      shape === 1 ? "h-1 w-2 rounded-sm" :
      shape === 2 ? "h-1 w-3" :
                    "h-1 w-1.5 rounded-sm";
    return { left: `${x}%`, top: `${y}%`, transform: `rotate(${rot}deg)`, c, sizeClass };
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Level up"
      className="fixed inset-0 z-50 overflow-hidden bg-ink text-bg animate-fade-in"
    >
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 38%, rgba(228,165,71,0.35), rgba(192,70,28,0.18) 30%, transparent 60%)",
        }}
      />
      {/* Confetti */}
      {confetti.map((c, i) => (
        <div
          key={i}
          className={`absolute opacity-85 ${c.c} ${c.sizeClass}`}
          style={{ left: c.left, top: c.top, transform: c.transform }}
        />
      ))}

      <div className="relative mx-auto flex h-full max-w-md flex-col items-center px-6 pt-20">
        <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-ochre">
          Level up
        </div>
        <h1 className="mt-3 text-center font-display text-[50px] font-extrabold leading-[0.95] tracking-[-0.04em]">
          You&apos;re a
          <br />
          <span className="italic text-ochre">{TURKEY_STAGE_LABELS[toLevel as 1]}</span> now.
        </h1>
        <p className="mt-1.5 text-center font-body text-sm text-bg/65">
          New plumage unlocked.
        </p>

        {/* Turkey transition */}
        <div className="mt-10 flex items-center justify-center gap-6">
          <div className="text-center opacity-40">
            <div className="grayscale" style={{ filter: "blur(1px)" }}>
              <FlatTurkey stage={fromLevel} size={80} />
            </div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-bg/50">
              LV.{fromLevel} {TURKEY_STAGE_LABELS[fromLevel as 1]}
            </div>
          </div>
          <svg width="28" height="14" viewBox="0 0 28 14" fill="none" aria-hidden>
            <path d="M2 7h22M20 2l5 5-5 5"
              stroke="rgb(228 165 71)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="text-center glow-ochre animate-level-pulse">
            <FlatTurkey stage={toLevel} size={150} />
            <div className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-ochre">
              LV.{toLevel} {TURKEY_STAGE_LABELS[toLevel as 1]}
            </div>
          </div>
        </div>

        {/* Rewards */}
        <div className="mt-12 w-full">
          <div className="text-center font-mono text-[10px] uppercase tracking-[0.16em] text-bg/40">
            You earned
          </div>
          <div className="mt-3.5 grid grid-cols-3 gap-2.5">
            <RewardTile value={`+${rewards.feathers}`} label="Feathers" color="text-ochre" />
            {rewards.outfits != null && (
              <RewardTile value={`+${rewards.outfits}`} label="Outfits" color="text-bg" />
            )}
            {rewards.newBadge && (
              <RewardTile value="01" label="New badge" color="text-ochre" />
            )}
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-auto mb-7 w-full">
          <button
            type="button"
            onClick={onSeeWhatsNew ?? onClose}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-ochre py-4 font-body text-base font-bold text-ink active:scale-[0.98]"
          >
            Show me what&apos;s new
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 w-full py-2.5 font-body text-sm font-semibold text-bg/60"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

function RewardTile({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] py-3.5 text-center backdrop-blur-sm">
      <div className={`font-display text-[28px] font-bold tracking-[-0.03em] ${color}`}>
        {value}
      </div>
      <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-bg/55">
        {label}
      </div>
    </div>
  );
}
