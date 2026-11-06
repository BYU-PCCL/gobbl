"use client";

import { useEffect, useState } from "react";
import type { CustomStepProps } from "../custom-steps";
import {
  CD_ISSUES,
  CD_ISSUE_QUESTION,
  getCdIssue,
  validateCdDiagnostic,
  type CdQuestion,
} from "@/lib/modules/cognitive-dissonance/survey";

interface Draft {
  issue?: string;
  prefs: Record<string, string | number>;
}

/** Continue is enabled once an issue is picked and every one of its questions is answered. */
export function isCdIssueSurveyComplete(value: unknown): boolean {
  return validateCdDiagnostic(value) !== null;
}

/**
 * Cognitive Dissonance diagnostic (custom step "cd-issue-survey"): the Qualtrics issue question
 * (QID19), then that issue's eight "Political Preferences" questions. Saved as
 * { issue, prefs: { pref1..pref8 } }; the chat route reads it to build the AI's participant profile.
 */
export function CdIssueSurvey({ value, onChange }: CustomStepProps) {
  const draft: Draft = (value as Draft | undefined) ?? { prefs: {} };
  const issue = getCdIssue(draft.issue);

  // Qualtrics shows the issue options in random order. Shuffled after mount so the first
  // render is stable.
  const [issueOrder, setIssueOrder] = useState(CD_ISSUES);
  useEffect(() => setIssueOrder(shuffle(CD_ISSUES)), []);

  const pickIssue = (key: string) => {
    if (key === draft.issue) return;
    onChange({ issue: key, prefs: {} }); // a different issue has different questions
  };
  const answer = (qKey: string, v: string | number) =>
    onChange({ ...draft, prefs: { ...draft.prefs, [qKey]: v } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-3 font-display text-base font-bold">{CD_ISSUE_QUESTION}</h2>
        <div className="flex flex-col gap-2">
          {issueOrder.map((i) => (
            <OptionButton key={i.key} selected={draft.issue === i.key} onClick={() => pickIssue(i.key)}>
              {i.label}
            </OptionButton>
          ))}
        </div>
      </div>

      {issue?.questions.map((q) => (
        <div key={`${issue.key}-${q.key}`}>
          <h2 className="mb-3 font-display text-base font-bold">{q.prompt}</h2>
          {q.kind === "choice" ? (
            <div className="flex flex-col gap-2">
              {q.options.map((opt) => (
                <OptionButton key={opt} selected={draft.prefs[q.key] === opt} onClick={() => answer(q.key, opt)}>
                  {opt}
                </OptionButton>
              ))}
            </div>
          ) : (
            <Slider question={q} value={draft.prefs[q.key]} onChange={(v) => answer(q.key, v)} />
          )}
        </div>
      ))}
    </div>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  // Same look as the built-in diagnostic options in skills/[key]/page.tsx.
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-colors ${
        selected ? "border-primary bg-primary-soft text-gobbl-700" : "border-line bg-surface text-ink hover:border-primary/50"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * 0-100 slider. Starts unanswered (thumb in the middle, no value saved) and counts as answered
 * once it is moved or clicked, like an untouched Qualtrics slider.
 */
function Slider({
  question,
  value,
  onChange,
}: {
  question: Extract<CdQuestion, { kind: "slider" }>;
  value: string | number | undefined;
  onChange: (v: number) => void;
}) {
  const answered = typeof value === "number";
  const commit = (raw: string) => onChange(Math.round(Number(raw)));
  return (
    <div className="rounded-xl border-2 border-line bg-surface px-4 py-3">
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={answered ? value : 50}
        onChange={(e) => commit(e.target.value)}
        // A click on the thumb without moving it fires no change event; still count it.
        onPointerUp={(e) => !answered && commit(e.currentTarget.value)}
        aria-label={question.prompt}
        className={`w-full accent-primary ${answered ? "" : "opacity-50"}`}
      />
      <div className="mt-1 flex justify-between gap-4 font-body text-xs text-ink-soft">
        <span>0: {question.minLabel}</span>
        <span className="text-right">100: {question.maxLabel}</span>
      </div>
      <p className="mt-2 text-center font-mono text-xs text-ink-muted">
        {answered ? `Your answer: ${value}` : "Move the slider to answer"}
      </p>
    </div>
  );
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
