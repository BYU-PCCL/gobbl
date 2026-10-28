"use client";

import { useCallback, useRef } from "react";
import { CATEGORIES, type Topic } from "@/lib/topics";
import { Button } from "@/components/ui/Button";

/**
 * Topic groups for the Playground and module practice: "Suggested for …" first, then by category,
 * plus a "Surprise me" button.
 */
export interface TopicPickerProps {
  topics: Topic[];
  /** Shown first under "Suggested for {suggestedLabel}"; omitted from its category group. */
  suggestedTopicId?: string | null;
  suggestedLabel?: string;
  value: string | null;
  onChange: (topicId: string) => void;
  className?: string;
}

export function TopicPicker({ topics, suggestedTopicId, suggestedLabel, value, onChange, className = "" }: TopicPickerProps) {
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const suggested = suggestedTopicId ? topics.find((t) => t.id === suggestedTopicId) : undefined;

  const surprise = useCallback(() => {
    const pool = topics.filter((t) => t.id !== value);
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    onChange(pick.id);
    const el = optionRefs.current[pick.id];
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, [topics, value, onChange]);

  const option = (t: Topic) => {
    const selected = t.id === value;
    return (
      <button
        key={t.id}
        ref={(el) => { optionRefs.current[t.id] = el; }}
        type="button"
        aria-pressed={selected}
        onClick={() => onChange(t.id)}
        className={`block w-full rounded-2xl border-2 px-4 py-3 text-left transition-colors ${
          selected ? "border-primary bg-primary-soft" : "border-line bg-surface hover:border-ink-muted"
        }`}
      >
        <span className="block font-display text-sm font-bold tracking-[-0.01em] text-ink">{t.title}</span>
        <span className="mt-0.5 block font-body text-xs text-ink-soft">{t.description}</span>
      </button>
    );
  };

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      <div className="flex justify-end">
        <Button type="button" variant="secondary" size="sm" onClick={surprise}>
          Surprise me
        </Button>
      </div>

      {suggested && (
        <section aria-label={suggestedLabel ? `Suggested for ${suggestedLabel}` : "Suggested"}>
          <h3 className="eyebrow mb-2">{suggestedLabel ? `Suggested for ${suggestedLabel}` : "Suggested"}</h3>
          <div className="flex flex-col gap-2">{option(suggested)}</div>
        </section>
      )}

      {CATEGORIES.map((cat) => {
        const list = topics.filter((t) => t.category === cat && t.id !== suggested?.id);
        if (list.length === 0) return null;
        return (
          <section key={cat} aria-label={cat}>
            <h3 className="eyebrow mb-2">{cat}</h3>
            <div className="flex flex-col gap-2">{list.map(option)}</div>
          </section>
        );
      })}
    </div>
  );
}
