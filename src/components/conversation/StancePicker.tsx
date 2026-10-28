"use client";

import type { Stance } from "@/lib/conversation";

/**
 * "Where do you land?" — two large For/Against options shown after a topic is chosen.
 */
export interface StancePickerProps {
  /** The topic's yes/no question, shown above the options. */
  question: string;
  value: Stance | null;
  onChange: (stance: Stance) => void;
  className?: string;
}

const OPTIONS: { key: Stance; label: string; note: string }[] = [
  { key: "for", label: "For", note: "Yes, I agree" },
  { key: "against", label: "Against", note: "No, I disagree" },
];

export function StancePicker({ question, value, onChange, className = "" }: StancePickerProps) {
  return (
    <div className={className}>
      <h2 className="font-display text-xl font-bold tracking-[-0.02em]">Where do you land?</h2>
      <p className="mt-1 font-body text-sm text-ink-soft">{question}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {OPTIONS.map((o) => {
          const selected = value === o.key;
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(o.key)}
              className={`flex min-h-[88px] flex-col items-center justify-center rounded-2xl border-2 px-4 py-4 text-center transition-colors ${
                selected ? "border-primary bg-primary-soft" : "border-line bg-surface hover:border-ink-muted"
              }`}
            >
              <span className="font-display text-2xl font-bold tracking-[-0.03em] text-ink">{o.label}</span>
              <span className="mt-1 font-body text-xs text-ink-soft">{o.note}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
