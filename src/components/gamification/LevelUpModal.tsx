"use client";

import { useEffect, useRef } from "react";
import { MyTurkey } from "@/components/turkey/MyTurkey";
import type { TurkeyView } from "@/lib/flock/view";

interface LevelUpModalProps {
  open: boolean;
  fromLevel: number;
  toLevel: number;
  /** The user's selected turkey. Levelling up does not change it. */
  turkey: TurkeyView | null;
  /** Accepted for existing callers; not shown. */
  rewards?: {
    feathers: number;
  };
  onClose: () => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Level-up celebration overlay: a full-screen takeover with a glow, confetti dots and the
 * turkey. One button, "Keep going". Focus moves to it on open and stays inside the dialog.
 */
export function LevelUpModal({ open, fromLevel, toLevel, turkey, onClose }: LevelUpModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll while open, trap focus, close on Escape, and give focus back afterwards.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    buttonRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      const panel = panelRef.current;
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey, true);
      opener?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  // Deterministic confetti positions (avoid SSR mismatch + repaints)
  const confetti = Array.from({ length: 36 }).map((_, i) => {
    const x = (i * 37 + 7) % 100; // vw %
    const y = (i * 79 + 31) % 80; // vh %
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
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Level up"
      className="fixed inset-0 z-50 bg-ink text-bg animate-fade-in motion-reduce:animate-none"
    >
      {/* Radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 38%, rgba(228,165,71,0.35), rgba(192,70,28,0.18) 30%, transparent 60%)",
        }}
      />
      {/* Confetti */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((c, i) => (
          <div
            key={i}
            className={`absolute opacity-85 ${c.c} ${c.sizeClass}`}
            style={{ left: c.left, top: c.top, transform: c.transform }}
          />
        ))}
      </div>

      <div className="relative mx-auto flex h-full max-w-md flex-col items-center overflow-y-auto px-6 pb-[max(env(safe-area-inset-bottom),1.75rem)] pt-16 sm:pt-20">
        <div className="font-mono text-xs uppercase tracking-[0.24em] text-ochre">Level up</div>
        <h1 className="mt-3 text-center font-display text-[50px] font-extrabold leading-[0.95] tracking-[-0.04em]">
          You reached
          <br />
          <span className="italic text-ochre">level {toLevel}</span>.
        </h1>
        <p className="mt-1.5 text-center font-body text-sm text-bg/75">
          Keep going. Some shop items open at higher levels.
        </p>

        {/* Turkey transition */}
        <div className="mt-8 flex items-center justify-center gap-6">
          <div className="text-center opacity-60">
            <div className="font-mono text-xs uppercase tracking-[0.1em] text-bg/70">Level {fromLevel}</div>
          </div>
          <svg width="28" height="14" viewBox="0 0 28 14" fill="none" aria-hidden>
            <path
              d="M2 7h22M20 2l5 5-5 5"
              stroke="rgb(228 165 71)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="text-center glow-ochre animate-level-pulse motion-reduce:animate-none">
            <MyTurkey turkey={turkey} size={150} inScene />
            <div className="mt-1 font-mono text-xs font-bold uppercase tracking-[0.1em] text-ochre">
              Level {toLevel}
            </div>
          </div>
        </div>

        <div className="mt-auto w-full pt-8">
          <button
            ref={buttonRef}
            type="button"
            onClick={onClose}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ochre py-4 font-body text-base font-bold text-ink active:scale-[0.98]"
          >
            Keep going
          </button>
        </div>
      </div>
    </div>
  );
}
