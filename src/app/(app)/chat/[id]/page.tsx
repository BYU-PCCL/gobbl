"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

import { ChatInterface, type FinishResult, type ChatMsg } from "@/components/chat/ChatInterface";
import { ScoreSummary } from "@/components/chat/ScoreSummary";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { FlatTurkey, FlatTurkeyGlyph } from "@/components/gamification/FlatTurkey";
import { IDEOLOGY_OPTIONS } from "@/lib/prompts/beliefs";

interface DebateData {
  id: string;
  topic: string;
  difficulty: string;
  category: string;
  beliefKey: string;
  personaInitials: string | null;
  completed: boolean;
  overallScore: number | null;
  messages: { id: string; role: string; content: string; civilityScore: number | null }[];
}

export default function DebatePage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const debateId = params.id as string;
  const [debate, setDebate] = useState<DebateData | null>(null);
  const [result, setResult] = useState<FinishResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/"); return; }
    if (status === "authenticated" && debateId) {
      fetch(`/api/debates?id=${debateId}`)
        .then((r) => r.json())
        .then((data) => { setDebate(data); setLoading(false); })
        .catch(() => router.push("/chat"));
    }
  }, [status, debateId, router]);

  if (loading || !debate) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <FlatTurkey stage={1} size="md" animate />
          <p className="mt-3 font-body text-sm text-ink-soft">Preparing your discussion…</p>
        </div>
      </div>
    );
  }

  if (result) {
    // The layout hides the nav and clips this route's <main> (overflow-hidden) so the
    // chat can own its own scrolling; the long results page needs its own scroll container.
    return (
      <div className="h-full overflow-y-auto">
        <ScoreSummary result={result} debateId={debate.id} /* [persona-rating: temporary] */ />
      </div>
    );
  }

  const initialMessages: ChatMsg[] = debate.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
    civilityScore: m.civilityScore,
  }));

  const ideologyLabel =
    IDEOLOGY_OPTIONS.find((o) => o.key === debate.beliefKey)?.label ?? debate.beliefKey;

  // Live "civility meter" — derive a rough running average from per-message scores.
  // Real-time updates can come from `data.civility` returned by /api/chat if you
  // want this to tick during the conversation; for now show the rolling average.
  const userScores = debate.messages
    .filter((m) => m.role === "user" && m.civilityScore != null)
    .map((m) => m.civilityScore as number);
  const liveCivility = userScores.length
    ? Math.round((userScores.reduce((s, n) => s + n, 0) / userScores.length) * 10)
    : null;

  const header = (
    <div className="border-b border-line bg-surface px-4 pb-3 pt-2">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-2"
          aria-label="Back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft">
          <FlatTurkeyGlyph size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-body text-sm font-bold">{debate.personaInitials ?? "Robert"}</span>
            <span className="h-1 w-1 rounded-full bg-ink-muted" />
            <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-muted">
              {ideologyLabel}
            </span>
          </div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-primary">
            ● {debate.difficulty}
          </div>
        </div>
      </div>

      {/* Topic pill */}
      <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-bg px-2.5 py-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-muted">
          Topic
        </span>
        <span className="min-w-0 flex-1 truncate font-body text-xs font-semibold text-ink">
          {debate.topic}
        </span>
      </div>

      {/* Live civility meter */}
      {liveCivility != null && (
        <div className="mt-2.5 flex items-center gap-2.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-muted">
            Civility
          </span>
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-bg">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-forest-500 to-ochre"
              style={{ width: `${liveCivility}%` }}
            />
          </div>
          <span className="font-mono text-[11px] font-bold text-forest-600 num-tabular">
            {liveCivility}
          </span>
        </div>
      )}
    </div>
  );

  if (debate.completed) {
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="border-b border-line bg-surface-2 px-4 py-2 text-center font-body text-xs text-ink-soft">
          View-only transcript — this discussion is finished.{" "}
          <Link href="/dashboard" className="font-semibold text-primary underline-offset-2 hover:underline">
            Back home
          </Link>
        </div>
        <div className="flex-1 space-y-3.5 overflow-y-auto p-4">
          {initialMessages.map((msg, i) => (
            <MessageBubble
              key={i}
              role={msg.role}
              content={msg.content}
              civilityScore={msg.civilityScore}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {header}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          debateId={debate.id}
          initialMessages={initialMessages}
          maxTurns={8}
          onFinish={(r) => setResult(r)}
        />
      </div>
    </div>
  );
}
