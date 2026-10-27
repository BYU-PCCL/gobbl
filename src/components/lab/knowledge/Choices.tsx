"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { ChoiceQuestion } from "@/lib/knowledge/content";

/**
 * One multiple-choice question at a time. Picking an answer moves on by itself after a
 * beat, so a short survey feels light. Reports each answer as it's given.
 */
export function QuestionSeries({
  questions,
  answers,
  onAnswer,
  onComplete,
}: {
  questions: ChoiceQuestion[];
  answers: Record<string, string>;
  onAnswer: (key: string, label: string) => void;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const q = questions[index];

  function pick(label: string) {
    onAnswer(q.key, label);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (index === questions.length - 1) onComplete();
      else setIndex(index + 1);
    }, 260);
  }

  return (
    <div key={q.key} className="animate-slide-up">
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        {index > 0 && (
          <button type="button" onClick={() => setIndex(index - 1)} className="flex items-center gap-1 hover:text-ink">
            <Icon name="arrow-left" size={12} />
            Back
          </button>
        )}
      </div>
      <h2 className="font-display text-xl font-bold leading-snug tracking-[-0.02em] sm:text-2xl">{q.prompt}</h2>
      <div className="mt-5 flex flex-col gap-2.5">
        {q.options.map((label) => {
          const selected = answers[q.key] === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => pick(label)}
              className={`flex items-center justify-between rounded-2xl border-2 px-4 py-3.5 text-left font-body text-sm font-semibold transition-colors ${
                selected
                  ? "border-primary bg-primary-soft text-gobbl-700"
                  : "border-line bg-surface text-ink hover:border-primary/50"
              }`}
            >
              <span>{label}</span>
              {selected && <Icon name="check" size={16} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Pick several options, optionally up to a limit. One option can be "exclusive" (e.g. "none of these"). */
export function PickMany({
  prompt,
  help,
  options,
  max,
  exclusive,
  value,
  onChange,
  onContinue,
  continueLabel = "Continue",
}: {
  prompt: string;
  help?: string;
  options: string[];
  max?: number;
  /** Choosing this clears everything else, and choosing anything else clears it. */
  exclusive?: string;
  value: string[];
  onChange: (next: string[]) => void;
  onContinue: () => void;
  continueLabel?: string;
}) {
  function toggle(label: string) {
    if (value.includes(label)) {
      onChange(value.filter((v) => v !== label));
      return;
    }
    if (label === exclusive) {
      onChange([label]);
      return;
    }
    const without = exclusive ? value.filter((v) => v !== exclusive) : value;
    if (max !== undefined && without.length >= max) return;
    onChange([...without, label]);
  }

  const atLimit = max !== undefined && value.filter((v) => v !== exclusive).length >= max;

  return (
    <div className="animate-slide-up">
      <h2 className="font-display text-xl font-bold leading-snug tracking-[-0.02em] sm:text-2xl">{prompt}</h2>
      {help && <p className="mt-1.5 font-body text-sm text-ink-soft">{help}</p>}
      <div className="mt-5 flex flex-col gap-2">
        {options.map((label) => {
          const selected = value.includes(label);
          const blocked = !selected && label !== exclusive && atLimit;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={selected}
              disabled={blocked}
              onClick={() => toggle(label)}
              className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left font-body text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                selected
                  ? "border-primary bg-primary-soft text-gobbl-700"
                  : "border-line bg-surface text-ink hover:border-primary/50"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                  selected ? "border-primary bg-primary text-white" : "border-line"
                }`}
              >
                {selected && <Icon name="check" size={12} strokeWidth={3} />}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-6 flex items-center gap-3">
        <Button disabled={value.length === 0} onClick={onContinue}>
          {continueLabel}
        </Button>
        {max !== undefined && (
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
            {value.filter((v) => v !== exclusive).length}/{max} picked
          </span>
        )}
      </div>
    </div>
  );
}

/** A short free-text answer that can be skipped. */
export function OptionalNote({
  prompt,
  help,
  placeholder,
  maxLength,
  skipLabel,
  value,
  onChange,
  onContinue,
  onSkip,
}: {
  prompt: string;
  help?: string;
  placeholder?: string;
  maxLength: number;
  skipLabel: string;
  value: string;
  onChange: (next: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="animate-slide-up">
      <h2 className="font-display text-xl font-bold leading-snug tracking-[-0.02em] sm:text-2xl">{prompt}</h2>
      {help && <p className="mt-1.5 font-body text-sm text-ink-soft">{help}</p>}
      <textarea
        value={value}
        rows={5}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-5 w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 font-body text-sm text-ink focus:border-primary focus:outline-none"
      />
      <div className="mt-1 text-right font-mono text-[10px] text-ink-muted">
        {value.length}/{maxLength}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button disabled={value.trim().length === 0} onClick={onContinue}>
          Continue
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          {skipLabel}
        </Button>
      </div>
    </div>
  );
}
