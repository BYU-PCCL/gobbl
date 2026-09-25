"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { MessageBubble } from "./MessageBubble";
import type { EquippedCosmetics } from "@/lib/shop";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  civilityScore?: number | null;
}

export interface FinishResult {
  overallScore: number;
  dimensions: Record<string, number> | null;
  xp: { base: number; difficultyBonus: number; dailyBonus: number; streakMultiplier: number; total: number };
  feathers: { base: number; difficultyBonus: number; dailyBonus: number; total: number };
  previousLevel: number;
  newLevel: number;
  newBadges: string[];
  streak: number;
  equippedCosmetics?: EquippedCosmetics;
}

interface ChatInterfaceProps {
  debateId: string;
  initialMessages: ChatMsg[];
  maxTurns: number;
  onFinish: (result: FinishResult) => void;
}

const TEXTAREA_MAX_HEIGHT_PX = 200;
const MAX_CHARS = 500;

/**
 * Debate arena interface — Harvest direction.
 *
 * Top region (provided by parent page): app-bar-style header with Robert's
 * politics + difficulty + live civility meter.
 *
 * This component owns:
 *  - Scroll region of MessageBubbles
 *  - Typing indicator (3 dots, no emoji)
 *  - Rounded-pill text input with an ink "send" button
 */
export function ChatInterface({ debateId, initialMessages, maxTurns, onFinish }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const initialUserTurns = initialMessages.filter((m) => m.role === "user").length;
  const [turnNumber, setTurnNumber] = useState(initialUserTurns);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT_PX);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > TEXTAREA_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, [input]);

  const sendMessage = async (finish = false) => {
    if (!input.trim() && !finish) return;
    const userMsg = input.trim();
    setInput("");
    setLoading(true);
    if (userMsg) setMessages((prev) => [...prev, { role: "user", content: userMsg }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debateId, message: userMsg, finish }),
      });
      const data = await res.json();
      if (data.finished) { onFinish(data); return; }
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length && updated[updated.length - 1].role === "user") {
          updated[updated.length - 1].civilityScore = data.civility?.overall;
        }
        updated.push({
          role: "assistant",
          content: data.aiResponse,
          civilityScore: data.aiCivility?.overall,
        });
        return updated;
      });
      setTurnNumber(data.turnNumber);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Oops, something ruffled my feathers. Let's try that again!" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debateId, message: "", finish: true }),
      });
      const data = await res.json();
      if (data.finished) onFinish(data);
    } finally { setLoading(false); }
  };

  const atMaxTurns = turnNumber >= maxTurns;

  return (
    <div className="flex h-full flex-col">
      {/* Turn progress bar */}
      <div className="flex items-center gap-3 border-b border-line px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
          Round {turnNumber}/{maxTurns}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-ochre transition-[width] duration-500"
            style={{ width: `${(turnNumber / maxTurns) * 100}%` }}
          />
        </div>
        {turnNumber >= 2 && (
          <Button variant="outline" size="sm" onClick={handleFinish} disabled={loading}>
            Wrap up
          </Button>
        )}
      </div>

      {/* Scroll region */}
      <div ref={scrollRef} className="flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            role={m.role}
            content={m.content}
            civilityScore={m.civilityScore}
          />
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M21 3c-7 0-11 5-12 9-1 4 0 8 0 9h2c0-3 1-7 3-10s5-5 7-8z"
                  fill="rgb(228 165 71)" />
              </svg>
            </div>
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-muted" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-muted opacity-60" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-muted opacity-30" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* Input region */}
      <div className="border-t border-line bg-bg px-3.5 py-2.5 pb-4">
        {atMaxTurns ? (
          <div className="text-center">
            <p className="mb-3 font-body text-sm text-ink-soft">
              All rounds complete. Let&apos;s see how you did.
            </p>
            <Button onClick={handleFinish} disabled={loading} loading={loading}>
              See results
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); void sendMessage(); }}
            className="flex items-end gap-2 rounded-2xl border border-line bg-surface py-1.5 pl-4 pr-1.5 focus-within:border-primary"
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !loading) void sendMessage();
                  }
                }}
                rows={1}
                placeholder="Your reply…"
                aria-label="Your message"
                disabled={loading}
                className="min-h-[28px] w-full resize-none bg-transparent py-2 font-body text-sm text-ink placeholder:text-ink-muted focus:outline-none"
              />
              {input.length > MAX_CHARS * 0.8 && (
                <span className={`mb-1 self-end font-mono text-[10px] ${input.length >= MAX_CHARS ? "text-red-500" : "text-ink-muted"}`}>
                  {input.length}/{MAX_CHARS}
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-bg transition-opacity disabled:opacity-30"
              aria-label="Send"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
