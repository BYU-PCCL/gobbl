"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { ChatMsg } from "@/components/chat/ChatInterface";
import { PRACTICE_ADDONS } from "@/components/skills/practice-addons";
import { StepView, answerPayload, isStepComplete } from "@/components/skills/StepView";
import { getStudioComponent } from "@/lib/studio/components";
import { toModuleStep } from "@/lib/studio/runtime";
import type { StudioStep } from "@/lib/studio/types";
import { answerValues, fillAnswers } from "@/lib/studio/variables";
import { PreviewChat } from "./PreviewChat";

/**
 * Walks through a draft the way a learner would. Every screen is the module runner's own
 * (StepView, CUSTOM_STEPS, PRACTICE_ADDONS), fed the step the draft would become, so what
 * an author sees here is what learners will. Only the AI chat differs: it talks to Studio's
 * preview endpoint, so nothing is saved or scored. Nothing else is saved either.
 */
export function StudioPreview({
  steps,
  title,
  subtitle,
  startIndex = 0,
  onExit,
}: {
  steps: StudioStep[];
  title: string;
  /** Which version is showing, e.g. "Advanced version". */
  subtitle?: string;
  /** Start partway through, to try a change without clicking through everything before it. */
  startIndex?: number;
  onExit: () => void;
}) {
  const [runKey, setRunKey] = useState(0);
  const [index, setIndex] = useState(startIndex);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [addonValues, setAddonValues] = useState<Record<string, unknown>>({});
  const [chats, setChats] = useState<Record<string, ChatMsg[]>>({});
  const [chatDone, setChatDone] = useState<Record<string, boolean>>({});

  function restart() {
    setIndex(startIndex);
    setValues({});
    setAddonValues({});
    setChats({});
    setChatDone({});
    setRunKey((k) => k + 1);
  }

  // Esc leaves the preview, unless the author is typing (e.g. a chat reply or a reflection).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  // Pinned under the Studio header, so the way out is always on screen however far the
  // author has scrolled (a long chat pushes everything else out of view).
  const header = (
    <div className="sticky top-14 z-[5] -mx-4 -mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:-mt-8 lg:px-6">
      <Button size="sm" variant="dark" className="order-1" onClick={onExit} title="Back to editor (Esc)">
        <Icon name="arrow-left" size={16} />
        Back to editor
      </Button>
      {/* On a phone the title gets its own row, so the buttons don't squeeze it to nothing. */}
      <div className="order-3 min-w-0 basis-full sm:order-2 sm:flex-1 sm:basis-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary">
          Preview{subtitle ? ` · ${subtitle}` : ""}
        </p>
        <h2 className="truncate font-display text-lg font-bold tracking-[-0.02em]">{title}</h2>
      </div>
      <div className="order-2 ml-auto flex gap-1 sm:order-3">
        {index > startIndex && index < steps.length && (
          <Button size="sm" variant="ghost" onClick={() => setIndex((i) => i - 1)}>
            Back a step
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={restart}>
          {startIndex > 0 ? "Start over from here" : "Restart"}
        </Button>
      </div>
      <p className="order-4 basis-full font-body text-xs text-ink-muted">
        {startIndex > 0 ? `Started at step ${startIndex + 1}. ` : ""}Nothing here is saved to Gobbl. Press Esc or your
        browser&apos;s back button to return to the editor.
      </p>
    </div>
  );

  if (steps.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <p className="font-body text-sm text-ink-muted">This draft has no steps to preview yet.</p>
      </div>
    );
  }

  // Finished: show what the learner would have produced, which is what Gobbl would record.
  if (index >= steps.length) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold">Preview finished</h3>
              <p className="mt-1 font-body text-sm text-ink-soft">
                This is the data a real run of this module would have recorded.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={restart}>
                Run it again
              </Button>
              <Button size="sm" onClick={onExit}>
                Back to editor
              </Button>
            </div>
          </div>
          <ol className="mt-4 flex flex-col gap-3">
            {steps.map((step, i) => {
              if (i < startIndex) return null;
              const def = getStudioComponent(step.type);
              const runtimeStep = toModuleStep(step);
              const recorded =
                step.type === "practice"
                  ? { messages: (chats[step.id] ?? []).length, companion: addonValues[step.id] ?? null }
                  : runtimeStep
                    ? (answerPayload(runtimeStep, answersOf(values[step.id]), values[step.id]) ?? true)
                    : null;
              return (
                <li key={step.id} className="rounded-xl bg-bg p-3">
                  <div className="font-body text-sm font-semibold">
                    {i + 1}. {def?.label ?? step.type}
                  </div>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs text-ink-soft">
                    {JSON.stringify(recorded, null, 2)}
                  </pre>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    );
  }

  // Earlier answers fill this step's {name}s. The AI chat's are filled by the server (see
  // PreviewChat), so its settings are checked as the author wrote them.
  const earlier = answerValues(steps.slice(0, index), values);
  const step = steps[index];
  const def = getStudioComponent(step.type);
  const runtimeStep = toModuleStep({ ...step, props: fillAnswers(step.props, earlier) });

  let canContinue = true;
  let body: React.ReactNode;

  if (!def || !runtimeStep) {
    body = <p className="font-body text-sm text-plume-500">Unknown component &quot;{step.type}&quot;.</p>;
  } else if (runtimeStep.kind === "practice") {
    const addon = runtimeStep.addon ? PRACTICE_ADDONS[runtimeStep.addon] : undefined;
    canContinue = chatDone[step.id] === true;
    body = (
      <div className="flex flex-col gap-3">
        {addon && (
          <addon.Component
            props={runtimeStep.addonProps ?? {}}
            messages={chats[step.id] ?? []}
            value={step.id in addonValues ? addonValues[step.id] : (addon.initialValue ?? null)}
            onChange={(v) => setAddonValues((a) => ({ ...a, [step.id]: v }))}
          />
        )}
        <PreviewChat
          key={`${runKey}-${step.id}`}
          stepProps={step.props}
          answers={earlier}
          onMessagesChange={(m) => setChats((c) => ({ ...c, [step.id]: m }))}
          onFinish={() => setChatDone((d) => ({ ...d, [step.id]: true }))}
        />
      </div>
    );
  } else {
    // Diagnostic and reflection answers are a { questionKey: answer } map in the runner;
    // custom steps keep whatever value their component reports.
    const value = values[step.id];
    const answers = answersOf(value);
    canContinue = isStepComplete(runtimeStep, answers, value);
    body = (
      <StepView
        key={`${runKey}-${step.id}`}
        step={runtimeStep}
        answers={answers}
        onChange={(next) => setValues((v) => ({ ...v, [step.id]: next }))}
        customValue={value}
        onCustomChange={(next) => setValues((v) => ({ ...v, [step.id]: next }))}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
        Step {index + 1} of {steps.length} · {def?.label ?? step.type}
      </div>
      <div className="mx-auto w-full max-w-2xl">{body}</div>
      <div className="mx-auto w-full max-w-2xl">
        <Button disabled={!canContinue} onClick={() => setIndex((i) => i + 1)}>
          {index === steps.length - 1 ? "Finish" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

function answersOf(value: unknown): Record<string, string> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, string>) : {};
}
