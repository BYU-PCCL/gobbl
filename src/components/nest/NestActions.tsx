"use client";

import Link from "next/link";
import type { ModuleConfig, ModuleStep } from "@/lib/modules/types";

type Phase = 0 | 1 | 2 | 3;

const CARDS: { title: string; eyebrow: (min: number) => string; blurb: string }[] = [
  { title: "Learn", eyebrow: (m) => `Library · ${m} min`, blurb: "Read it together." },
  { title: "Teach", eyebrow: () => "School", blurb: "Quiz your turkey." },
  { title: "Practice", eyebrow: () => "Playground", blurb: "Talk it out." },
  { title: "Reflect", eyebrow: () => "Journal", blurb: "Write what you noticed." },
];

/**
 * Phase by position, not by kind: Learn = everything before the quiz, Teach = the quiz, Practice = from the quiz
 * up to the practice conversation, Reflect = anything after it. (Some modules put a reflection inside Learn.)
 */
function phaseOf(steps: ModuleStep[], stepId: string): Phase {
  const idx = steps.findIndex((s) => s.id === stepId);
  if (idx < 0) return 0;
  const quizIdx = steps.findIndex((s) => s.kind === "quiz");
  const practiceIdx = steps.findIndex((s) => s.kind === "practice");
  if (quizIdx >= 0 && idx < quizIdx) return 0;
  if (idx === quizIdx) return 1;
  if (practiceIdx >= 0 && idx <= practiceIdx) return 2;
  if (quizIdx < 0 && practiceIdx < 0) return steps[idx].kind === "reflection" ? 3 : 0;
  return 3;
}

/** Current phase from the session's step id; null stage (no session) starts at Learn. */
export function currentPhase(mod: ModuleConfig, stage: string | null | undefined, variantKey?: string | null): Phase | "complete" {
  if (!stage) return 0;
  if (stage === "complete") return "complete";
  const variant = mod.variants.find((v) => v.key === variantKey) ?? mod.variants[0];
  return phaseOf(variant.steps, stage);
}

export function NestActions({ mod, stage, variantKey }: { mod: ModuleConfig; stage: string | null | undefined; variantKey?: string | null }) {
  const phase = currentPhase(mod, stage, variantKey);
  const href = `/skills/${mod.key}`;
  return (
    <section aria-label={`Current module: ${mod.title}`} className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-ink">{mod.title}</h2>
        <Link href="/skills" className="shrink-0 font-body text-xs font-semibold text-primary">All skills</Link>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {CARDS.map((c, i) => {
          const state = phase === "complete" ? "done" : i < phase ? "done" : i === phase ? "active" : "locked";
          const body = (
            <>
              <div className="eyebrow text-ink-muted">{c.eyebrow(mod.estimatedMinutes)}</div>
              <div className="mt-1.5 font-display text-lg font-bold tracking-[-0.02em] text-ink">{c.title}</div>
              <div className="mt-0.5 font-body text-xs text-ink-soft">{c.blurb}</div>
              <div
                className={`mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] ${
                  state === "active" ? "text-primary" : state === "done" ? "text-forest-fg" : "text-ink-muted"
                }`}
              >
                {state === "active" ? "Up next" : state === "done" ? "Done" : "Locked"}
              </div>
            </>
          );
          if (state === "locked") {
            return (
              <div key={c.title} aria-disabled="true" className="rounded-2xl border border-dashed border-line bg-surface-2 p-3.5 opacity-70">
                {body}
              </div>
            );
          }
          return (
            <Link
              key={c.title}
              href={href}
              className={`rounded-2xl border p-3.5 transition-colors ${
                state === "active"
                  ? "border-primary bg-primary-soft hover:border-ink-muted"
                  : "border-line bg-surface hover:border-ink-muted"
              }`}
            >
              {body}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
