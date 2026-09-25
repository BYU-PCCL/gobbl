"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { FlatTurkey } from "@/components/gamification/FlatTurkey";
import { ChatInterface, type ChatMsg } from "@/components/chat/ChatInterface";
import { getModule } from "@/lib/modules/registry";
import type { ModuleStep } from "@/lib/modules/types";
import { isAnswerValid } from "@/lib/survey/questions";

interface ModuleProgressSummary {
  key: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  timesCompleted: number;
  progress: {
    sessionId: string;
    stage: string;
    variant: "standard" | "advanced";
    inProgress: boolean;
  } | null;
}

interface CompleteResult {
  completed: true;
  preCivility: number | null;
  postCivility: number | null;
  feathersEarned: number;
}

type RunnerPhase =
  | { kind: "loading" }
  | { kind: "load-error" }
  | { kind: "not-found" }
  | { kind: "intro"; summary: ModuleProgressSummary }
  | { kind: "step"; sessionId: string; step: ModuleStep }
  | { kind: "practice"; sessionId: string; step: ModuleStep; debateId: string; initialMessages: ChatMsg[] }
  | { kind: "complete"; result: CompleteResult };

const GENERIC_ERROR = "Something went wrong. Please try again.";

export default function ModuleRunnerPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const moduleKey = params.key as string;
  const moduleConfig = getModule(moduleKey);

  const [phase, setPhase] = useState<RunnerPhase>({ kind: "loading" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (status === "authenticated" && moduleConfig) {
      (async () => {
        const res = await fetch("/api/modules");
        if (!res.ok) throw new Error("load failed");
        const modules: ModuleProgressSummary[] = await res.json();
        const summary = modules.find((m) => m.key === moduleKey);
        if (!summary) {
          setPhase({ kind: "not-found" });
          return;
        }
        const progress = summary.progress;
        // Every step was done but the final "complete" call never landed (e.g. the network
        // dropped) — finish it now instead of dumping the user back on the intro screen.
        if (progress?.inProgress && progress.stage === "complete") {
          const done = await fetch(`/api/modules/${moduleKey}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: progress.sessionId }),
          });
          if (!done.ok) throw new Error("complete failed");
          setPhase({ kind: "complete", result: await done.json() });
          return;
        }
        setPhase(resumeStep(moduleConfig, summary) ?? { kind: "intro", summary });
      })().catch(() => setPhase({ kind: "load-error" }));
    }
  }, [status, moduleKey, moduleConfig, router]);

  if (!moduleConfig) {
    return <NotFoundView />;
  }

  const hasAdvancedVariant = moduleConfig.variants.some((v) => v.key === "advanced");

  async function post(path: string, body: unknown) {
    const res = await fetch(`/api/modules/${moduleKey}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  /** Runs one user action at a time; any failure shows a message instead of a broken screen. */
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  }

  /** Returns true if the failure was handled (caller should stop). */
  function handleFailure(r: { ok: boolean; status: number; data: { error?: string } }): boolean {
    if (r.ok) return false;
    if (r.status === 401) {
      router.push("/");
    } else if (r.status === 409) {
      // Our view of the run is out of date (second tab, double submit) — reload from the server.
      window.location.reload();
    } else {
      setError(r.data?.error || GENERIC_ERROR);
    }
    return true;
  }

  async function finalize(sessionId: string) {
    const r = await post("complete", { sessionId });
    if (handleFailure(r)) return;
    setPhase({ kind: "complete", result: r.data });
  }

  async function goToNextStep(sessionId: string, nextStep: ModuleStep | null) {
    if (!nextStep) {
      await finalize(sessionId);
      return;
    }
    setAnswers({});
    setPhase({ kind: "step", sessionId, step: nextStep });
  }

  function start(variant: "standard" | "advanced") {
    return run(async () => {
      const r = await post("start", { variant });
      if (handleFailure(r)) return;
      setAnswers({});
      // step is null when resuming a run whose last step was done but never finalized.
      if (!r.data.step) {
        await finalize(r.data.sessionId);
        return;
      }
      setPhase({ kind: "step", sessionId: r.data.sessionId, step: r.data.step });
    });
  }

  function enterPractice(sessionId: string, step: ModuleStep) {
    return run(async () => {
      const r = await post("advance", { sessionId, stepId: step.id });
      if (handleFailure(r)) return;
      const debateRes = await fetch(`/api/debates?id=${r.data.debateId}`);
      if (!debateRes.ok) {
        setError(GENERIC_ERROR);
        return;
      }
      const debate = await debateRes.json();
      const initialMessages: ChatMsg[] = debate.messages.map(
        (m: { role: string; content: string; civilityScore: number | null }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          civilityScore: m.civilityScore,
        })
      );
      setPhase({ kind: "practice", sessionId, step, debateId: r.data.debateId, initialMessages });
    });
  }

  function finishPractice(sessionId: string, step: ModuleStep) {
    return run(async () => {
      const r = await post("advance", { sessionId, stepId: step.id, action: "finish" });
      if (handleFailure(r)) return;
      await goToNextStep(sessionId, r.data.nextStep);
    });
  }

  function advance(sessionId: string, step: ModuleStep, answer: unknown) {
    if (step.kind === "practice") return enterPractice(sessionId, step);
    return run(async () => {
      const r = await post("advance", { sessionId, stepId: step.id, answer });
      if (handleFailure(r)) return;
      await goToNextStep(sessionId, r.data.nextStep);
    });
  }

  if (phase.kind === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <FlatTurkey stage={1} size="md" animate />
      </div>
    );
  }

  if (phase.kind === "not-found") {
    return <NotFoundView />;
  }

  if (phase.kind === "load-error") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="font-body text-sm text-ink-soft">Couldn&apos;t load this module.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  if (phase.kind === "intro") {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
            {phase.summary.estimatedMinutes} min
          </div>
          <h1 className="mt-1.5 font-display text-[28px] font-bold tracking-[-0.03em]">
            {phase.summary.title}
          </h1>
          <p className="mt-2 font-body text-sm text-ink-soft">{phase.summary.description}</p>
        </div>
        {phase.summary.timesCompleted > 0 ? (
          <div className="flex flex-col gap-2.5">
            <Button disabled={busy} onClick={() => start("standard")}>
              Try again
            </Button>
            {/* Only offer "Level up" when this module actually has a harder variant. */}
            {hasAdvancedVariant && (
              <Button variant="outline" disabled={busy} onClick={() => start("advanced")}>
                Level up
              </Button>
            )}
          </div>
        ) : (
          <Button disabled={busy} onClick={() => start("standard")}>
            Start
          </Button>
        )}
        {error && <p className="text-center font-body text-sm text-plume-500">{error}</p>}
      </div>
    );
  }

  if (phase.kind === "practice") {
    const maxTurns = (phase.step.kind === "practice" && phase.step.maxTurns) || 8;
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-line bg-surface px-4 py-2 font-body text-xs text-ink-soft">
          Practice conversation — {moduleConfig.title}
        </div>
        {error && (
          // The conversation already ended but recording it failed; without a retry the user is stuck here.
          <div className="flex items-center justify-between gap-3 border-b border-line bg-plume-100 px-4 py-2 font-body text-xs text-plume-700">
            <span>{error}</span>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => finishPractice(phase.sessionId, phase.step)}>
              Retry
            </Button>
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            debateId={phase.debateId}
            initialMessages={phase.initialMessages}
            maxTurns={maxTurns}
            onFinish={() => finishPractice(phase.sessionId, phase.step)}
          />
        </div>
      </div>
    );
  }

  if (phase.kind === "complete") {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <FlatTurkey stage={6} size="lg" />
        <h1 className="font-display text-2xl font-bold">Module complete!</h1>
        <p className="font-body text-sm text-ink-soft">
          +{phase.result.feathersEarned} feathers
          {(() => {
            const civility = phase.result.postCivility ?? phase.result.preCivility;
            return civility != null ? ` — civility ${Math.round(civility)}/10` : null;
          })()}
        </p>
        <Link href="/skills">
          <Button>Back to skills</Button>
        </Link>
      </div>
    );
  }

  const { sessionId, step } = phase;
  const canContinue = isStepComplete(step, answers);

  return (
    <div className="flex flex-col gap-5">
      <StepView step={step} answers={answers} onChange={setAnswers} />
      <Button
        disabled={!canContinue || busy}
        loading={busy}
        onClick={() => advance(sessionId, step, answerPayload(step, answers))}
      >
        {step.kind === "practice" ? "Start conversation" : "Continue"}
      </Button>
      {error && <p className="text-center font-body text-sm text-plume-500">{error}</p>}
    </div>
  );
}

function resumeStep(
  moduleConfig: NonNullable<ReturnType<typeof getModule>>,
  summary: ModuleProgressSummary
): RunnerPhase | null {
  if (!summary.progress?.inProgress) return null;
  const variant =
    moduleConfig.variants.find((v) => v.key === summary.progress?.variant) ?? moduleConfig.variants[0];
  const step = variant.steps.find((s) => s.id === summary.progress?.stage);
  if (!step) return null;
  return { kind: "step", sessionId: summary.progress.sessionId, step };
}

function isStepComplete(step: ModuleStep, answers: Record<string, string>): boolean {
  if (step.kind === "diagnostic") {
    return step.questions.every((q) => isAnswerValid(q, answers[q.key]));
  }
  if (step.kind === "reflection") {
    const text = answers.text ?? "";
    return text.trim().length > 0 && text.length <= step.maxLength;
  }
  return true;
}

function answerPayload(step: ModuleStep, answers: Record<string, string>): unknown {
  if (step.kind === "diagnostic") return answers;
  if (step.kind === "reflection") return answers.text ?? "";
  return null;
}

function StepView({
  step,
  answers,
  onChange,
}: {
  step: ModuleStep;
  answers: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
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

function NotFoundView() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="font-body text-sm text-ink-soft">That module doesn&apos;t exist.</p>
      <Link href="/skills">
        <Button variant="outline">Back to skills</Button>
      </Link>
    </div>
  );
}
