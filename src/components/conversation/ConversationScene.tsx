"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_MESSAGE_CHARS, type ConvMsg, type FinishResult, type Stance, type TurnResult } from "@/lib/conversation";
import { getMove, type Move } from "@/lib/moves";
import { PARTNER_PALETTE, companionStage, getSpecies, partnerStage, type SpeciesId } from "@/lib/companion";
import type { EquippedCosmetics } from "@/lib/shop";
import { FlatTurkey } from "@/components/gamification/FlatTurkey";
import { AvatarWithItems } from "@/components/gamification/AvatarWithItems";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { MoveChips } from "./MoveChips";
import { SpeechBubble } from "./SpeechBubble";
import { TranscriptSheet } from "./TranscriptSheet";
import { TypingDots } from "./TypingDots";

/**
 * The conversation: your turkey and the partner's turkey in a scene, each with a speech bubble,
 * an input dock with optional move hints, a transcript sheet and a wrap-up. No scores are shown
 * anywhere until `onFinish`.
 */
export interface ConversationYou {
  speciesId: SpeciesId | null;
  level: number;
  hatched: boolean;
  equipped?: EquippedCosmetics | null;
}

export interface ConversationSceneProps {
  debateId: string;
  topic: string;
  personaInitials: string;
  difficulty: string;
  userStance: Stance | null;
  initialMessages: ConvMsg[];
  maxTurns: number;
  moves: Move[];
  you: ConversationYou;
  onFinish: (result: FinishResult) => void;
  onLeave?: () => void;
}

const TEXTAREA_MAX_HEIGHT_PX = 160;

export function ConversationScene({
  debateId,
  topic,
  personaInitials,
  difficulty,
  userStance,
  initialMessages,
  maxTurns,
  moves,
  you,
  onFinish,
  onLeave,
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
  const [moveId, setMoveId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const species = getSpecies(you.speciesId);
  const selectedMove = moveId ? (moves.find((m) => m.id === moveId) ?? getMove(moveId)) : undefined;

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

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || finishing) return;
    setLoading(true);
    setSendError(null);
    setPending(text);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debateId, message: text, ...(moveId ? { moveId } : {}) }),
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
        { role: "user", content: text, moveId },
        { role: "assistant", content: data.aiResponse as string },
      ]);
      setTurnNumber(data.turnNumber ?? turnNumber + 1);
      setInput("");
      setMoveId(null);
      setPending(null);
    } catch {
      setSendError("Couldn't reach the server. Your message is still here.");
      setPending(null);
    } finally {
      setLoading(false);
    }
  }, [input, loading, finishing, debateId, moveId, maxTurns, turnNumber]);

  const handleFinish = useCallback(async () => {
    setFinishing(true);
    setFinishError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debateId, message: "", finish: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.finished) {
        // Stay in the "wrapping up" state: the parent swaps this view for the results.
        onFinish(data as FinishResult);
        return;
      }
      setFinishError(data.error || "We couldn't wrap that up. Give it another try.");
    } catch {
      setFinishError("Couldn't reach the server. Check your connection and try again.");
    }
    setFinishing(false);
  }, [debateId, onFinish]);

  const atMaxTurns = turnNumber >= maxTurns;
  const busy = loading || finishing;
  const lastPartner = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? null;
  const lastYou = pending ?? [...messages].reverse().find((m) => m.role === "user")?.content ?? null;
  const turkeyPx = compact ? 84 : 120;

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
              <FlatTurkey stage={1} size="md" />
              <p className="font-body text-sm text-ink-soft">{finishError}</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleFinish}>Try again</Button>
                <Button size="sm" variant="ghost" onClick={() => setFinishError(null)}>Back to the conversation</Button>
              </div>
            </>
          ) : (
            <>
              <FlatTurkey stage={3} size="md" animate />
              <p className="font-display text-lg font-bold tracking-[-0.02em]">Wrapping up…</p>
              <p className="font-body text-sm text-ink-soft">Looking back over your conversation and counting feathers.</p>
            </>
          )}
        </div>
      )}

      {/* Top bar */}
      <header className="border-b border-line bg-surface px-3 py-2 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-2">
            {onLeave && (
              <Button variant="ghost" size="sm" onClick={onLeave} disabled={finishing} className="-ml-1 shrink-0 px-2.5">
                <Icon name="arrow-left" size={16} strokeWidth={2} />
                Leave
              </Button>
            )}
            <div className="min-w-0 flex-1 rounded-xl bg-bg px-3 py-1.5" title={topic}>
              <span className="block truncate font-body text-xs font-semibold text-ink">{topic}</span>
            </div>
            {turnNumber >= 2 && !atMaxTurns && (
              <Button variant="outline" size="sm" onClick={handleFinish} disabled={busy} className="shrink-0">
                Wrap up
              </Button>
            )}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
              Round {turnNumber}/{maxTurns}
            </span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: `${Math.min(100, (turnNumber / maxTurns) * 100)}%` }}
              />
            </div>
            {userStance && (
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                You: {userStance}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Scene */}
      <div className="min-h-0 flex-1 bg-gradient-to-b from-surface-2 to-bg">
        <div className="mx-auto flex h-full max-w-3xl flex-col justify-between gap-2 px-3 py-3 sm:px-8">
          {/* Partner, top right */}
          <div className="flex min-h-0 items-start gap-3">
            <SpeechBubble
              tail="right"
              live
              label={`${personaInitials} says`}
              maxHeightClass="max-h-[10.5rem]"
              className="flex-1"
            >
              {loading || !lastPartner ? <TypingDots /> : <p className="whitespace-pre-wrap">{lastPartner}</p>}
            </SpeechBubble>
            <div className="flex shrink-0 flex-col items-center">
              <FlatTurkey stage={partnerStage(difficulty)} size={turkeyPx} palette={PARTNER_PALETTE} />
              <span className="-mt-1 rounded-full border border-line bg-surface px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
                {personaInitials}
              </span>
            </div>
          </div>

          {/* You, bottom left */}
          <div className="flex min-h-0 items-end gap-3">
            <AvatarWithItems
              stage={companionStage(you.level, you.hatched)}
              size={turkeyPx}
              palette={species.palette}
              equipped={you.equipped ?? {}}
            />
            {lastYou && (
              <SpeechBubble tail="left" tone="you" maxHeightClass="max-h-24" className="mb-6 max-w-[75%] flex-1">
                <p className="whitespace-pre-wrap text-[13px] leading-5">{lastYou}</p>
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
              <div className="mb-2 flex items-center gap-2">
                <MoveChips moves={moves} selectedId={moveId} onSelect={setMoveId} disabled={busy} className="flex-1" />
                <Button variant="ghost" size="sm" onClick={() => setSheetOpen(true)} className="shrink-0">
                  Transcript
                </Button>
              </div>
              {selectedMove && (
                <p className="mb-2 rounded-xl bg-ochre-soft px-3 py-2 font-body text-xs text-ink">
                  <span className="font-semibold">{selectedMove.name}: </span>
                  {selectedMove.hint}
                </p>
              )}
              {sendError && (
                <div role="alert" className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2">
                  <span className="font-body text-xs text-plume-500">{sendError}</span>
                  <Button size="sm" variant="outline" onClick={() => void sendMessage()} disabled={busy || !input.trim()} className="shrink-0">
                    Retry
                  </Button>
                </div>
              )}
              <form
                onSubmit={(e) => { e.preventDefault(); void sendMessage(); }}
                className="flex items-end gap-2 rounded-2xl border border-line bg-surface py-1.5 pl-4 pr-1.5 focus-within:border-primary"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (input.trim() && !busy) void sendMessage();
                      }
                    }}
                    // The keyboard slides in after focus; keep the page pinned to the top once it settles.
                    onFocus={() => window.setTimeout(() => window.scrollTo(0, 0), 350)}
                    rows={1}
                    placeholder="Your reply…"
                    aria-label="Your message"
                    disabled={busy}
                    // 16px on phones: anything smaller makes iOS zoom the page when the field is focused.
                    className="min-h-[28px] w-full resize-none bg-transparent py-2 font-body text-base text-ink placeholder:text-ink-muted focus:outline-none sm:text-sm"
                  />
                  {input.length > MAX_MESSAGE_CHARS * 0.8 && (
                    <span className={`mb-1 self-end font-mono text-[10px] ${input.length >= MAX_MESSAGE_CHARS ? "text-plume-500" : "text-ink-muted"}`}>
                      {input.length}/{MAX_MESSAGE_CHARS}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-bg transition-opacity disabled:opacity-30"
                  aria-label="Send"
                >
                  <Icon name="arrow-right" size={16} strokeWidth={2} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <TranscriptSheet open={sheetOpen} onClose={() => setSheetOpen(false)} messages={messages} initials={personaInitials} />
    </div>
  );
}
