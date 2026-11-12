"use client";

import { ButtonHTMLAttributes } from "react";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected/pressed state */
  selected?: boolean;
  tone?: "neutral" | "primary" | "forest" | "ochre";
  leadingIcon?: React.ReactNode;
}

/**
 * Pill-shaped chip used for difficulty selectors, smart-reply suggestions,
 * filter tabs, and other small one-tap selections.
 */
export function Chip({
  selected = false,
  tone = "neutral",
  leadingIcon,
  className = "",
  children,
  ...props
}: ChipProps) {
  const toneSelected = {
    neutral: "bg-ink text-bg border-ink",
    primary: "bg-primary text-white border-primary",
    forest:  "bg-forest-500 text-white border-forest-500",
    ochre:   "bg-ochre text-ink border-ochre",
  }[tone];

  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`relative inline-flex items-center gap-1.5 rounded-full border px-3.5 h-9
        font-body text-[13px] font-semibold whitespace-nowrap
        after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']
        transition-[background-color,color,border-color] duration-150
        active:scale-[0.97]
        ${selected
          ? toneSelected
          : "bg-surface text-ink-soft border-line hover:border-ink-muted hover:text-ink"}
        ${className}`}
      {...props}
    >
      {leadingIcon && <span className="-ml-0.5">{leadingIcon}</span>}
      {children}
    </button>
  );
}
