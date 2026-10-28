"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Companion } from "@/components/companion/Companion";
import type { SpeciesId } from "@/lib/companion";
import type { QuizQuestion } from "@/lib/quizzes";
import type { EquippedCosmetics } from "@/lib/shop";

export interface QuizStepProps {
  questions: QuizQuestion[];
  speciesId: SpeciesId | null;
  level: number;
  hatched: boolean;
  equipped?: EquippedCosmetics | null;
  /**
   * Submits one chosen option index per question. Resolves "failed" when the quiz was not passed
   * (this view then offers a retry); on a pass the runner takes over, so any other value is ignored.
   */
  onSubmit: (answer: number[]) => Promise<"failed" | "other">;
  busy: boolean;
  onBack: () => void;
}

/** "Teach": the turkey asks each question in its bubble; the user taps one of four options. */
export function QuizStep({ questions, speciesId, level, hatched, equipped, onSubmit, busy, onBack }: QuizStepProps) {
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [failed, setFailed] = useState(false);

  const q = questions[index];
  const picked = picks[index];
  const isLast = index === questions.length - 1;

  function reset() {
    setIndex(0);
    setPicks([]);
    setLocked(false);
    setFailed(false);
  }

  async function next() {
    if (!isLast) {
      setIndex(index + 1);
      setLocked(false);
      return;
    }
    const res = await onSubmit(picks);
    if (res === "failed") setFailed(true);
  }

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <Companion
          variant="scene"
          speciesId={speciesId}
          level={level}
          hatched={hatched}
          equipped={equipped}
          line="Not quite. Read it again together?"
        />
        <div className="flex w-full flex-col gap-2.5">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" onClick={onBack}>
            Back to the Nest
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Companion variant="scene" speciesId={speciesId} level={level} hatched={hatched} equipped={equipped} line={q.q} />
      <p className="text-center font-mono text-[10px] uppercase tracking-wider text-ink-muted">
        Question {index + 1} of {questions.length}
      </p>
      <div className="flex flex-col gap-2">
        {q.options.map((opt, i) => {
          const isAnswer = i === q.answer;
          const isPicked = picked === i;
          let style = "border-line bg-surface text-ink hover:border-primary/50";
          if (locked) {
            if (isAnswer) style = "border-forest-fg bg-forest-soft text-forest-fg";
            else if (isPicked) style = "border-ochre bg-ochre-soft text-ink";
            else style = "border-line bg-surface text-ink-muted";
          }
          return (
            <button
              key={i}
              type="button"
              disabled={locked}
              aria-pressed={isPicked}
              onClick={() => {
                const nextPicks = [...picks];
                nextPicks[index] = i;
                setPicks(nextPicks);
                setLocked(true);
              }}
              className={`rounded-xl border-2 px-4 py-3 text-left font-body text-sm font-semibold transition-colors ${style}`}
            >
              {opt}
              {locked && isAnswer && <span className="sr-only"> (correct)</span>}
              {locked && isPicked && !isAnswer && <span className="sr-only"> (your answer, not correct)</span>}
            </button>
          );
        })}
      </div>
      {locked && (
        <div className="flex flex-col gap-3">
          <p className="rounded-xl bg-surface-2 px-4 py-3 font-body text-sm text-ink-soft">
            <span className="eyebrow mr-2">{picked === q.answer ? "Right" : "Not quite"}</span>
            {q.why}
          </p>
          <Button onClick={next} disabled={busy} loading={busy}>
            {isLast ? "Finish" : "Next"}
          </Button>
        </div>
      )}
    </div>
  );
}
