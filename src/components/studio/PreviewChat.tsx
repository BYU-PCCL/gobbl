"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { MessageBubble } from "@/components/chat/MessageBubble";
import type { ChatMsg } from "@/components/chat/ChatInterface";

const MAX_CHARS = 500;

/**
 * A chat with the AI partner for Module Studio's preview. It looks like Gobbl's chat but
 * talks to /api/studio/preview/chat: nothing is saved, scored, or counted toward anyone's XP.
 *
 * `stepProps` are the settings of the AI chat step being previewed (topic, difficulty, prompt…).
 */
export function PreviewChat({
  stepProps,
  onMessagesChange,
  onFinish,
}: {
  stepProps: Record<string, unknown>;
  onMessagesChange: (messages: ChatMsg[]) => void;
  onFinish: (messages: ChatMsg[]) => void;
}) {
  const maxTurns = typeof stepProps.maxTurns === "number" ? stepProps.maxTurns : 8;
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [partner, setPartner] = useState<{ id: string; initials: string } | null>(null);
  const [offline, setOffline] = useState(false);
  const [finished, setFinished] = useState(false);
  const started = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const userTurns = messages.filter((m) => m.role === "user").length;

  useEffect(() => {
    onMessagesChange(messages);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, onMessagesChange]);

  async function ask(history: ChatMsg[]): Promise<ChatMsg[] | null> {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/studio/preview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: stepProps,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          personaId: partner?.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return null;
      }
      setPartner({ id: data.personaId, initials: data.initials });
      setOffline(data.offline === true);
      const next = [...history, { role: "assistant" as const, content: data.reply }];
      setMessages(next);
      return next;
    } catch {
      setError("Couldn't reach the server.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  // The AI speaks first. The ref stops React's dev double-run from asking twice.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void ask([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || loading || finished) return;
    const history = [...messages, { role: "user" as const, content: text }];
    setInput("");
    setMessages(history);
    await ask(history);
  }

  const atMax = userTurns >= maxTurns;

  return (
    <div className="flex h-full min-h-[26rem] flex-col rounded-2xl border border-line bg-surface">
      <div className="flex items-center gap-3 border-b border-line px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
          {partner ? `${partner.initials} · ` : ""}Round {userTurns}/{maxTurns}
        </span>
        <div className="flex-1" />
        {userTurns >= 2 && !finished && (
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => {
              setFinished(true);
              onFinish(messages);
            }}
          >
            Wrap up
          </Button>
        )}
      </div>

      {offline && (
        <div className="border-b border-line bg-plume-100 px-4 py-2 font-body text-xs text-plume-700">
          This server has no AI key, so the partner&apos;s messages are placeholders, not real AI replies.
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}
        {loading && <p className="font-body text-xs text-ink-muted">{partner?.initials ?? "The partner"} is typing…</p>}
        {error && (
          <div className="flex items-center gap-3 font-body text-sm text-plume-500">
            <span>{error}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => ask(messages.length && messages[messages.length - 1].role === "assistant" ? messages.slice(0, -1) : messages)}
            >
              Retry
            </Button>
          </div>
        )}
      </div>

      <div className="border-t border-line px-3.5 py-2.5">
        {finished ? (
          <p className="text-center font-body text-sm text-ink-soft">Conversation finished.</p>
        ) : atMax ? (
          <div className="text-center">
            <p className="mb-2 font-body text-sm text-ink-soft">All rounds complete.</p>
            <Button
              onClick={() => {
                setFinished(true);
                onFinish(messages);
              }}
            >
              Finish
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              maxLength={MAX_CHARS}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || messages.length === 0}
              placeholder="Your reply…"
              aria-label="Your message"
              className="min-w-0 flex-1 rounded-full border border-line bg-bg px-4 py-2.5 font-body text-sm text-ink focus:border-primary focus:outline-none"
            />
            <Button type="submit" size="sm" disabled={loading || !input.trim() || messages.length === 0}>
              Send
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
