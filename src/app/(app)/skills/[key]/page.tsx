"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageShell } from "@/components/layout/PageShell";
import { DimensionRow } from "@/components/chat/ScoreSummary";
import { LessonBlocks } from "@/components/skills/LessonBlocks";
import { RadioOptions } from "@/components/skills/RadioOptions";
import { Companion } from "@/components/companion/Companion";
import { HatchOverlay } from "@/components/companion/HatchOverlay";
import { TopicPicker } from "@/components/conversation/TopicPicker";
import { StancePicker } from "@/components/conversation/StancePicker";
import { ConversationScene } from "@/components/conversation/ConversationScene";
import { ConversationResults } from "@/components/conversation/ConversationResults";
import { ActivityResults } from "@/components/activity/ActivityResults";
import { QuizStep, type QuizSubmitOutcome } from "@/components/skills/QuizStep";
import { InlineToast } from "@/components/skills/InlineToast";
import { useVisualViewportHeight } from "@/components/chat/useVisualViewportHeight";
import { companionLine } from "@/lib/companion";
import { civilityLabel } from "@/lib/civility";
import { QUIZ_PASS } from "@/lib/quizzes";
import { useCompanion, companionFromTurkey } from "@/components/companion/useCompanion";
import { MAX_TURNS, isStance, type ActivityRewards, type ConvMsg, type FinishResult, type Stance } from "@/lib/conversation";
import { getModule } from "@/lib/modules/registry";
import type { ModuleStep } from "@/lib/modules/types";
import { isAnswerValid } from "@/lib/survey/questions";
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
  rewards: ActivityRewards;
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
      personaId: string | null;
      difficulty: string;
      userStance: Stance | null;
      maxTurns: number;
      initialMessages: ConvMsg[];
    }
  | {
      kind: "practice-results";
      sessionId: string;
      step: ModuleStep;
      debateId: string;
      personaInitials: string;
      result: FinishResult;
    }
  | { kind: "complete"; result: CompleteResult };

/** Quiz passed with a hatch: the overlay shows before the lesson moves on. */
interface HatchPending {
  sessionId: string;
  nextStep: ModuleStep | null;
  eggId: string;
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

/** Each screen sets its own width through PageShell: modules are reading-and-writing flows, so a narrow column. */
export default function ModuleRunnerPage() {
  return (
    <Suspense fallback={<LoadingState message="Getting the lesson ready..." />}>
      <ModuleRunner />
    </Suspense>
  );
}

function ModuleRunner() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const moduleKey = params.key as string;
  const moduleConfig = getModule(moduleKey);
  const turkeyId = useSearchParams().get("turkeyId");
  const { companion, turkey, flock, refresh: refreshUser } = useCompanion(turkeyId);
  const turkeyName = turkey?.name ?? "your turkey";

  const [phase, setPhase] = useState<RunnerPhase>({ kind: "loading" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [hatch, setHatch] = useState<HatchPending | null>(null);
  const [topicId, setTopicId] = useState<string | null>(MODULE_TOPIC[moduleKey] ?? null);
  const [stance, setStance] = useState<Stance | null>(null);
  const [practiceStage, setPracticeStage] = useState<"topic" | "stance">("topic");
  /** The user's level before this lesson started, so the one level-up on the final screen covers XP paid mid-lesson. */
  const levelBefore = useRef<number | null>(null);
  const resumeTried = useRef<string | null>(null);
  // The practice conversation fills the phone screen, so size it to the visual viewport
  // (keeps the composer above the keyboard).
  useVisualViewportHeight(phase.kind === "practice");

  const hideToast = useCallback(() => setToast(null), []);

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
        // `start` is where a turkey gets linked to the run, and it resumes an open run, so go through it
        // when a turkey is feeding on this module.
        if (progress?.inProgress && turkeyId) {
          const resumed = await fetch(`/api/modules/${moduleKey}/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ turkeyId }),
          });
          if (!resumed.ok) throw new Error("resume failed");
          const data = await resumed.json();
          if (!data.step) {
            const done = await fetch(`/api/modules/${moduleKey}/complete`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: data.sessionId }),
            });
            if (!done.ok) throw new Error("complete failed");
            setPhase({ kind: "complete", result: await done.json() });
            return;
          }
          const variant = moduleConfig.variants.find((v) => v.key === data.variant) ?? moduleConfig.variants[0];
          const linked = practiceLinked(variant.steps, data.step, data.linkedDebates);
          setPhase({ kind: "step", sessionId: data.sessionId, step: data.step, linked });
          return;
        }
        setPhase(resumeStep(moduleConfig, summary) ?? { kind: "intro", summary });
      })().catch(() => setPhase({ kind: "load-error" }));
    }
  }, [status, moduleKey, moduleConfig, router, turkeyId]);

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
    if (turkey) flock.select(turkey.id);
    router.push("/flock");
  }

  /** Returns true if the failure was handled (caller should stop). */
  function handleFailure(r: { ok: boolean; status: number; data: { error?: string } }): boolean {
    if (r.ok) return false;
    if (r.status === 401) {
      router.push("/");
    } else if (r.status === 409 && !/finish the conversation/i.test(r.data?.error ?? "")) {
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
    setPracticeStage("topic");
    setTopicId(MODULE_TOPIC[moduleKey] ?? null);
    setPhase({ kind: "step", sessionId, step: nextStep });
  }

  function start(variant: "standard" | "advanced") {
    return run(async () => {
      const r = await post("start", { variant, ...(turkeyId ? { turkeyId } : {}) });
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
      personaId: typeof debate.personaId === "string" ? debate.personaId : null,
      difficulty: debate.difficulty,
      userStance: isStance(debate.userStance) ? debate.userStance : null,
      maxTurns: debate.maxTurns ?? stepMax ?? MAX_TURNS,
      initialMessages: (debate.messages as { role: string; content: string }[]).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
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
    noteLevel(xp.previousLevel);
  }

  /** Remembers the lowest level seen this lesson; the final screen shows the single level-up from there. */
  function noteLevel(previousLevel: number) {
    levelBefore.current = levelBefore.current === null ? previousLevel : Math.min(levelBefore.current, previousLevel);
  }

  function advance(sessionId: string, step: ModuleStep, answer: unknown) {
    if (step.kind === "practice") return enterPractice(sessionId, step, true);
    return run(async () => {
      const r = await post("advance", { sessionId, stepId: step.id, answer });
      if (handleFailure(r)) return;
      if (r.data.xp) {
        noteXp(r.data.xp, `+${r.data.xp.amount} XP · ${turkey?.hatched ? `${turkey.name ?? "Your turkey"} is` : "Your egg is"} taking it in.`);
        void refreshUser();
      }
      await goToNextStep(sessionId, r.data.nextStep);
    });
  }

  /** Submits the quiz. Resolves "failed" with the per-question results when not passed, so QuizStep can review and offer a retry. */
  async function submitQuiz(sessionId: string, step: ModuleStep, answer: number[]): Promise<QuizSubmitOutcome> {
    let outcome: QuizSubmitOutcome = { kind: "other" };
    await run(async () => {
      const r = await post("advance", { sessionId, stepId: step.id, answer });
      if (handleFailure(r)) return;
      if (!r.data.passed) {
        outcome = { kind: "failed", results: Array.isArray(r.data.results) ? r.data.results : [] };
        return;
      }
      const xp: XpGain | null = r.data.xp ?? null;
      const nextStep: ModuleStep | null = r.data.nextStep ?? null;
      void refreshUser();
      if (r.data.hatched && r.data.eggId) {
        setHatch({ sessionId, nextStep, eggId: r.data.eggId, xp });
        return;
      }
      if (xp) noteXp(xp, `+${xp.amount} XP`);
      await goToNextStep(sessionId, nextStep);
    });
    return outcome;
  }

  /** The egg has hatched and been named: make it the selected turkey, refresh the flock, then continue. */
  function finishHatch(turkey: { id: string }) {
    if (!hatch) return;
    const h = hatch;
    setHatch(null);
    flock.select(turkey.id);
    void flock.reload();
    if (h.xp) noteXp(h.xp, `+${h.xp.amount} XP`);
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

  const hatched = companion?.hatched ?? false;
  const hatchSpecies = hatch
    ? companionFromTurkey(flock.turkeys.find((t) => t.id === hatch.eggId) ?? null).speciesId
    : null;

  const overlays = (
    <>
      <InlineToast message={toast} onHide={hideToast} />
      {hatch && (
        <HatchOverlay
          turkeyId={hatch.eggId}
          speciesId={hatchSpecies ?? companion?.speciesId ?? null}
          onDone={finishHatch}
          doneLabel="Keep going"
        />
      )}
    </>
  );

  const leaveAside = <LeaveButton onLeave={leave} />;
  const savedHint = "Finished steps are saved. You can pick this up later.";

  if (phase.kind === "loading") {
    return <LoadingState message="Getting the lesson ready..." />;
  }

  if (phase.kind === "not-found") {
    return <NotFoundView />;
  }

  if (phase.kind === "load-error") {
    return (
      <PageShell width="narrow">
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-body text-sm text-ink-soft">Couldn&apos;t load this lesson.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      </PageShell>
    );
  }

  if (phase.kind === "intro") {
    return (
      <PageShell
        width="narrow"
        eyebrow={`About ${phase.summary.estimatedMinutes} minutes`}
        title={phase.summary.title}
        subtitle={phase.summary.description}
        aside={leaveAside}
      >
        <div className="flex flex-col gap-5">
          <Button size="lg" disabled={busy} loading={busy} onClick={() => start("standard")}>
            {phase.summary.timesCompleted > 0 ? "Feed again" : "Start"}
          </Button>
          {error && (
            <p role="alert" className="text-center font-body text-sm text-danger">
              {error}
            </p>
          )}
        </div>
        {overlays}
      </PageShell>
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
            personaId={phase.personaId}
            difficulty={phase.difficulty}
            userStance={phase.userStance}
            initialMessages={phase.initialMessages}
            maxTurns={phase.maxTurns}
            turkey={turkey}
            onFinish={(result) => {
              noteLevel(result.previousLevel);
              setPhase({
                kind: "practice-results",
                sessionId: phase.sessionId,
                step: phase.step,
                debateId: phase.debateId,
                personaInitials: phase.personaInitials,
                result,
              });
            }}
            onLeave={leave}
          />
        </div>
        {overlays}
      </div>
    );
  }

  if (phase.kind === "practice-results") {
    const score = phase.result.overallScore;
    const scoreTone = score >= 8 ? "text-forest-fg" : score >= 6 ? "text-ink" : "text-danger";
    return (
      <PageShell width="narrow" eyebrow={moduleConfig.title} title="How the conversation went">
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-baseline justify-center gap-2">
                <span className={`font-display text-[56px] font-bold leading-none tracking-[-0.04em] num-tabular ${scoreTone}`}>
                  {score.toFixed(1)}
                </span>
                <span className="font-body text-sm text-ink-muted">civility out of 10</span>
              </div>
              <p className="mt-1 font-body text-base font-semibold text-ink">{civilityLabel(score)}</p>
            </div>
            {phase.result.dimensions && (
              <div className="mt-5 space-y-4">
                {Object.entries(phase.result.dimensions).map(([key, value]) => (
                  <DimensionRow key={key} dimKey={key} value={value} />
                ))}
              </div>
            )}
          </div>
          <Button size="lg" disabled={busy} loading={busy} onClick={() => finishPractice(phase.sessionId, phase.step)}>
            Continue
          </Button>
          {error && (
            <p role="alert" className="text-center font-body text-sm text-danger">
              {error}
            </p>
          )}
        </div>
        {overlays}
      </PageShell>
    );
  }

  if (phase.kind === "complete") {
    const civility = phase.result.postCivility ?? phase.result.preCivility;
    const r = phase.result.rewards;
    // One level-up for the whole lesson: start from the level before the lesson, not before this last call.
    const previousLevel = Math.min(r.previousLevel, levelBefore.current ?? r.previousLevel);
    const rewards: ActivityRewards = {
      ...r,
      previousLevel,
      turkey: r.turkey ?? turkey,
    };
    return (
      <>
        <ActivityResults kind="feed" rewards={rewards} onContinue={leave} continueLabel={`Back to ${turkeyName}`}>
          {civility != null && (
            <div className="mx-auto flex w-fit flex-col items-center rounded-2xl border border-line bg-surface px-6 py-3">
              <span className="eyebrow">Civility</span>
              <span className="font-display text-2xl font-bold tracking-[-0.03em] text-ink num-tabular">
                {civility.toFixed(1)}
                <span className="ml-1 font-body text-sm font-normal text-ink-muted">/ 10</span>
              </span>
            </div>
          )}
        </ActivityResults>
        {overlays}
      </>
    );
  }

  const { sessionId, step } = phase;
  const isLastStep = moduleConfig.variants.some((v) => v.steps[v.steps.length - 1]?.id === step.id);
  const line = companionLine(isLastStep ? "last" : step.kind, hatched);

  if (step.kind === "quiz") {
    const variant = moduleConfig.variants.find((v) => v.steps.some((s) => s.id === step.id)) ?? moduleConfig.variants[0];
    const lessonBlocks = variant.steps.flatMap((s) => (s.kind === "content" ? s.blocks : []));
    return (
      <PageShell width="narrow" eyebrow={moduleConfig.title} title="Quick quiz" subtitle={savedHint} aside={leaveAside}>
        <QuizStep
          questions={step.questions}
          turkey={turkey}
          busy={busy}
          passScore={step.passScore || QUIZ_PASS}
          lessonBlocks={lessonBlocks}
          onSubmit={(answer) => submitQuiz(sessionId, step, answer)}
        />
        {error && (
          <p role="alert" className="mt-4 text-center font-body text-sm text-danger">
            {error}
          </p>
        )}
        {overlays}
      </PageShell>
    );
  }

  if (step.kind === "practice") {
    const topic = getTopic(topicId);
    const stanceTopic = practiceStage === "stance" ? topic : null;
    return (
      <PageShell
        width="narrow"
        eyebrow={moduleConfig.title}
        title={stanceTopic ? stanceTopic.title : "Pick a topic"}
        subtitle={savedHint}
        aside={leaveAside}
      >
        <div className="flex flex-col gap-5">
          <Companion variant="row" turkey={turkey} line={line} />
          {!stanceTopic ? (
            <>
              <div className="sticky top-0 z-10 -mx-1 flex items-center gap-3 rounded-2xl border border-primary bg-surface px-4 py-2.5 shadow-soft">
                <div className="min-w-0 flex-1">
                  <p className="eyebrow">Chosen</p>
                  <p className="truncate font-display text-sm font-bold">{topic ? topic.title : "Pick a topic to continue"}</p>
                </div>
                <Button size="sm" disabled={!topic} onClick={() => setPracticeStage("stance")}>
                  Next
                </Button>
              </div>
              <TopicPicker
                topics={TOPICS}
                suggestedTopicId={MODULE_TOPIC[moduleKey]}
                suggestedLabel={moduleConfig.title}
                value={topicId}
                onChange={(id) => {
                  setTopicId(id);
                  setStance(null);
                }}
              />
            </>
          ) : (
            <>
              <StancePicker question={stanceTopic.description} value={stance} onChange={setStance} />
              <div className="flex flex-col gap-2">
                <Button
                  size="lg"
                  disabled={!stance || busy}
                  loading={busy}
                  onClick={() => advance(sessionId, step, null)}
                >
                  Start the conversation
                </Button>
                <p role="status" className="min-h-5 text-center font-body text-sm text-ink-muted">
                  {busy ? "Your partner is thinking of an opener…" : !stance ? "Pick a side to start" : ""}
                </p>
                <Button size="lg" variant="ghost" disabled={busy} onClick={() => setPracticeStage("topic")}>
                  Back to topics
                </Button>
              </div>
            </>
          )}
          {error && (
            <p role="alert" className="text-center font-body text-sm text-danger">
              {error}
            </p>
          )}
        </div>
        {overlays}
      </PageShell>
    );
  }

  const canContinue = isStepComplete(step, answers);
  const stepTitle = step.kind === "diagnostic" ? "A quick check-in" : step.kind === "content" ? "The lesson" : "Reflect";

  return (
    <PageShell width="narrow" eyebrow={moduleConfig.title} title={stepTitle} subtitle={savedHint} aside={leaveAside}>
      <div className="flex flex-col gap-5">
        <Companion variant="row" turkey={turkey} line={line} />
        <StepView step={step} answers={answers} onChange={setAnswers} />
        <Button
          size="lg"
          disabled={!canContinue || busy}
          loading={busy}
          onClick={() => advance(sessionId, step, answerPayload(step, answers))}
        >
          Continue
        </Button>
        {error && (
          <p role="alert" className="text-center font-body text-sm text-danger">
            {error}
          </p>
        )}
        {overlays}
      </div>
    </PageShell>
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
              <RadioOptions
                label={q.prompt}
                value={answers[q.key]}
                onChange={(v) => onChange({ ...answers, [q.key]: v })}
                options={q.options.map((opt) => ({ value: opt.value, label: opt.label }))}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (step.kind === "content") {
    return <LessonBlocks blocks={step.blocks} />;
  }

  // The practice and quiz steps are rendered by the runner (pickers) and QuizStep, never through this view.
  if (step.kind === "practice" || step.kind === "quiz") return null;

  // reflection
  const text = answers.text ?? "";
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="reflection-text" className="mb-1 font-display text-base font-bold">
        {step.prompt}
      </label>
      <textarea
        id="reflection-text"
        value={text}
        onChange={(e) => onChange({ ...answers, text: e.target.value.slice(0, step.maxLength) })}
        maxLength={step.maxLength}
        rows={4}
        className="rounded-xl border-2 border-line bg-surface px-4 py-3 text-base text-ink focus:border-primary focus:outline-none sm:text-sm"
        placeholder="Type your answer…"
      />
      <span className="text-right font-mono text-xs text-ink-muted">
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

function NotFoundView() {
  return (
    <PageShell width="narrow">
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="font-body text-sm text-ink-soft">That lesson doesn&apos;t exist.</p>
        <ButtonLink href="/flock" variant="outline">
          Leave
        </ButtonLink>
      </div>
    </PageShell>
  );
}
