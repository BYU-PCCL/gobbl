"use client";

import { useEffect, useId, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { ACCOUNT_MISSING_CALLBACK_URL } from "@/lib/signOutReasons";
import { Button } from "@/components/ui/Button";
import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";
import {
  SURVEY_QUESTIONS,
  isAnswerValid,
  type SurveyQuestion,
} from "@/lib/survey/questions";

export default function OnboardingSurveyPage() {
  const { update } = useSession();
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const headingId = useId();

  const question = SURVEY_QUESTIONS[step];
  const isLast = step === SURVEY_QUESTIONS.length - 1;
  const currentAnswer = responses[question.key] ?? "";
  const canAdvance = isAnswerValid(question, currentAnswer);

  // Move focus to the new question and start at the top when the step changes.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [step]);

  function setAnswer(value: string) {
    setResponses((prev) => ({ ...prev, [question.key]: value }));
  }

  async function handleNext() {
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses }),
      });
      if (res.status === 401 || res.status === 404) {
        // The session's user no longer exists; clear the cookie rather than show an error.
        await signOut({ callbackUrl: ACCOUNT_MISSING_CALLBACK_URL });
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError("We could not save your answers. Please try again.");
        setSubmitting(false);
        return;
      }
      await update({ onboardingCompletedAt: data.onboardingCompletedAt });
      window.location.href = "/flock";
    } catch {
      setError("Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2">
          <TurkeyCharacter stage={5} size={28} crop="head" decorative />
          <span className="font-display text-2xl font-bold tracking-[-0.04em] text-ink">Gobbl</span>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="inline-flex h-11 items-center rounded-full px-4 font-body text-sm font-medium text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
        >
          Sign out
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <p className="font-display text-display-md text-ink">Quick intro</p>
            <p className="mt-1 font-body text-sm text-ink-soft">
              A few questions before you start.
            </p>
          </div>

          <Progress total={SURVEY_QUESTIONS.length} current={step} />

          <div key={step} className="mt-8 animate-fade-in">
            <h1
              id={headingId}
              ref={headingRef}
              tabIndex={-1}
              className="mb-4 font-display text-display-sm text-ink focus:outline-none"
            >
              {question.prompt}
            </h1>
            <QuestionInput
              question={question}
              labelledBy={headingId}
              value={currentAnswer}
              onChange={setAnswer}
            />
          </div>

          {error && (
            <p role="alert" className="mt-4 font-body text-sm text-danger">
              {error}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            {step === 0 ? (
              <span aria-hidden className="h-11 w-24" />
            ) : (
              <Button
                variant="secondary"
                disabled={submitting}
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </Button>
            )}
            <Button disabled={!canAdvance} loading={submitting} onClick={handleNext}>
              {isLast ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Progress({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        role="progressbar"
        aria-label="Survey progress"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current + 1}
        aria-valuetext={`Question ${current + 1} of ${total}`}
        className="flex gap-2"
      >
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            className={`h-2 w-2 rounded-full transition-colors ${
              i <= current ? "bg-primary" : "bg-line"
            }`}
          />
        ))}
      </div>
      <p className="font-body text-xs font-medium text-ink-soft">
        Question {current + 1} of {total}
      </p>
    </div>
  );
}

function QuestionInput({
  question,
  labelledBy,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  labelledBy: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // Every current question is single-choice; there is no free-text question to render.
  if (question.type !== "single-choice") return null;
  const options = question.options;

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const forward = e.key === "ArrowDown" || e.key === "ArrowRight";
    const idx = options.findIndex((o) => o.value === value);
    const next = (idx === -1 ? (forward ? 0 : options.length - 1) : idx + (forward ? 1 : -1) + options.length) % options.length;
    onChange(options[next].value);
    const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    buttons[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
      className="flex flex-col gap-2"
    >
      {options.map((opt, i) => {
        const selected = value === opt.value;
        // Roving tabindex: the selected option (or the first, when none is selected) is the tab stop.
        const tabStop = value ? selected : i === 0;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={tabStop ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={`min-h-12 rounded-xl border-2 px-4 py-3 text-left font-body text-base font-semibold text-ink transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${
              selected
                ? "border-primary bg-primary-soft"
                : "border-line bg-surface hover:border-ink-muted"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
