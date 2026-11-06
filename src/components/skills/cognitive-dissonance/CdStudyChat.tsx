"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomStepProps } from "../custom-steps";
import { DiscomfortButton, type DiscomfortButtonValue } from "../DiscomfortButton";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { useVisualViewportHeight } from "@/components/chat/useVisualViewportHeight";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

/**
 * What this step saves on Continue (stepResponses[stepId]). The transcript and the individual
 * discomfort presses are saved by the chat route as the conversation goes.
 */
export interface CdStudyChatValue {
  ended: boolean;
  discomfortCount?: number;
}

export function isCdStudyChatComplete(value: unknown): boolean {
  return !!(value as CdStudyChatValue | undefined)?.ended;
}

const API = "/api/cognitive-dissonance/chat";
const MIN_CHARS = 2;
/**
 * The study blocks pasting into the chat. Off for now so prompts are easier to test; turn it
 * back on to match the treatment. Pastes are recorded (pasteAttempted) either way.
 */
const BLOCK_PASTE = false;
const MAX_CHARS = 2000;
const TEXTAREA_MAX_HEIGHT_PX = 200;
const NO_PRESSES: DiscomfortButtonValue = { count: 0, presses: [] };

type Status = "loading" | "ready" | "waiting" | "failed-start" | "failed-reply";

/**
 * Cognitive Dissonance study conversation (custom step "cd-study-chat").
 *
 * props (from registry.ts): { stepId: string; chat: "dynamic" | "conversation"; discomfortButton?: boolean }
 *
 * The AI opens, and the chat ends when the AI concludes (or at the turn cap), not when the user
 * chooses: there is no Wrap up button, round counter or scoring. While the chat is going it
 * takes over the screen on phones (like the practice chat); once it ends it shrinks to a card
 * so the runner's Continue button shows.
 */
export function CdStudyChat(p: CustomStepProps) {
  // Two chat steps in a row render at the same spot in the runner, so without a key React would
  // reuse the first chat's state (messages, ended) for the second one.
  return <StudyChat key={String(p.props.stepId)} {...p} />;
}

function StudyChat({ props, onChange }: CustomStepProps) {
  const router = useRouter();
  const stepId = typeof props.stepId === "string" ? props.stepId : "";
  const showButton = props.discomfortButton === true;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [ended, setEnded] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [discomfort, setDiscomfort] = useState<DiscomfortButtonValue>(NO_PRESSES);
  const pasteAttempted = useRef(false);
  const started = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const active = !ended;
  useVisualViewportHeight(active);

  // Keep the runner's copy of this step's answer current (Continue sends it).
  useEffect(() => {
    onChange({ ended, ...(showButton ? { discomfortCount: discomfort.count } : {}) } satisfies CdStudyChatValue);
    // onChange is a state setter from the runner; leaving it out avoids re-running on its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended, discomfort.count, showButton]);

  // Save presses as they happen, one request at a time; if more presses come in while one is
  // in flight, the latest full list is sent once it finishes.
  const pressSync = useRef<{ inFlight: boolean; pending: DiscomfortButtonValue | null }>({ inFlight: false, pending: null });
  const syncPresses = useCallback(
    async (next: DiscomfortButtonValue) => {
      const s = pressSync.current;
      if (s.inFlight) {
        s.pending = next;
        return;
      }
      s.inFlight = true;
      let toSend: DiscomfortButtonValue | null = next;
      while (toSend) {
        try {
          await fetch(API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stepId, action: "discomfort", discomfort: toSend }),
          });
        } catch {
          // The count still goes with Continue; a later press resends the full list.
        }
        toSend = s.pending;
        s.pending = null;
      }
      s.inFlight = false;
    },
    [stepId],
  );
  const onPress = (v: unknown) => {
    const next = v as DiscomfortButtonValue;
    setDiscomfort(next);
    void syncPresses(next);
  };

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, data };
    },
    [stepId],
  );

  const applyView = (data: { messages?: Msg[]; ended?: boolean }) => {
    if (Array.isArray(data.messages)) setMessages(data.messages);
    if (typeof data.ended === "boolean") setEnded(data.ended);
  };

  const start = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const { ok, data } = await post({});
      if (!ok) throw new Error(data.error);
      applyView(data);
      setStatus("ready");
    } catch (e) {
      setError((e as Error).message || "Something went wrong starting the conversation.");
      setStatus("failed-start");
    }
  }, [post]);

  // Resume a saved conversation, or start a new one. The ref guard stops React's dev-mode
  // double effect from starting it twice.
  useEffect(() => {
    if (started.current || !stepId) return;
    started.current = true;
    (async () => {
      try {
        const res = await fetch(`${API}?stepId=${encodeURIComponent(stepId)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!data.started) return void start();
        applyView(data);
        if (data.discomfort && showButton) setDiscomfort(data.discomfort);
        const last = data.messages[data.messages.length - 1];
        if (last?.role === "user" && !data.ended) {
          setError("The last reply didn't come through.");
          setStatus("failed-reply");
        } else {
          setStatus("ready");
        }
      } catch (e) {
        setError((e as Error).message || "Couldn't load the conversation.");
        setStatus("failed-start");
      }
    })();
  }, [stepId, start, showButton]);

  const send = async (text?: string) => {
    setStatus("waiting");
    setError(null);
    if (text) setMessages((prev) => [...prev, { role: "user", content: text }]);
    try {
      const { ok, data } = await post({
        ...(text ? { message: text } : {}),
        pasteAttempted: pasteAttempted.current,
      });
      applyView(data); // error responses include the saved conversation when there is one
      if (!ok) {
        if (text && !Array.isArray(data.messages)) {
          // The message never reached the server: put it back so it isn't lost.
          setMessages((prev) => prev.slice(0, -1));
          setInput(text);
          setError(data.error || "Couldn't send that. Please try again.");
          setStatus("ready");
        } else {
          setError(data.error || "Something went wrong reaching the AI.");
          setStatus("failed-reply");
        }
        return;
      }
      setStatus("ready");
    } catch {
      if (text) {
        setMessages((prev) => prev.slice(0, -1));
        setInput(text);
      }
      setError("Couldn't reach the server. Check your connection and try again.");
      setStatus("ready");
    }
  };

  const submit = () => {
    const text = input.trim();
    if (text.length < MIN_CHARS || status !== "ready" || ended) return;
    setInput("");
    void send(text);
  };

  // Scroll to the newest message, and again when the phone keyboard resizes the view.
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
  }, []);
  useEffect(() => scrollToBottom(), [messages, status, scrollToBottom]);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => scrollToBottom("auto");
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, [scrollToBottom]);

  // Auto-grow the textarea.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`;
    el.style.overflowY = el.scrollHeight > TEXTAREA_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, [input]);

  if (!stepId) {
    return <p className="font-body text-sm text-plume-500">This step is missing its stepId prop.</p>;
  }

  const trimmedLength = input.trim().length;

  return (
    <div
      className={
        active
          ? // Same frame as the practice chat in skills/[key]/page.tsx: full screen on phones, a card on desktop.
            "fixed inset-x-0 top-0 z-50 flex h-[var(--vvh,100dvh)] flex-col bg-surface lg:static lg:h-[calc(100dvh-12rem)] lg:min-h-[420px] lg:overflow-hidden lg:rounded-2xl lg:border lg:border-line"
          : "flex h-[60dvh] min-h-[320px] flex-col overflow-hidden rounded-2xl border border-line bg-surface"
      }
    >
      {active && (
        <div className="flex items-center justify-between gap-3 border-b border-line bg-surface py-1.5 pl-4 pr-2 pt-[max(env(safe-area-inset-top),0.375rem)] lg:hidden">
          <span className="truncate font-body text-xs text-ink-soft">Conversation</span>
          <Button variant="ghost" size="sm" onClick={() => router.push("/skills")} className="shrink-0">
            <Icon name="close" size={14} strokeWidth={2} />
            Leave
          </Button>
        </div>
      )}

      {showButton && active && (
        <div className="border-b border-line bg-surface px-4 py-2">
          <DiscomfortButton
            props={{}}
            messages={messages}
            value={discomfort}
            onChange={onPress}
          />
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-3.5">
          {status === "loading" && messages.length === 0 && (
            <p className="py-8 text-center font-body text-sm text-ink-soft">Setting up your conversation…</p>
          )}
          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} content={m.content} />
          ))}
          {status === "waiting" && <TypingDots />}
        </div>
      </div>

      <div className="border-t border-line bg-bg px-3.5 py-2.5 pb-[max(env(safe-area-inset-bottom),1rem)] sm:px-8">
        <div className="mx-auto max-w-3xl">
          {error && (
            <div className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-plume-100 px-3 py-2 font-body text-xs text-plume-700">
              <span>{error}</span>
              {status === "failed-start" && (
                <Button size="sm" variant="outline" onClick={() => void start()}>
                  Retry
                </Button>
              )}
              {status === "failed-reply" && (
                <Button size="sm" variant="outline" onClick={() => void send()}>
                  Retry
                </Button>
              )}
            </div>
          )}
          {ended ? (
            <p className="py-1 text-center font-body text-sm italic text-ink-soft">
              The conversation has ended. Press Continue below to move on.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="flex items-end gap-2 rounded-2xl border border-line bg-surface py-1.5 pl-4 pr-1.5 focus-within:border-primary"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                // Pasting is always recorded; it is only blocked when BLOCK_PASTE is on.
                onPaste={(e) => {
                  if (BLOCK_PASTE) e.preventDefault();
                  pasteAttempted.current = true;
                }}
                onFocus={() => window.setTimeout(() => scrollToBottom("auto"), 350)}
                rows={1}
                placeholder="Your reply…"
                aria-label="Your message"
                disabled={status !== "ready"}
                // 16px on phones: anything smaller makes iOS zoom the page when the field is focused.
                className="min-h-[28px] min-w-0 flex-1 resize-none bg-transparent py-2 font-body text-base text-ink placeholder:text-ink-muted focus:outline-none sm:text-sm"
              />
              <button
                type="submit"
                disabled={status !== "ready" || trimmedLength < MIN_CHARS}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-bg transition-opacity disabled:opacity-30"
                aria-label="Send"
              >
                <Icon name="arrow-right" size={16} strokeWidth={2} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-2">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft">
        <Icon name="feather" size={14} />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-muted" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-muted opacity-60" style={{ animationDelay: "150ms" }} />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-muted opacity-30" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
