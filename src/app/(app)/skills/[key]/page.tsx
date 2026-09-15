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
  | { kind: "not-found" }
  | { kind: "intro"; summary: ModuleProgressSummary }
  | { kind: "step"; sessionId: string; step: ModuleStep }
  | { kind: "practice"; sessionId: string; step: ModuleStep; debateId: string; initialMessages: ChatMsg[] }
  | { kind: "complete"; result: CompleteResult };

export default function ModuleRunnerPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const moduleKey = params.key as string;
  const moduleConfig = getModule(moduleKey);

  const [phase, setPhase] = useState<RunnerPhase>({ kind: "loading" });
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (status === "authenticated" && moduleConfig) {
      fetch("/api/modules")
        .then((r) => r.json())
        .then((modules: ModuleProgressSummary[]) => {
          const summary = modules.find((m) => m.key === moduleKey);
          if (!summary) {
            setPhase({ kind: "not-found" });
            return;
          }
          const resumed = resumeStep(moduleConfig, summary);
          setPhase(resumed ?? { kind: "intro", summary });
        });
    }
  }, [status, moduleKey, moduleConfig, router]);

  if (!moduleConfig) {
    return <NotFoundView />;
  }

  async function start(variant: "standard" | "advanced") {
    const res = await fetch(`/api/modules/${moduleKey}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variant }),
    });
    const data = await res.json();
    setAnswers({});
    setPhase({ kind: "step", sessionId: data.sessionId, step: data.step });
  }

  async function enterPractice(sessionId: string, step: ModuleStep) {
    const res = await fetch(`/api/modules/${moduleKey}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, stepId: step.id }),
    });
    const { debateId } = await res.json();
    const debateRes = await fetch(`/api/debates?id=${debateId}`);
    const debate = await debateRes.json();
    const initialMessages: ChatMsg[] = debate.messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    setPhase({ kind: "practice", sessionId, step, debateId, initialMessages });
  }

  async function finishPractice(sessionId: string, step: ModuleStep) {
    const res = await fetch(`/api/modules/${moduleKey}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, stepId: step.id, action: "finish" }),
    });
    const data = await res.json();
    await goToNextStep(sessionId, data.nextStep);
  }

  async function advance(sessionId: string, step: ModuleStep, answer: unknown) {
    if (step.kind === "practice") {
      await enterPractice(sessionId, step);
      return;
    }
    const res = await fetch(`/api/modules/${moduleKey}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, stepId: step.id, answer }),
    });
    const data = await res.json();
    setAnswers({});
    await goToNextStep(sessionId, data.nextStep);
  }

  async function goToNextStep(sessionId: string, nextStep: ModuleStep | null) {
    if (!nextStep) {
      const completeRes = await fetch(`/api/modules/${moduleKey}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      setPhase({ kind: "complete", result: await completeRes.json() });
      return;
    }
    setAnswers({});
    setPhase({ kind: "step", sessionId, step: nextStep });
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
            <Button onClick={() => start("standard")}>Try again</Button>
            <Button variant="outline" onClick={() => start("advanced")}>
              Level up
            </Button>
          </div>
        ) : (
          <Button onClick={() => start("standard")}>Start</Button>
        )}
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
      <Button disabled={!canContinue} onClick={() => advance(sessionId, step, answerPayload(step, answers))}>
        {step.kind === "practice" ? "Start conversation" : "Continue"}
      </Button>
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
