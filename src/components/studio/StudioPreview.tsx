"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ChatMsg } from "@/components/chat/ChatInterface";
import { CUSTOM_STEPS } from "@/components/skills/custom-steps";
import { PRACTICE_ADDONS } from "@/components/skills/practice-addons";
import { getStudioComponent } from "@/lib/studio/components";
import type { StudioStep } from "@/lib/studio/types";
import { PreviewChat } from "./PreviewChat";

type Blocks = { heading: string; body: string }[];

/**
 * Walks through a draft the way a learner would. Quiz steps and chat companions are the very
 * components Gobbl's module runner uses (CUSTOM_STEPS, PRACTICE_ADDONS), so they behave the
 * same here. Content and reflection are simple stand-ins for the runner's own screens.
 * Nothing is saved.
 */
export function StudioPreview({
  steps,
  title,
  onExit,
}: {
  steps: StudioStep[];
  title: string;
  onExit: () => void;
}) {
  const [runKey, setRunKey] = useState(0);
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [addonValues, setAddonValues] = useState<Record<string, unknown>>({});
  const [chats, setChats] = useState<Record<string, ChatMsg[]>>({});
  const [chatDone, setChatDone] = useState<Record<string, boolean>>({});

  function restart() {
    setIndex(0);
    setValues({});
    setAddonValues({});
    setChats({});
    setChatDone({});
    setRunKey((k) => k + 1);
  }

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary">Preview</p>
        <h2 className="font-display text-xl font-bold tracking-[-0.02em]">{title}</h2>
        <p className="font-body text-xs text-ink-muted">Nothing here is saved to Gobbl.</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={restart}>
          Restart
        </Button>
        <Button size="sm" variant="outline" onClick={onExit}>
          Back to editor
        </Button>
      </div>
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
          <h3 className="font-display text-lg font-bold">Preview finished</h3>
          <p className="mt-1 font-body text-sm text-ink-soft">
            This is the data a real run of this module would have recorded.
          </p>
          <ol className="mt-4 flex flex-col gap-3">
            {steps.map((step, i) => {
              const def = getStudioComponent(step.type);
              const recorded =
                step.type === "practice"
                  ? { messages: (chats[step.id] ?? []).length, companion: addonValues[step.id] ?? null }
                  : (values[step.id] ?? null);
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

  const step = steps[index];
  const def = getStudioComponent(step.type);
  const runtime = def?.runtime;
  const custom = runtime?.kind === "custom" ? CUSTOM_STEPS[runtime.component] : undefined;

  let canContinue = true;
  let body: React.ReactNode;

  if (!def) {
    body = <p className="font-body text-sm text-plume-500">Unknown component &quot;{step.type}&quot;.</p>;
  } else if (step.type === "content") {
    body = (
      <div className="flex flex-col gap-4">
        {((step.props.blocks as Blocks) ?? []).map((b, i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-4">
            <h3 className="font-display text-base font-bold">{b.heading}</h3>
            <p className="mt-1.5 whitespace-pre-wrap font-body text-sm text-ink-soft">{b.body}</p>
          </div>
        ))}
      </div>
    );
  } else if (step.type === "reflection") {
    const text = typeof values[step.id] === "string" ? (values[step.id] as string) : "";
    const max = typeof step.props.maxLength === "number" ? step.props.maxLength : 500;
    canContinue = text.trim().length > 0;
    body = (
      <div className="flex flex-col gap-1">
        <h3 className="mb-1 font-display text-base font-bold">{String(step.props.prompt ?? "")}</h3>
        <textarea
          value={text}
          rows={4}
          maxLength={max}
          placeholder="Type your answer…"
          onChange={(e) => setValues((v) => ({ ...v, [step.id]: e.target.value }))}
          className="rounded-xl border-2 border-line bg-surface px-4 py-3 text-sm text-ink focus:border-primary focus:outline-none"
        />
        <span className="text-right font-mono text-[10px] text-ink-muted">
          {text.length}/{max}
        </span>
      </div>
    );
  } else if (step.type === "practice") {
    const addonKey = typeof step.props.addon === "string" ? step.props.addon : "";
    const addon = addonKey ? PRACTICE_ADDONS[addonKey] : undefined;
    const label = typeof step.props.addonLabel === "string" && step.props.addonLabel ? step.props.addonLabel : undefined;
    canContinue = chatDone[step.id] === true;
    body = (
      <div className="flex flex-col gap-3">
        {addon && (
          <addon.Component
            props={label ? { label } : {}}
            messages={chats[step.id] ?? []}
            value={step.id in addonValues ? addonValues[step.id] : (addon.initialValue ?? null)}
            onChange={(v) => setAddonValues((a) => ({ ...a, [step.id]: v }))}
          />
        )}
        <PreviewChat
          key={`${runKey}-${step.id}`}
          stepProps={step.props}
          onMessagesChange={(m) => setChats((c) => ({ ...c, [step.id]: m }))}
          onFinish={() => setChatDone((d) => ({ ...d, [step.id]: true }))}
        />
      </div>
    );
  } else if (custom) {
    canContinue = custom.isComplete ? custom.isComplete(values[step.id]) : true;
    body = (
      <custom.Component
        props={step.props}
        value={values[step.id]}
        onChange={(v) => setValues((all) => ({ ...all, [step.id]: v }))}
      />
    );
  } else {
    body = <p className="font-body text-sm text-plume-500">This component has no preview yet.</p>;
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
