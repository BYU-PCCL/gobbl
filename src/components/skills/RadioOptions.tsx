"use client";

import { useRef, type KeyboardEvent } from "react";

export type OptionState = "idle" | "correct" | "wrong" | "dim";

export interface RadioOption {
  value: string;
  label: string;
  /** Visual result after a quiz answer is checked. */
  state?: OptionState;
  /** Read by screen readers after the label, e.g. "(correct)". */
  srNote?: string;
}

const STATE_STYLE: Record<OptionState, string> = {
  idle: "",
  correct: "border-forest-fg bg-forest-soft text-forest-fg",
  wrong: "border-ochre bg-ochre-soft text-ink",
  dim: "border-line bg-surface text-ink-muted",
};

/** A group of single-choice answers with radio semantics and arrow-key movement. */
export function RadioOptions({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: RadioOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const hasValue = value !== undefined && options.some((o) => o.value === value);

  function onKeyDown(e: KeyboardEvent, i: number) {
    if (disabled) return;
    let to = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") to = (i + 1) % options.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") to = (i - 1 + options.length) % options.length;
    if (to < 0) return;
    e.preventDefault();
    onChange(options[to].value);
    refs.current[to]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      {options.map((opt, i) => {
        const checked = value === opt.value;
        const state = opt.state ?? "idle";
        const style =
          state !== "idle"
            ? STATE_STYLE[state]
            : checked
              ? "border-primary bg-primary-soft text-ink"
              : "border-line bg-surface text-ink hover:border-primary/50";
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={disabled}
            tabIndex={checked || (!hasValue && i === 0) ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`min-h-11 rounded-xl border-2 px-4 py-3 text-left font-body text-sm font-semibold transition-colors ${style}`}
          >
            {opt.label}
            {opt.srNote && <span className="sr-only"> {opt.srNote}</span>}
          </button>
        );
      })}
    </div>
  );
}
