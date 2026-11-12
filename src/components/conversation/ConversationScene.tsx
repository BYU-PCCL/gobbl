"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_MESSAGE_CHARS, type ConvMsg, type FinishResult, type Stance, type TurnResult } from "@/lib/conversation";
import type { TurkeyView } from "@/lib/flock/view";
import { MyTurkey } from "@/components/turkey/MyTurkey";
import { PartnerTurkey } from "@/components/turkey/PartnerTurkey";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { LeaveConfirm } from "@/components/ui/LeaveConfirm";
import { Sheet } from "@/components/ui/Sheet";
import { Composer } from "./Composer";
import { SpeechBubble } from "./SpeechBubble";
import { TranscriptSheet } from "./TranscriptSheet";
import { TypingDots } from "./TypingDots";

/**
 * The conversation: your turkey and the partner's turkey in a scene, each with a speech bubble,
 * an input dock, a transcript sheet and a wrap-up. No scores are shown
 * anywhere until `onFinish`.
 */
export interface ConversationSceneProps {
  debateId: string;
  topic: string;
  personaInitials: string;
  /** For the partner's colours. */
  personaId: string | null;
  difficulty: string;
  userStance: Stance | null;
  initialMessages: ConvMsg[];
  maxTurns: number;
  turkey: TurkeyView | null;
  onFinish: (result: FinishResult) => void;
  onLeave?: () => void;
  /** Ask before leaving once a message has been sent. Default true. */
  confirmLeave?: boolean;
  /** Wording for that question, when the default ("It won't count...") does not fit. */
  leaveBody?: string;
}

const TEXTAREA_MAX_HEIGHT_PX = 160;
const SEND_TIMEOUT_MS = 45_000;
const FINISH_TIMEOUT_MS = 30_000;
/** After this long wrapping up, offer a Cancel. */
const FINISH_SLOW_MS = 15_000;

export function ConversationScene({
  debateId,
  topic,
  personaInitials,
  personaId,
  difficulty,
  userStance,
  initialMessages,
  maxTurns,
  turkey,
  onFinish,
  onLeave,
  confirmLeave = true,
  leaveBody = "It won't count, and you'll start fresh next time.",
}: ConversationSceneProps) {
  const [messages, setMessages] = useState<ConvMsg[]>(() =>
    initialMessages.filter((m) => m.role !== "user" || m.content.trim() !== ""),
  );
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [turnNumber, setTurnNumber] = useState(
    () => initialMessages.filter((m) => m.role === "user" && m.content.trim() !== "").length,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [topicOpen, setTopicOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [finishSlow, setFinishSlow] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const youBubbleRef = useRef<HTMLDivElement>(null);
  const finishAbortRef = useRef<AbortController | null>(null);
  const finishCancelledRef = useRef(false);

  const partnerLabel = personaInitials;

  // Shrink the turkeys when the on-screen keyboard leaves little room for the scene.
  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => setCompact((vv?.height ?? window.innerHeight) < 600);
    update();
    vv?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`;
    el.style.overflowY = el.scrollHeight > TEXTAREA_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, [input]);

  // After a while wrapping up, offer a way out.
  useEffect(() => {
    setFinishSlow(false);
    if (!finishing) return;
    const t = window.setTimeout(() => setFinishSlow(true), FINISH_SLOW_MS);
    return () => window.clearTimeout(t);
  }, [finishing]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || finishing) return;
    setLoading(true);
    setSendError(null);
    setPending(text);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debateId, message: text }),
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => ({}))) as Partial<TurnResult> & { error?: string };
      if (!res.ok || typeof data.aiResponse !== "string") {
        if (res.status === 409 && /limit/i.test(data.error ?? "")) setTurnNumber(maxTurns);
        setSendError(data.error || "That didn't go through. Your message is still here.");
        setPending(null);
        return;
      }
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: data.aiResponse as string },
      ]);
      setTurnNumber(data.turnNumber ?? turnNumber + 1);
      setInput("");
      setPending(null);
    } catch {
      setSendError(
        controller.signal.aborted
          ? "That didn't go through. Your message is still here."
          : "Couldn't reach the server. Your message is still here.",
      );
      setPending(null);
    } finally {
      window.clearTimeout(timer);
      setLoading(false);
    }
  }, [input, loading, finishing, debateId, maxTurns, turnNumber]);

  const handleFinish = useCallback(async () => {
    setFinishing(true);
    setFinishError(null);
    finishCancelledRef.current = false;
    const controller = new AbortController();
    finishAbortRef.current = controller;
    const timer = window.setTimeout(() => controller.abort(), FINISH_TIMEOUT_MS);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debateId, message: "", finish: true }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (data.finished) {
        // Stay in the "wrapping up" state: the parent swaps this view for the results.
        onFinish(data as FinishResult);
        return;
      }
      setFinishError(data.error || "We couldn't wrap that up. Give it another try.");
    } catch {
      if (finishCancelledRef.current) {
        // The user chose to go back: no error, just the conversation.
      } else if (controller.signal.aborted) {
        setFinishError("Wrapping up took too long. Give it another try.");
      } else {
        setFinishError("Couldn't reach the server. Check your connection and try again.");
      }
    } finally {
      window.clearTimeout(timer);
    }
    setFinishing(false);
  }, [debateId, onFinish]);

  const cancelFinish = useCallback(() => {
    finishCancelledRef.current = true;
    finishAbortRef.current?.abort();
    setFinishError(null);
    setFinishing(false);
  }, []);

  const requestLeave = () => {
    if (!onLeave) return;
    const sentSomething = turnNumber > 0 || messages.some((m) => m.role === "user");
    if (confirmLeave && sentSomething) setLeaveOpen(true);
    else onLeave();
  };

  const atMaxTurns = turnNumber >= maxTurns;
  const busy = loading || finishing;
  const lastPartner = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? null;
  const lastYou = pending ?? [...messages].reverse().find((m) => m.role === "user")?.content ?? null;
  const turkeyPx = compact ? 84 : 120;

  // A new line in the "you" bubble starts at its top, not wherever the last one was scrolled to.
  useEffect(() => {
    if (youBubbleRef.current) youBubbleRef.current.scrollTop = 0;
  }, [lastYou, lastPartner]);

  return (
    <div className="relative flex h-full flex-col bg-bg">
      {(finishing || finishError) && (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-bg/85 px-6 text-center backdrop-blur-sm"
        >
          {finishError ? (
            <>
              <MyTurkey turkey={turkey} size={96} inScene />
              <p className="font-body text-sm text-ink-soft">{finishError}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={handleFinish}>Try again</Button>
                <Button size="sm" variant="ghost" onClick={() => setFinishError(null)}>Back to the conversation</Button>
              </div>
            </>
          ) : (
            <>
              <MyTurkey turkey={turkey} size={96} inScene />
              <p className="font-display text-lg font-bold tracking-[-0.02em]">Wrapping up...</p>
              <p className="font-body text-sm text-ink-soft">Looking back over your conversation and counting feathers.</p>
              {finishSlow && (
                <div className="flex flex-col items-center gap-2">
                  <p className="font-body text-sm text-ink-soft">Still working...</p>
                  <Button size="sm" variant="outline" onClick={cancelFinish}>Cancel</Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Top bar */}
      <header className="border-b border-line bg-surface px-3 pb-2 pt-[max(env(safe-area-inset-top),0.5rem)] sm:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-2">
            {onLeave && (
              <Button variant="ghost" size="sm" onClick={requestLeave} className="-ml-1 shrink-0 px-2.5">
                <Icon name="arrow-left" size={16} strokeWidth={2} />
                Leave
              </Button>
            )}
            <button
              type="button"
              onClick={() => setTopicOpen(true)}
              aria-label={`Topic: ${topic}. Show the full question`}
              className="min-h-11 min-w-0 flex-1 rounded-xl bg-bg px-3 py-1.5 text-left"
            >
              <span className="block truncate font-body text-xs font-semibold text-ink">{topic}</span>
            </button>
            {turnNumber >= 2 && !atMaxTurns && (
              <Button variant="outline" size="sm" onClick={handleFinish} disabled={busy} className="shrink-0">
                Wrap up
              </Button>
            )}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span className="shrink-0 font-mono text-xs uppercase tracking-[0.08em] text-ink-muted">
              Round {Math.min(turnNumber + 1, maxTurns)} of {maxTurns}
            </span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: `${Math.min(100, (turnNumber / maxTurns) * 100)}%` }}
              />
            </div>
            {userStance && (
              <span className="shrink-0 font-mono text-xs uppercase tracking-[0.08em] text-ink-muted">
                You: {userStance}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={() => setSheetOpen(true)} className="-mr-1 shrink-0 px-2.5 sm:hidden">
              Transcript
            </Button>
          </div>
        </div>
      </header>

      {/* Scene */}
      <div className="min-h-0 flex-1 bg-gradient-to-b from-surface-2 to-bg">
        <div className="mx-auto flex h-full max-w-2xl flex-col justify-center gap-6 px-3 py-3 sm:gap-8 sm:px-8">
          {/* Partner, right */}
          <div className="flex min-h-0 items-start gap-3">
            <SpeechBubble
              tail="right"
              live
              label={`${partnerLabel} says`}
              maxHeightClass="max-h-[min(22rem,38vh)]"
              className="flex-1"
            >
              {loading ? (
                <TypingDots />
              ) : lastPartner ? (
                <p className="whitespace-pre-wrap">{lastPartner}</p>
              ) : (
                <p className="text-ink-soft">Say hello to start.</p>
              )}
            </SpeechBubble>
            <div className="flex shrink-0 flex-col items-center">
              <PartnerTurkey personaId={personaId} initials={personaInitials} size={turkeyPx} />
              <span className="-mt-1 rounded-full border border-line bg-surface px-2.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">
                {partnerLabel}
              </span>
            </div>
          </div>

          {/* You, left */}
          <div className="flex min-h-0 items-end gap-3">
            <MyTurkey turkey={turkey} size={turkeyPx} inScene flip />
            {lastYou && (
              <SpeechBubble ref={youBubbleRef} tail="left" tone="you" maxHeightClass="max-h-[30vh]" className="mb-6 max-w-[75%] flex-1">
                <p className="whitespace-pre-wrap text-sm leading-6">{lastYou}</p>
              </SpeechBubble>
            )}
          </div>
        </div>
      </div>

      {/* Input dock */}
      <div className="border-t border-line bg-bg px-3.5 py-2.5 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:px-8">
        <div className="mx-auto max-w-3xl">
          {atMaxTurns ? (
            <div className="text-center">
              <p className="mb-3 font-body text-sm text-ink-soft">All rounds complete.</p>
              <div className="flex justify-center gap-2">
                <Button onClick={handleFinish} disabled={busy}>See how it went</Button>
                <Button variant="ghost" onClick={() => setSheetOpen(true)}>Transcript</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-2 hidden items-center gap-2 sm:flex">
                <Button variant="ghost" size="sm" onClick={() => setSheetOpen(true)} className="ml-auto shrink-0">
                  Transcript
                </Button>
              </div>
              {sendError && (
                <div role="alert" className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2">
                  <span className="font-body text-sm text-danger">{sendError}</span>
                  <Button size="sm" variant="outline" onClick={() => void sendMessage()} disabled={busy || !input.trim()} className="shrink-0">
                    Retry
                  </Button>
                </div>
              )}
              <Composer
                value={input}
                onChange={setInput}
                onSubmit={() => void sendMessage()}
                busy={busy}
                maxChars={MAX_MESSAGE_CHARS}
                placeholder="Your reply..."
                ariaLabel="Your message"
                textareaRef={textareaRef}
                // The keyboard slides in after focus; keep the page pinned to the top once it settles.
                onFocus={() => window.setTimeout(() => window.scrollTo(0, 0), 350)}
              />
            </>
          )}
        </div>
      </div>

      <TranscriptSheet open={sheetOpen} onClose={() => setSheetOpen(false)} messages={messages} initials={partnerLabel} />
      <Sheet open={topicOpen} onClose={() => setTopicOpen(false)} title="Topic">
        <p className="break-words font-body text-base leading-7 text-ink">{topic}</p>
      </Sheet>
      <LeaveConfirm
        open={leaveOpen}
        title="Leave this conversation?"
        body={leaveBody}
        onStay={() => setLeaveOpen(false)}
        onLeave={() => {
          setLeaveOpen(false);
          onLeave?.();
        }}
      />
    </div>
  );
}
