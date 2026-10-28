"use client";

import type { ReactNode } from "react";

/**
 * A speech bubble with a small tail pointing at its speaker. `side` is the side of the bubble
 * the tail sits on ("right" = the speaker is to the right of the bubble).
 */
export interface SpeechBubbleProps {
  children: ReactNode;
  tail: "left" | "right";
  tone?: "partner" | "you";
  /** Tailwind max-height utility; the bubble scrolls past it. */
  maxHeightClass?: string;
  live?: boolean;
  label?: string;
  className?: string;
}

export function SpeechBubble({ children, tail, tone = "partner", maxHeightClass = "", live = false, label, className = "" }: SpeechBubbleProps) {
  const bg = tone === "you" ? "bg-primary-soft border-primary/30" : "bg-surface border-line";
  return (
    <div className={`relative min-w-0 ${className}`}>
      <div
        aria-live={live ? "polite" : undefined}
        aria-label={label}
        className={`overflow-y-auto rounded-2xl border px-3.5 py-2.5 font-body text-sm leading-6 text-ink shadow-soft ${bg} ${maxHeightClass}`}
      >
        {children}
      </div>
      <span
        aria-hidden
        className={`absolute top-5 h-3 w-3 rotate-45 border-line ${tone === "you" ? "border-primary/30 bg-primary-soft" : "bg-surface"} ${
          tail === "right" ? "-right-1.5 border-r border-t" : "-left-1.5 border-b border-l"
        }`}
      />
    </div>
  );
}
