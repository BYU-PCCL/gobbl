"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface TurnFeedback {
  turn: number;
  wellDone: string;
  tryInstead: string;
}

interface ReviewMsg {
  role: string;
  content: string;
}

/**
 * "Review your conversation": loads the transcript, asks the analyze route for per-turn notes
 * as soon as it mounts, and shows "Nice / Try" cards under each of the user's turns.
 */
export function TurnReview({ debateId, personaInitials }: { debateId: string; personaInitials?: string | null }) {
  const [messages, setMessages] = useState<ReviewMsg[] | null>(null);
  const [initials, setInitials] = useState<string>(personaInitials ?? "Partner");
  const [analysis, setAnalysis] = useState<TurnFeedback[] | null>(null);
  const [analyzing, setAnalyzing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch(`/api/debates/${debateId}/analyze`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "We couldn't write up the review just now.");
        return;
      }
      setAnalysis(data.analysis ?? []);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setAnalyzing(false);
    }
  }, [debateId]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/debates?id=${encodeURIComponent(debateId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setMessages(
          (d.messages as ReviewMsg[]).filter((m) => m.role !== "user" || m.content.trim() !== ""),
        );
        if (d.personaInitials) setInitials(d.personaInitials);
      })
      .catch(() => {});
    void analyze();
    return () => { cancelled = true; };
  }, [debateId, analyze]);

  let turn = 0;
  return (
    <section aria-label="Review your conversation">
      <h3 className="font-display text-xl font-bold tracking-[-0.02em]">Review your conversation</h3>
      <p className="mt-1 font-body text-sm text-ink-soft">What went well, and one thing to try next time, turn by turn.</p>

      {error && (
        <div role="alert" className="mt-4 flex flex-col items-start gap-2 rounded-2xl border border-line bg-surface p-4">
          <p className="font-body text-sm text-plume-500">{error}</p>
          <Button size="sm" variant="outline" onClick={() => void analyze()} disabled={analyzing} loading={analyzing}>
            Try again
          </Button>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {messages === null && (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-surface-2 motion-reduce:animate-none" />
            ))}
          </div>
        )}
        {messages?.map((m, i) => {
          const isUser = m.role === "user";
          if (isUser) turn += 1;
          const fb = isUser ? analysis?.find((a) => a.turn === turn) : undefined;
          const loadingNote = isUser && analyzing && !analysis;
          return (
            <div key={i} className={isUser ? "flex flex-col items-end" : "flex flex-col items-start"}>
              <p className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                {isUser ? "You" : initials}
              </p>
              <div
                className={`max-w-[88%] whitespace-pre-wrap rounded-2xl border px-3.5 py-2.5 font-body text-sm leading-6 text-ink ${
                  isUser ? "border-primary/30 bg-primary-soft" : "border-line bg-surface"
                }`}
              >
                {m.content}
              </div>
              {loadingNote && (
                <div className="mt-1.5 h-12 w-[78%] animate-pulse rounded-2xl bg-surface-2 motion-reduce:animate-none" aria-hidden />
              )}
              {fb && (
                <div className="mt-1.5 max-w-[88%] space-y-1.5">
                  <p className="rounded-2xl border border-line bg-forest-soft px-3.5 py-2 font-body text-xs text-forest-fg">
                    <span className="font-bold">Nice: </span>
                    {fb.wellDone}
                  </p>
                  <p className="rounded-2xl border border-line bg-ochre-soft px-3.5 py-2 font-body text-xs text-ink">
                    <span className="font-bold">Try: </span>
                    {fb.tryInstead}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
