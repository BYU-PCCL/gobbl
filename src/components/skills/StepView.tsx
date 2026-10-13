"use client";

import { CUSTOM_STEPS } from "@/components/skills/custom-steps";
import type { ModuleStep } from "@/lib/modules/types";
import { isAnswerValid } from "@/lib/survey/questions";

/*
 * How the module runner shows a non-chat step and decides when it's done. Shared with
 * Module Studio's preview so authors see exactly what learners will.
 */

export function isStepComplete(step: ModuleStep, answers: Record<string, string>, customValue: unknown): boolean {
  if (step.kind === "custom") {
    const def = CUSTOM_STEPS[step.component];
    if (!def) return false;
    return def.isComplete ? def.isComplete(customValue) : true;
  }
  if (step.kind === "diagnostic") {
    return step.questions.every((q) => isAnswerValid(q, answers[q.key]));
  }
  if (step.kind === "reflection") {
    const text = answers.text ?? "";
    return text.trim().length > 0 && text.length <= step.maxLength;
  }
  return true;
}

export function answerPayload(step: ModuleStep, answers: Record<string, string>, customValue: unknown): unknown {
  if (step.kind === "custom") return customValue;
  if (step.kind === "diagnostic") return answers;
  if (step.kind === "reflection") return answers.text ?? "";
  return null;
}

export function StepView({
  step,
  answers,
  onChange,
  customValue,
  onCustomChange,
}: {
  step: ModuleStep;
  answers: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  customValue: unknown;
  onCustomChange: (next: unknown) => void;
}) {
  if (step.kind === "custom") {
    const def = CUSTOM_STEPS[step.component];
    if (!def) {
      // A typo in registry.ts, or a component that was never added to CUSTOM_STEPS.
      return (
        <p className="font-body text-sm text-plume-500">
          This step couldn&apos;t be shown (unknown component &quot;{step.component}&quot;).
        </p>
      );
    }
    return <def.Component props={step.props ?? {}} value={customValue} onChange={onCustomChange} />;
  }

  if (step.kind === "diagnostic") {
    return (
      <div className="flex flex-col gap-6">
        {step.questions.map((q) => (
          <div key={q.key}>
            <h2 className="mb-3 font-display text-base font-bold">{q.prompt}</h2>
            {q.type === "single-choice" && (
              <div className="flex flex-col gap-2">
                {q.options.map((opt) => {
                  const selected = answers[q.key] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onChange({ ...answers, [q.key]: opt.value })}
                      className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-colors ${
                        selected
                          ? "border-primary bg-primary-soft text-gobbl-700"
                          : "border-line bg-surface text-ink hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (step.kind === "content") {
    return (
      <div className="flex flex-col gap-4">
        {step.blocks.map((block, i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="font-display text-base font-bold">{block.heading}</h2>
            <p className="mt-1.5 font-body text-sm text-ink-soft">{block.body}</p>
          </div>
        ))}
      </div>
    );
  }

  if (step.kind === "practice") {
    return (
      <div className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-display text-base font-bold">Practice conversation</h2>
        <p className="mt-1.5 font-body text-sm text-ink-soft">
          Topic: {step.topic} — Difficulty: {step.difficulty}
        </p>
      </div>
    );
  }

  // reflection
  const text = answers.text ?? "";
  return (
    <div className="flex flex-col gap-1">
      <h2 className="mb-1 font-display text-base font-bold">{step.prompt}</h2>
      <textarea
        value={text}
        onChange={(e) => onChange({ ...answers, text: e.target.value.slice(0, step.maxLength) })}
        maxLength={step.maxLength}
        rows={4}
        className="rounded-xl border-2 border-line bg-surface px-4 py-3 text-sm text-ink focus:border-primary focus:outline-none"
        placeholder="Type your answer…"
      />
      <span className="text-right font-mono text-[10px] text-ink-muted">
        {text.length}/{step.maxLength}
      </span>
    </div>
  );
}
