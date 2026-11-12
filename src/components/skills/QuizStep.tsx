"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Companion } from "@/components/companion/Companion";
import { LessonBlocks, type LessonBlock } from "@/components/skills/LessonBlocks";
import { RadioOptions } from "@/components/skills/RadioOptions";
import type { TurkeyView } from "@/lib/flock/view";
import type { QuizQuestion } from "@/lib/quizzes";

/** One question's outcome from a failed quiz submission. */
export interface QuizResult {
  correct: boolean;
  why: string;
}

export type QuizSubmitOutcome = { kind: "failed"; results: QuizResult[] } | { kind: "other" };

export interface QuizStepProps {
  questions: QuizQuestion[];
  turkey: TurkeyView | null;
  /**
   * Submits one chosen option index per question. Resolves "failed" (with the per-question results)
   * when the quiz was not passed; on a pass the runner takes over, so any other value is ignored.
   */
  onSubmit: (answer: number[]) => Promise<QuizSubmitOutcome>;
  busy: boolean;
  /** Pass mark: correct answers needed. */
  passScore: number;
  /** The lesson's content blocks, shown read-only by "Read the lesson again". */
  lessonBlocks: LessonBlock[];
}

type Mode = "quiz" | "fail" | "review";

/** "Teach": the turkey asks each question in its bubble; the user selects one of four options, then checks it. */
export function QuizStep({ questions, turkey, onSubmit, busy, passScore, lessonBlocks }: QuizStepProps) {
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [mode, setMode] = useState<Mode>("quiz");
  const [failure, setFailure] = useState<{ results: QuizResult[]; picks: number[] } | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const q = questions[index];
  const picked = picks[index];
  const isLast = index === questions.length - 1;
  const gotCount = failure ? failure.results.filter((r) => r.correct).length : 0;
  const scoreLine = failure
    ? `You got ${gotCount} of ${questions.length}. You need ${passScore} to pass.`
    : "";

  // After checking, bring the answer's feedback and the Next button into view on small screens.
  useEffect(() => {
    if (locked) feedbackRef.current?.scrollIntoView({ block: "nearest" });
  }, [locked, index]);

  function reset() {
    setIndex(0);
    setPicks([]);
    setLocked(false);
    setFailure(null);
    setMode("quiz");
    window.scrollTo({ top: 0 });
  }

  async function next() {
    if (!isLast) {
      setIndex(index + 1);
      setLocked(false);
      return;
    }
    const res = await onSubmit(picks);
    if (res.kind === "failed") {
      setFailure({ results: res.results, picks });
      setMode("fail");
      window.scrollTo({ top: 0 });
    }
  }

  // Persistent: announces the fail result when its text changes (a region mounted with its text is often missed).
  const live = (
    <p role="status" aria-live="polite" className="sr-only">
      {mode === "fail" ? scoreLine : ""}
    </p>
  );

  if (mode === "review") {
    return (
      <div className="flex flex-col gap-4">
        {live}
        <p className="font-body text-sm text-ink-soft">The lesson again. Nothing here changes your progress.</p>
        <LessonBlocks blocks={lessonBlocks} />
        <Button size="lg" onClick={reset}>
          Back to the quiz
        </Button>
      </div>
    );
  }

  if (mode === "fail" && failure) {
    return (
      <div className="flex flex-col gap-4">
        {live}
        <Companion variant="scene" turkey={turkey} line="Not quite yet. Let's look at what tripped you up." />
        <p className="text-center font-display text-lg font-bold text-ink">{scoreLine}</p>
        <ol className="flex flex-col gap-3">
          {questions.map((question, i) => {
            const r = failure.results[i];
            const pick = failure.picks[i];
            return (
              <li key={i} className="rounded-2xl border border-line bg-surface p-4">
                <p className="font-body text-sm font-semibold text-ink">
                  <span className="mr-2 text-ink-muted">{i + 1}.</span>
                  {question.q}
                </p>
                <p
                  className={`mt-2 font-body text-sm font-semibold ${r?.correct ? "text-forest-fg" : "text-danger"}`}
                >
                  {r?.correct ? "Right" : "Missed"}
                </p>
                <p className="mt-1 font-body text-sm text-ink-soft">
                  You picked: <span className="font-semibold text-ink">{question.options[pick] ?? "No answer"}</span>
                </p>
                {!r?.correct && (
                  <>
                    <p className="mt-1 font-body text-sm text-ink-soft">
                      Correct answer: <span className="font-semibold text-ink">{question.options[question.answer]}</span>
                    </p>
                    <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 font-body text-sm text-ink-soft">{r?.why ?? question.why}</p>
                  </>
                )}
              </li>
            );
          })}
        </ol>
        <div className="flex flex-col gap-2.5">
          {lessonBlocks.length > 0 && (
            <Button size="lg" onClick={() => setMode("review")}>
              Read the lesson again
            </Button>
          )}
          <Button size="lg" variant={lessonBlocks.length > 0 ? "outline" : "primary"} onClick={reset}>
            Try the quiz again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {live}
      <Companion variant="scene" turkey={turkey} line={q.q} />
      <p className="text-center font-mono text-xs uppercase tracking-wider text-ink-muted">
        Question {index + 1} of {questions.length}
      </p>
      <RadioOptions
        label={q.q}
        disabled={locked}
        value={picked === undefined ? undefined : String(picked)}
        onChange={(v) => {
          const nextPicks = [...picks];
          nextPicks[index] = Number(v);
          setPicks(nextPicks);
        }}
        options={q.options.map((opt, i) => {
          const isAnswer = i === q.answer;
          const isPicked = picked === i;
          return {
            value: String(i),
            label: opt,
            state: !locked ? "idle" : isAnswer ? "correct" : isPicked ? "wrong" : "dim",
            srNote: locked
              ? isAnswer
                ? "(correct)"
                : isPicked
                  ? "(your answer, not correct)"
                  : undefined
              : undefined,
          };
        })}
      />
      {!locked ? (
        <Button size="lg" onClick={() => setLocked(true)} disabled={picked === undefined}>
          Check
        </Button>
      ) : (
        <div ref={feedbackRef} className="flex flex-col gap-3">
          <p role="status" className="rounded-xl bg-surface-2 px-4 py-3 font-body text-sm text-ink-soft">
            <span className="eyebrow mr-2">{picked === q.answer ? "Right" : "Not quite"}</span>
            {q.why}
          </p>
          <Button size="lg" onClick={next} disabled={busy} loading={busy}>
            {isLast ? "Finish" : "Next"}
          </Button>
        </div>
      )}
      {!locked && picked === undefined && (
        <p className="text-center font-body text-xs text-ink-muted">Pick an answer, then check it.</p>
      )}
    </div>
  );
}
