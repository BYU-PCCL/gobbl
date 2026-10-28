"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { FlatTurkey } from "@/components/gamification/FlatTurkey";
import { LevelUpModal } from "@/components/gamification/LevelUpModal";
import { Companion } from "@/components/companion/Companion";
import { HatchOverlay } from "@/components/companion/HatchOverlay";
import { TopicPicker } from "@/components/conversation/TopicPicker";
import { StancePicker } from "@/components/conversation/StancePicker";
import { ConversationScene, type ConversationYou } from "@/components/conversation/ConversationScene";
import { ConversationResults } from "@/components/conversation/ConversationResults";
import { QuizStep } from "@/components/skills/QuizStep";
import { InlineToast } from "@/components/skills/InlineToast";
import { useVisualViewportHeight } from "@/components/chat/useVisualViewportHeight";
import { companionLine, type CompanionInfo } from "@/lib/companion";
import { MAX_TURNS, isStance, type ConvMsg, type FinishResult, type Stance } from "@/lib/conversation";
import { availableMoves, type Move } from "@/lib/moves";
import { getModule } from "@/lib/modules/registry";
import type { ModuleStep } from "@/lib/modules/types";
import { isAnswerValid } from "@/lib/survey/questions";
import type { EquippedCosmetics } from "@/lib/shop";
import { MODULE_TOPIC, TOPICS, getTopic } from "@/lib/topics";

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
    linkedDebates?: { pre: string | null; post: string | null };
  } | null;
}

interface CompleteResult {
  completed: true;
  preCivility: number | null;
  postCivility: number | null;
  feathersEarned: number;
}

interface UserInfo {
  level: number;
  companion: CompanionInfo;
  equippedCosmetics: EquippedCosmetics | null;
}

interface XpGain {
  amount: number;
  previousLevel: number;
  newLevel: number;
}

type RunnerPhase =
  | { kind: "loading" }
  | { kind: "load-error" }
  | { kind: "not-found" }
  | { kind: "intro"; summary: ModuleProgressSummary }
  /** `linked`: the server already has a conversation for this practice step, so resume it without the pickers. */
  | { kind: "step"; sessionId: string; step: ModuleStep; linked?: boolean }
  | {
      kind: "practice";
      sessionId: string;
      step: ModuleStep;
      debateId: string;
      topic: string;
      personaInitials: string;
      difficulty: string;
      userStance: Stance | null;
      maxTurns: number;
      initialMessages: ConvMsg[];
    }
  | { kind: "practice-results"; sessionId: string; step: ModuleStep; debateId: string; result: FinishResult }
  | { kind: "complete"; result: CompleteResult };

/** Quiz passed with a hatch: the overlay shows before the lesson moves on. */
interface HatchPending {
  sessionId: string;
  nextStep: ModuleStep | null;
  moveName: string;
  xp: XpGain | null;
}

const GENERIC_ERROR = "Something went wrong. Please try again.";

/** Remembers that a practice conversation was started in this browser, so a reload resumes it without the pickers. */
const practiceKey = (sessionId: string, stepId: string) => `gobbl:practice:${sessionId}:${stepId}`;
function practiceStarted(sessionId: string, stepId: string): boolean {
  try {
    return sessionStorage.getItem(practiceKey(sessionId, stepId)) === "1";
  } catch {
    return false;
  }
}
function markPractice(sessionId: string, stepId: string, on: boolean) {
  try {
    if (on) sessionStorage.setItem(practiceKey(sessionId, stepId), "1");
    else sessionStorage.removeItem(practiceKey(sessionId, stepId));
  } catch {
    /* storage unavailable: a reload shows the pickers again and the server returns the same conversation */
  }
}

/** Modules are reading-and-writing flows, so they keep a comfortable column width on desktop. */
export default function ModuleRunnerPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <ModuleRunner />
    </div>
  );
}

function ModuleRunner() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const moduleKey = params.key as string;
  const moduleConfig = getModule(moduleKey);

  const [phase, setPhase] = useState<RunnerPhase>({ kind: "loading" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [levelUp, setLevelUp] = useState<{ from: number; to: number } | null>(null);
  const [hatch, setHatch] = useState<HatchPending | null>(null);
  const [topicId, setTopicId] = useState<string | null>(MODULE_TOPIC[moduleKey] ?? null);
  const [stance, setStance] = useState<Stance | null>(null);
  const resumeTried = useRef<string | null>(null);
  // The practice conversation fills the phone screen, so size it to the visual viewport
  // (keeps the composer above the keyboard).
  useVisualViewportHeight(phase.kind === "practice");

  const hideToast = useCallback(() => setToast(null), []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/user");
      if (!res.ok) return;
      const d = await res.json();
      setUser({
        level: d.level ?? 1,
        companion: d.companion ?? { speciesId: null, hatched: false, stage: 1, learnedMoves: [], lastTopicId: null },
        equippedCosmetics: d.equippedCosmetics ?? null,
      });
    } catch {
      /* the companion falls back to defaults */
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      void refreshUser();
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
  }, [status, moduleKey, moduleConfig, router, refreshUser]);

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

  /**
   * Leaving mid-module is always safe: every submitted step is already saved on the server
   * and `start` resumes the open run, so the user lands back on the step they left.
   */
  function leave() {
    router.push("/skills");
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
    void refreshUser();
    setPhase({ kind: "complete", result: r.data });
  }

  async function goToNextStep(sessionId: string, nextStep: ModuleStep | null) {
    if (!nextStep) {
      await finalize(sessionId);
      return;
    }
    setAnswers({});
    setStance(null);
    setTopicId(MODULE_TOPIC[moduleKey] ?? null);
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
      const resumedVariant =
        moduleConfig?.variants.find((v) => v.key === r.data.variant) ?? moduleConfig?.variants[0];
      const linked = resumedVariant ? practiceLinked(resumedVariant.steps, r.data.step, r.data.linkedDebates) : false;
      setPhase({ kind: "step", sessionId: r.data.sessionId, step: r.data.step, linked });
    });
  }

  /** Posts the practice start. `choice` is omitted when resuming: the server returns the linked conversation. */
  async function startPractice(sessionId: string, step: ModuleStep, choice?: { topicId: string; userStance: Stance }) {
    const r = await post("advance", { sessionId, stepId: step.id, ...(choice ? { answer: choice } : {}) });
    if (handleFailure(r)) return;
    const debateRes = await fetch(`/api/debates?id=${r.data.debateId}`);
    if (!debateRes.ok) {
      setError(GENERIC_ERROR);
      return;
    }
    const debate = await debateRes.json();
    markPractice(sessionId, step.id, true);
    if (!choice && debate.completed) {
      // Resumed a conversation that was already wrapped up: just record it and move on.
      await completePractice(sessionId, step);
      return;
    }
    const stepMax = step.kind === "practice" ? step.maxTurns : undefined;
    setPhase({
      kind: "practice",
      sessionId,
      step,
      debateId: r.data.debateId,
      topic: debate.topic,
      personaInitials: debate.personaInitials ?? "",
      difficulty: debate.difficulty,
      userStance: isStance(debate.userStance) ? debate.userStance : null,
      maxTurns: debate.maxTurns ?? stepMax ?? MAX_TURNS,
      initialMessages: (debate.messages as { role: string; content: string; moveId?: string | null }[]).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
        moveId: m.moveId ?? null,
      })),
    });
  }

  async function completePractice(sessionId: string, step: ModuleStep) {
    const r = await post("advance", { sessionId, stepId: step.id, action: "finish" });
    if (handleFailure(r)) return;
    markPractice(sessionId, step.id, false);
    await goToNextStep(sessionId, r.data.nextStep);
  }

  function enterPractice(sessionId: string, step: ModuleStep, fresh: boolean) {
    return run(async () => {
      if (fresh) {
        if (!topicId || !stance) return;
        await startPractice(sessionId, step, { topicId, userStance: stance });
      } else {
        await startPractice(sessionId, step);
      }
    });
  }

  function finishPractice(sessionId: string, step: ModuleStep) {
    return run(() => completePractice(sessionId, step));
  }

  function noteXp(xp: XpGain | null | undefined, message: string) {
    if (!xp) return;
    setToast(message);
    if (xp.newLevel > xp.previousLevel) setLevelUp({ from: xp.previousLevel, to: xp.newLevel });
  }

  function advance(sessionId: string, step: ModuleStep, answer: unknown) {
    if (step.kind === "practice") return enterPractice(sessionId, step, true);
    return run(async () => {
      const r = await post("advance", { sessionId, stepId: step.id, answer });
      if (handleFailure(r)) return;
      if (r.data.xp) {
        noteXp(r.data.xp, `+${r.data.xp.amount} XP · Your turkey feels the lesson coming.`);
        void refreshUser();
      }
      await goToNextStep(sessionId, r.data.nextStep);
    });
  }

  /** Submits the quiz. Resolves "failed" when not passed so QuizStep can offer a retry. */
  async function submitQuiz(sessionId: string, step: ModuleStep, answer: number[]): Promise<"failed" | "other"> {
    let outcome: "failed" | "other" = "other";
    await run(async () => {
      const r = await post("advance", { sessionId, stepId: step.id, answer });
      if (handleFailure(r)) return;
      if (!r.data.passed) {
        outcome = "failed";
        return;
      }
      const learned: Move | null = r.data.learnedMove ?? null;
      const xp: XpGain | null = r.data.xp ?? null;
      const nextStep: ModuleStep | null = r.data.nextStep ?? null;
      void refreshUser();
      if (r.data.hatched) {
        setHatch({ sessionId, nextStep, moveName: learned?.name ?? "", xp });
        return;
      }
      if (xp) noteXp(xp, `+${xp.amount} XP${learned ? ` · ${learned.name} learned` : ""}`);
      else if (learned) setToast(`${learned.name} sharpened`);
      await goToNextStep(sessionId, nextStep);
    });
    return outcome;
  }

  function finishHatch() {
    if (!hatch) return;
    const h = hatch;
    setHatch(null);
    if (h.xp) noteXp(h.xp, `+${h.xp.amount} XP${h.moveName ? ` · ${h.moveName} learned` : ""}`);
    void run(() => goToNextStep(h.sessionId, h.nextStep));
  }

  // Resume: a practice conversation the server already linked (or one started in this browser) skips the pickers.
  useEffect(() => {
    if (phase.kind !== "step" || phase.step.kind !== "practice") return;
    const id = `${phase.sessionId}:${phase.step.id}`;
    const started = phase.linked === true || practiceStarted(phase.sessionId, phase.step.id);
    if (resumeTried.current === id || !started) return;
    resumeTried.current = id;
    void enterPractice(phase.sessionId, phase.step, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (!moduleConfig) {
    return <NotFoundView />;
  }

  const hasAdvancedVariant = moduleConfig.variants.some((v) => v.key === "advanced");
  const you: ConversationYou = {
    speciesId: user?.companion.speciesId ?? null,
    level: user?.level ?? 1,
    hatched: user?.companion.hatched ?? false,
    equipped: user?.equippedCosmetics ?? null,
  };

  const overlays = (
    <>
      <InlineToast message={toast} onHide={hideToast} />
      {hatch && <HatchOverlay speciesId={you.speciesId} moveName={hatch.moveName} onDone={finishHatch} doneLabel="Keep going" />}
      <LevelUpModal
        open={levelUp !== null && !hatch}
        fromLevel={levelUp?.from ?? 1}
        toLevel={levelUp?.to ?? 1}
        rewards={{ feathers: 0 }}
        onClose={() => setLevelUp(null)}
      />
    </>
  );

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
        <LeaveBar onLeave={leave} />
        <div>
          <div className="font-body text-xs font-semibold text-ink-muted">
            About {phase.summary.estimatedMinutes} minutes
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
        {overlays}
      </div>
    );
  }

  if (phase.kind === "practice") {
    return (
      // On phones and tablets the conversation takes over the whole screen (above the top bar and
      // bottom nav) and is sized to the visual viewport, so the composer stays above the
      // keyboard. On desktop it is a card inside the page: the page content grows with its
      // content, so the card needs an explicit height.
      <div className="fixed inset-x-0 top-0 z-50 flex h-[var(--vvh,100dvh)] flex-col bg-surface lg:static lg:h-[calc(100dvh-7rem)] lg:min-h-[420px] lg:overflow-hidden lg:rounded-2xl lg:border lg:border-line">
        <div className="flex-1 overflow-hidden">
          <ConversationScene
            debateId={phase.debateId}
            topic={phase.topic}
            personaInitials={phase.personaInitials}
            difficulty={phase.difficulty}
            userStance={phase.userStance}
            initialMessages={phase.initialMessages}
            maxTurns={phase.maxTurns}
            moves={availableMoves(user?.companion.learnedMoves ?? [])}
            you={you}
            onFinish={(result) =>
              setPhase({
                kind: "practice-results",
                sessionId: phase.sessionId,
                step: phase.step,
                debateId: phase.debateId,
                result,
              })
            }
            onLeave={leave}
          />
        </div>
        {overlays}
      </div>
    );
  }

  if (phase.kind === "practice-results") {
    return (
      <div className="flex flex-col gap-3">
        <ConversationResults
          debateId={phase.debateId}
          result={phase.result}
          you={you}
          continueLabel="Continue the lesson"
          onContinue={() => finishPractice(phase.sessionId, phase.step)}
        />
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-plume-100 px-4 py-2 font-body text-xs text-plume-700">
            <span>{error}</span>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => finishPractice(phase.sessionId, phase.step)}>
              Retry
            </Button>
          </div>
        )}
        {overlays}
      </div>
    );
  }

  if (phase.kind === "complete") {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <Companion
          variant="scene"
          speciesId={you.speciesId}
          level={you.level}
          hatched={you.hatched}
          equipped={you.equipped}
          line="We did it. I remember every word."
        />
        <h1 className="font-display text-2xl font-bold">Module complete</h1>
        <p className="font-body text-sm text-ink-soft">
          +{phase.result.feathersEarned} feathers
          {(() => {
            const civility = phase.result.postCivility ?? phase.result.preCivility;
            return civility != null ? `. Civility ${Math.round(civility)} out of 10` : null;
          })()}
        </p>
        <Link href="/skills">
          <Button>Back to skills</Button>
        </Link>
        {overlays}
      </div>
    );
  }

  const { sessionId, step } = phase;
  const isLastStep = moduleConfig.variants.some((v) => v.steps[v.steps.length - 1]?.id === step.id);
  const line = companionLine(isLastStep ? "last" : step.kind, you.hatched);

  if (step.kind === "quiz") {
    return (
      <div className="flex flex-col gap-5">
        <LeaveBar onLeave={leave} hint="Finished steps are saved. You can pick this up later." />
        <QuizStep
          questions={step.questions}
          speciesId={you.speciesId}
          level={you.level}
          hatched={you.hatched}
          equipped={you.equipped}
          busy={busy}
          onSubmit={(answer) => submitQuiz(sessionId, step, answer)}
          onBack={() => router.push("/dashboard")}
        />
        {error && <p className="text-center font-body text-sm text-plume-500">{error}</p>}
        {overlays}
      </div>
    );
  }

  const canContinue = isStepComplete(step, answers) && (step.kind !== "practice" || (!!topicId && !!stance));

  return (
    <div className="flex flex-col gap-5">
      <LeaveBar onLeave={leave} hint="Finished steps are saved. You can pick this up later." />
      <Companion
        variant="row"
        speciesId={you.speciesId}
        level={you.level}
        hatched={you.hatched}
        equipped={you.equipped}
        line={line}
      />
      <StepView
        step={step}
        answers={answers}
        onChange={setAnswers}
        moduleTitle={moduleConfig.title}
        moduleKey={moduleKey}
        topicId={topicId}
        onTopic={setTopicId}
        stance={stance}
        onStance={setStance}
      />
      <Button
        disabled={!canContinue || busy}
        loading={busy}
        onClick={() => advance(sessionId, step, answerPayload(step, answers))}
      >
        {step.kind === "practice" ? "Start the conversation" : "Continue"}
      </Button>
      {error && <p className="text-center font-body text-sm text-plume-500">{error}</p>}
      {overlays}
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
  const linked = practiceLinked(variant.steps, step, summary.progress.linkedDebates);
  return { kind: "step", sessionId: summary.progress.sessionId, step, linked };
}

/** True when the server already holds a conversation for this practice step (first practice = pre slot, second = post). */
function practiceLinked(
  steps: ModuleStep[],
  step: ModuleStep,
  ids: { pre: string | null; post: string | null } | undefined
): boolean {
  if (step.kind !== "practice" || !ids) return false;
  const practiceIndex = steps.filter((s) => s.kind === "practice").findIndex((s) => s.id === step.id);
  return Boolean(practiceIndex === 0 ? ids.pre : practiceIndex === 1 ? ids.post : null);
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
  moduleTitle,
  moduleKey,
  topicId,
  onTopic,
  stance,
  onStance,
}: {
  step: ModuleStep;
  answers: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  moduleTitle: string;
  moduleKey: string;
  topicId: string | null;
  onTopic: (id: string) => void;
  stance: Stance | null;
  onStance: (s: Stance) => void;
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
            <p className="mt-1.5 whitespace-pre-line font-body text-sm text-ink-soft">{block.body}</p>
          </div>
        ))}
      </div>
    );
  }

  if (step.kind === "practice") {
    const topic = getTopic(topicId);
    return (
      <div className="flex flex-col gap-5">
        <TopicPicker
          topics={TOPICS}
          suggestedTopicId={MODULE_TOPIC[moduleKey]}
          suggestedLabel={moduleTitle}
          value={topicId}
          onChange={onTopic}
        />
        {topic && <StancePicker question={topic.description} value={stance} onChange={onStance} />}
      </div>
    );
  }

  // The quiz step is rendered by QuizStep, never through this view.
  if (step.kind === "quiz") return null;

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

function LeaveButton({ onLeave }: { onLeave: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onLeave} className="shrink-0">
      <Icon name="close" size={14} strokeWidth={2} />
      Leave
    </Button>
  );
}

/** Top row of the intro and step screens: an optional hint on the left, "Leave" on the right. */
function LeaveBar({ onLeave, hint }: { onLeave: () => void; hint?: string }) {
  return (
    <div className="-mt-1 flex items-center justify-between gap-3">
      {hint ? <p className="font-body text-xs text-ink-muted">{hint}</p> : <span />}
      <LeaveButton onLeave={onLeave} />
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
