"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { ACCOUNT_MISSING_CALLBACK_URL } from "@/lib/signOutReasons";
import { Button } from "@/components/ui/Button";
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

  const question = SURVEY_QUESTIONS[step];
  const isLast = step === SURVEY_QUESTIONS.length - 1;
  const currentAnswer = responses[question.key] ?? "";
  const canAdvance = isAnswerValid(question, currentAnswer);

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
        setError(data.error || "Could not save survey");
        setSubmitting(false);
        return;
      }
      await update({ onboardingCompletedAt: data.onboardingCompletedAt });
      window.location.href = "/onboarding/egg";
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-roost-50 px-4 py-16">
      <div className="w-full max-w-md">
        <header className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold text-roost-700">
            Quick intro
          </h1>
          <p className="mt-1 text-sm text-roost-500">
            A few questions before you start.
          </p>
        </header>

        <ProgressDots total={SURVEY_QUESTIONS.length} current={step} />

        <div className="mt-8">
          <h2 className="mb-4 font-display text-lg font-semibold text-roost-700">
            {question.prompt}
          </h2>
          <QuestionInput
            question={question}
            value={currentAnswer}
            onChange={setAnswer}
          />
        </div>

        {error && <p className="mt-4 text-sm text-plume-500">{error}</p>}

        <div className="mt-8 flex justify-between gap-3">
          <Button
            variant="secondary"
            disabled={step === 0 || submitting}
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </Button>
          <Button disabled={!canAdvance || submitting} onClick={handleNext}>
            {submitting ? "Saving..." : isLast ? "Finish" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full transition-colors ${
            i <= current ? "bg-gobbl-500" : "bg-roost-200"
          }`}
        />
      ))}
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  if (question.type === "single-choice") {
    return (
      <div className="flex flex-col gap-2">
        {question.options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-colors ${
                selected
                  ? "border-gobbl-500 bg-gobbl-500/10 text-gobbl-700"
                  : "border-roost-200 bg-white text-roost-700 hover:border-gobbl-300"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, question.maxLength))}
        maxLength={question.maxLength}
        rows={3}
        className="rounded-xl border-2 border-roost-200 bg-white px-md py-3 text-sm text-roost-700 focus:border-gobbl-500 focus:outline-none"
        placeholder="Type your answer…"
      />
      <span className="text-right text-xs text-roost-400">
        {value.length}/{question.maxLength}
      </span>
    </div>
  );
}
