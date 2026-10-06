"use client";

import { useState } from "react";
import type { CustomStepProps } from "./custom-steps";

interface QuizQuestion {
  prompt: string;
  options: { label: string; correct: boolean }[];
  explanation: string;
}

/** What this step saves (see CUSTOM_STEPS: `complete` is what turns Continue on). */
export interface QuizValue {
  /** One entry per question: what they picked and whether it was right. Null until answered. */
  answers: ({ chosen: number; correct: boolean } | null)[];
  /** How many times they picked an answer for each question, including wrong tries. */
  attempts: number[];
  complete: boolean;
}

/** Steps come from plain JSON, so don't trust the shape. */
function parseQuestions(raw: unknown): QuizQuestion[] {
  if (!Array.isArray(raw)) return [];
  const questions: QuizQuestion[] = [];
  for (const q of raw) {
    if (!q || typeof q !== "object" || !Array.isArray(q.options)) continue;
    const options = q.options
      .filter((o: unknown): o is { label: string; correct?: boolean } =>
        !!o && typeof o === "object" && typeof (o as { label?: unknown }).label === "string")
      .map((o: { label: string; correct?: boolean }) => ({ label: o.label, correct: o.correct === true }));
    if (options.length < 2) continue;
    questions.push({
      prompt: typeof q.prompt === "string" ? q.prompt : "",
      options,
      explanation: typeof q.explanation === "string" ? q.explanation : "",
    });
  }
  return questions;
}

export function isQuizComplete(value: unknown): boolean {
  return (value as QuizValue | undefined)?.complete === true;
}

/**
 * A multiple-choice quiz. Each question has one right answer. After answering, the learner
 * sees whether they were right, the right answer and the explanation before moving on.
 *
 * props: { questions: { prompt, options: { label, correct }[], explanation }[],
 *          mustAnswerCorrectly?: boolean }
 *
 * With mustAnswerCorrectly, a wrong pick doesn't count and doesn't reveal the answer; they
 * try again until it's right.
 */
export function QuizStep({ props, value, onChange }: CustomStepProps) {
  const questions = parseQuestions(props.questions);
  const mustBeCorrect = props.mustAnswerCorrectly === true;
  const current: QuizValue = (value as QuizValue | undefined) ?? {
    answers: questions.map(() => null),
    attempts: questions.map(() => 0),
    complete: false,
  };
  const [retry, setRetry] = useState<Record<number, boolean>>({});

  function choose(qi: number, oi: number) {
    if (current.answers[qi]) return;
    const correct = questions[qi].options[oi].correct;
    const attempts = [...current.attempts];
    attempts[qi] = (attempts[qi] ?? 0) + 1;

    if (!correct && mustBeCorrect) {
      setRetry((r) => ({ ...r, [qi]: true }));
      onChange({ ...current, attempts });
      return;
    }

    const answers = [...current.answers];
    answers[qi] = { chosen: oi, correct };
    setRetry((r) => ({ ...r, [qi]: false }));
    onChange({ answers, attempts, complete: answers.every((a) => a !== null) });
  }

  if (questions.length === 0) {
    return <p className="font-body text-sm text-ink-muted">This quiz has no questions yet.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {questions.map((q, qi) => {
        const answer = current.answers[qi];
        const rightIndex = q.options.findIndex((o) => o.correct);
        return (
          <div key={qi}>
            <h2 className="mb-3 font-display text-base font-bold">{q.prompt}</h2>
            <div className="flex flex-col gap-2">
              {q.options.map((o, oi) => {
                const chosen = answer?.chosen === oi;
                const showRight = !!answer && oi === rightIndex;
                const showWrong = !!answer && chosen && !answer.correct;
                const style = showRight
                  ? "border-forest-500 bg-forest-100 text-forest-700"
                  : showWrong
                    ? "border-plume-500 bg-plume-100 text-plume-700"
                    : "border-line bg-surface text-ink hover:border-primary/50";
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={!!answer}
                    onClick={() => choose(qi, oi)}
                    className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-colors ${style}`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            {retry[qi] && !answer && (
              <p className="mt-2 font-body text-sm text-plume-500">Not quite — try again.</p>
            )}
            {answer && (
              <div className="mt-2 rounded-xl bg-bg px-3.5 py-2.5 font-body text-sm">
                <p className="font-semibold">
                  {answer.correct ? "Correct!" : `Not quite. The right answer is: ${q.options[rightIndex]?.label}`}
                </p>
                {q.explanation && <p className="mt-1 text-ink-soft">{q.explanation}</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
