"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { ChatMsg } from "@/components/chat/ChatInterface";
import { PreviewChat } from "@/components/studio/PreviewChat";
import {
  BRIDGE,
  FINAL_NOTE,
  GUIDE_NAME,
  GUIDE_STEP,
  LIFE,
  MATTERS,
  MEASURES,
  NONE_OF_THESE,
  RECAP,
  STAGE_LABELS,
  STORY,
  TOPIC_TITLE,
} from "@/lib/knowledge/content";
import { OptionalNote, PickMany, QuestionSeries } from "./Choices";
import { EntryGate, type GateResult } from "./EntryGate";
import { ResourcePanel, type ResourceKey } from "./Resources";

type Stage = "pre" | "gate" | "life" | "matters" | "story" | "bridge" | "chat" | "post" | "final" | "recap";

/** Which of the five progress segments each stage belongs to. */
const SEGMENT: Record<Stage, number> = {
  pre: 0,
  gate: 1,
  life: 2,
  matters: 2,
  story: 2,
  bridge: 2,
  chat: 3,
  post: 4,
  final: 4,
  recap: 4,
};

/** The resources sit beside everything after the entry screen, until the recap. */
const PANEL_STAGES: Stage[] = ["life", "matters", "story", "bridge", "chat", "post", "final"];

interface Opened {
  resource: ResourceKey;
  at: string;
  stage: Stage;
}

/**
 * The "help people who feel they don't know much about politics" prototype, start to finish.
 * Warm-up questions, the entry screen where they choose how much help they want, a few
 * questions that connect their own life to the topic, a conversation with a guide, and a
 * recap. Everything is held in this component and nothing is saved anywhere.
 */
export function KnowledgeFlow() {
  const [runKey, setRunKey] = useState(0);
  const [stage, setStage] = useState<Stage>("pre");
  const [pre, setPre] = useState<Record<string, string>>({});
  const [post, setPost] = useState<Record<string, string>>({});
  const [gate, setGate] = useState<GateResult | null>(null);
  const [life, setLife] = useState<string[]>([]);
  const [matters, setMatters] = useState<string[]>([]);
  const [story, setStory] = useState("");
  const [finalNote, setFinalNote] = useState("");
  const [opens, setOpens] = useState<Opened[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatDone, setChatDone] = useState(false);

  const viewed: Record<ResourceKey, boolean> = {
    basics: gate?.basics === true || opens.some((o) => o.resource === "basics"),
    perspectives: gate?.perspectives === true || opens.some((o) => o.resource === "perspectives"),
  };

  // What the guide is told about this person. Filled into the prompt's {names} by the server.
  const chatAnswers = useMemo(
    () => ({
      life_connections: life.join("; "),
      matters_most: matters.length > 0 ? matters.join("; ") : "(they didn't pick any)",
      story_text: story.trim() || "(they chose not to write more)",
    }),
    [life, matters, story],
  );

  function restart() {
    setStage("pre");
    setPre({});
    setPost({});
    setGate(null);
    setLife([]);
    setMatters([]);
    setStory("");
    setFinalNote("");
    setOpens([]);
    setChat([]);
    setChatDone(false);
    setRunKey((k) => k + 1);
  }

  const showPanel = PANEL_STAGES.indexOf(stage) >= 0;
  const segment = SEGMENT[stage];

  const body = (
    <div key={`${runKey}-${stage}`}>
      {stage === "pre" && (
        <>
          <Intro />
          <QuestionSeries
            questions={MEASURES}
            answers={pre}
            onAnswer={(k, v) => setPre((p) => ({ ...p, [k]: v }))}
            onComplete={() => setStage("gate")}
          />
        </>
      )}

      {stage === "gate" && (
        <EntryGate
          onDone={(result) => {
            setGate(result);
            setStage("life");
          }}
        />
      )}

      {stage === "life" && (
        <PickMany
          prompt={LIFE.prompt}
          help={LIFE.help}
          options={LIFE.options}
          exclusive={NONE_OF_THESE}
          value={life}
          onChange={setLife}
          onContinue={() => setStage("matters")}
        />
      )}

      {stage === "matters" && (
        <PickMany
          prompt={MATTERS.prompt}
          help={MATTERS.help}
          options={MATTERS.options}
          max={MATTERS.max}
          value={matters}
          onChange={setMatters}
          onContinue={() => setStage("story")}
        />
      )}

      {stage === "story" && (
        <OptionalNote
          prompt={STORY.prompt}
          help={STORY.help}
          placeholder={STORY.placeholder}
          maxLength={STORY.maxLength}
          skipLabel={STORY.skip}
          value={story}
          onChange={setStory}
          onContinue={() => setStage("bridge")}
          onSkip={() => {
            setStory("");
            setStage("bridge");
          }}
        />
      )}

      {stage === "bridge" && <Bridge life={life} matters={matters} story={story} onContinue={() => setStage("chat")} />}

      {stage === "chat" && (
        <div className="animate-slide-up">
          <h2 className="mb-3 font-display text-xl font-bold leading-snug tracking-[-0.02em] sm:text-2xl">
            A chat about your experience
          </h2>
          <div className="h-[32rem]">
            <PreviewChat
              stepProps={GUIDE_STEP}
              answers={chatAnswers}
              guideName={GUIDE_NAME}
              onMessagesChange={setChat}
              onFinish={() => setChatDone(true)}
            />
          </div>
          <div className="mt-4">
            <Button disabled={!chatDone} onClick={() => setStage("post")}>
              Continue
              <Icon name="arrow-right" size={16} />
            </Button>
            {!chatDone && (
              <span className="ml-3 font-body text-xs text-ink-muted">
                You can wrap up after a couple of messages.
              </span>
            )}
          </div>
        </div>
      )}

      {stage === "post" && (
        <>
          <p className="mb-5 font-body text-sm text-ink-soft">
            Almost done. The same three questions as at the start, so we can see if anything changed.
          </p>
          <QuestionSeries
            questions={MEASURES}
            answers={post}
            onAnswer={(k, v) => setPost((p) => ({ ...p, [k]: v }))}
            onComplete={() => setStage("final")}
          />
        </>
      )}

      {stage === "final" && (
        <OptionalNote
          prompt={FINAL_NOTE.prompt}
          help={FINAL_NOTE.help}
          placeholder={FINAL_NOTE.placeholder}
          maxLength={FINAL_NOTE.maxLength}
          skipLabel={FINAL_NOTE.skip}
          value={finalNote}
          onChange={setFinalNote}
          onContinue={() => setStage("recap")}
          onSkip={() => {
            setFinalNote("");
            setStage("recap");
          }}
        />
      )}

      {stage === "recap" && (
        <Recap
          life={life}
          matters={matters}
          story={story}
          finalNote={finalNote}
          pre={pre}
          post={post}
          gate={gate}
          opens={opens}
          chat={chat}
          onRestart={restart}
        />
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Progress segment={segment} />
      <div className={showPanel ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]" : ""}>
        <div className={showPanel ? "min-w-0" : "mx-auto w-full max-w-2xl"}>{body}</div>
        {showPanel && (
          <ResourcePanel
            viewed={viewed}
            onOpen={(resource) => setOpens((o) => [...o, { resource, at: new Date().toISOString(), stage }])}
          />
        )}
      </div>
    </div>
  );
}

function Progress({ segment }: { segment: number }) {
  return (
    <div className="mx-auto mb-8 w-full max-w-2xl">
      <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={5} aria-valuenow={segment + 1}>
        {STAGE_LABELS.map((label, i) => (
          <div key={label} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= segment ? "bg-primary" : "bg-line"}`} />
        ))}
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
        {segment + 1} of {STAGE_LABELS.length} · {STAGE_LABELS[segment]}
      </p>
    </div>
  );
}

function Intro() {
  return (
    <div className="mb-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary">A short practice conversation</p>
      <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-[-0.03em] sm:text-4xl">
        You may know more than you think.
      </h1>
      <p className="mt-3 font-body text-base text-ink-soft">
        First, three quick questions about where you are right now. There are no right answers.
      </p>
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-primary/30 bg-primary-soft px-3 py-1.5 font-body text-xs font-semibold text-gobbl-700"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function Bridge({
  life,
  matters,
  story,
  onContinue,
}: {
  life: string[];
  matters: string[];
  story: string;
  onContinue: () => void;
}) {
  const connections = life.filter((l) => l !== NONE_OF_THESE);
  return (
    <div className="animate-slide-up">
      <h2 className="font-display text-xl font-bold leading-snug tracking-[-0.02em] sm:text-2xl">{BRIDGE.title}</h2>
      <div className="mt-5 flex flex-col gap-5 rounded-3xl border border-line bg-surface p-5 sm:p-6">
        {connections.length > 0 ? (
          <div>
            <p className="mb-2 font-body text-sm font-semibold">{BRIDGE.intro}</p>
            <Chips items={connections} />
          </div>
        ) : (
          <p className="font-body text-sm text-ink-soft">{BRIDGE.noConnections}</p>
        )}
        {matters.length > 0 && (
          <div>
            <p className="mb-2 font-body text-sm font-semibold">{BRIDGE.mattersIntro}</p>
            <Chips items={matters} />
          </div>
        )}
        {story.trim() && (
          <div>
            <p className="mb-2 font-body text-sm font-semibold">{BRIDGE.storyIntro}</p>
            <blockquote className="border-l-4 border-primary/40 pl-3 font-body text-sm italic text-ink-soft">
              {story.trim()}
            </blockquote>
          </div>
        )}
      </div>
      <p className="mt-5 font-body text-sm text-ink-soft">{BRIDGE.outro}</p>
      <div className="mt-6">
        <Button size="lg" onClick={onContinue}>
          {BRIDGE.button}
          <Icon name="arrow-right" size={18} />
        </Button>
      </div>
    </div>
  );
}

const MEASURE_SHORT: Record<string, string> = {
  comfort: "Comfort talking about it",
  know: "How much you know",
  connect: "Connections to your own life",
};

function Recap({
  life,
  matters,
  story,
  finalNote,
  pre,
  post,
  gate,
  opens,
  chat,
  onRestart,
}: {
  life: string[];
  matters: string[];
  story: string;
  finalNote: string;
  pre: Record<string, string>;
  post: Record<string, string>;
  gate: GateResult | null;
  opens: Opened[];
  chat: ChatMsg[];
  onRestart: () => void;
}) {
  const [showData, setShowData] = useState(false);
  const connections = life.filter((l) => l !== NONE_OF_THESE);
  const recorded = {
    topic: TOPIC_TITLE,
    entry: gate,
    openedBesideTheChat: opens,
    before: pre,
    after: post,
    life,
    matters,
    story: story.trim() || null,
    finalNote: finalNote.trim() || null,
    chatMessagesFromLearner: chat.filter((m) => m.role === "user").length,
  };

  return (
    <div className="animate-slide-up">
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft">
        <Icon name="feather" size={22} />
      </div>
      <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-[-0.03em]">{RECAP.title}</h2>
      <p className="mt-2 font-body text-sm text-ink-soft">{RECAP.intro}</p>

      <div className="mt-6 flex flex-col gap-5 rounded-3xl border border-line bg-surface p-5 sm:p-6">
        {connections.length > 0 && (
          <div>
            <p className="mb-2 font-body text-sm font-semibold">Parts of your life that touch this topic</p>
            <Chips items={connections} />
          </div>
        )}
        {matters.length > 0 && (
          <div>
            <p className="mb-2 font-body text-sm font-semibold">What you&apos;d pay attention to</p>
            <Chips items={matters} />
          </div>
        )}
        {(story.trim() || finalNote.trim()) && (
          <div className="flex flex-col gap-3">
            {story.trim() && (
              <blockquote className="border-l-4 border-primary/40 pl-3 font-body text-sm italic text-ink-soft">
                {story.trim()}
              </blockquote>
            )}
            {finalNote.trim() && (
              <blockquote className="border-l-4 border-primary/40 pl-3 font-body text-sm italic text-ink-soft">
                {finalNote.trim()}
              </blockquote>
            )}
          </div>
        )}
      </div>

      <section className="mt-5 rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <h3 className="font-display text-base font-bold">Before and after</h3>
        <ul className="mt-3 flex flex-col gap-3">
          {MEASURES.map((m) => (
            <li key={m.key} className="font-body text-sm">
              <div className="font-semibold">{MEASURE_SHORT[m.key] ?? m.key}</div>
              <div className="text-ink-soft">
                {pre[m.key] ?? "no answer"} <span className="text-ink-muted">→</span> {post[m.key] ?? "no answer"}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-5">
        <button
          type="button"
          onClick={() => setShowData((s) => !s)}
          className="flex items-center gap-1.5 font-body text-xs font-semibold text-ink-soft hover:text-ink"
        >
          <Icon name="chevron-down" size={14} className={showData ? "rotate-180" : ""} />
          For the team: what this run recorded
        </button>
        {showData && (
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-surface-2 p-3 font-mono text-xs text-ink-soft">
            {JSON.stringify(recorded, null, 2)}
          </pre>
        )}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button variant="outline" onClick={onRestart}>
          {RECAP.again}
        </Button>
        <span className="font-body text-xs text-ink-muted">{RECAP.doneNote}</span>
      </div>
    </div>
  );
}
