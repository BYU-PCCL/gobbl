"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { fetchJson } from "@/lib/fetchJson";

import { ConversationScene } from "@/components/conversation/ConversationScene";
import { ConversationResults } from "@/components/conversation/ConversationResults";
import { TurnReview } from "@/components/conversation/TurnReview";
import { DimensionRow } from "@/components/chat/ScoreSummary";
import { MyTurkey } from "@/components/turkey/MyTurkey";
import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";
import { Button } from "@/components/ui/Button";
import { MAX_TURNS, isStance, type ConvMsg, type FinishResult, type Stance } from "@/lib/conversation";
import { civilityLabel } from "@/lib/civility";
import { useCompanion } from "@/components/companion/useCompanion";

interface DebateData {
  id: string;
  topic: string;
  difficulty: string;
  personaId?: string | null;
  personaInitials: string | null;
  userStance?: string | null;
  maxTurns?: number | null;
  completed: boolean;
  overallScore: number | null;
  dimensions?: Record<string, number> | null;
  messages: { role: string; content: string }[];
}

export default function ConversationPageRoute() {
  return (
    <Suspense fallback={<ConversationLoading />}>
      <ConversationPage />
    </Suspense>
  );
}

function ConversationLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <TurkeyCharacter stage={1} size={96} decorative />
        <p className="mt-3 font-body text-sm text-ink-soft">Getting the conversation ready…</p>
      </div>
    </div>
  );
}

function ConversationPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const debateId = params.id as string;
  const turkeyIdParam = useSearchParams().get("turkeyId");
  const { turkey, error: turkeyError, flock } = useCompanion(turkeyIdParam);
  const [debate, setDebate] = useState<DebateData | null>(null);
  const [result, setResult] = useState<FinishResult | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/"); return; }
    if (status === "authenticated" && debateId) {
      fetchJson<DebateData>(`/api/debates?id=${debateId}`)
        .then(setDebate)
        .catch(() => router.push("/chat"));
    }
  }, [status, debateId, router]);

  // The turkey is needed to draw you: wait for it, but not if the request failed.
  if (!debate || (!turkey && !turkeyError)) return <ConversationLoading />;

  // Back navigation: a park conversation returns to the park, anything else to Home.
  const isPark = Boolean(debate.personaId);
  const initials = debate.personaInitials ?? "Partner";
  const myName = turkey?.name ?? "your turkey";
  const homeLabel = `Back to ${myName}`;
  const toPark = () =>
    router.push(turkey?.id ? `/chat?turkeyId=${encodeURIComponent(turkey.id)}` : "/chat");
  const toHome = () => {
    if (turkey) flock.select(turkey.id);
    router.push("/home");
  };

  if (result) {
    // The layout hides the nav and clips this route's <main> (overflow-hidden) so the
    // conversation can own its own scrolling; the long results page needs its own scroll container.
    return (
      <div className="h-full overflow-y-auto">
        <ConversationResults
          debateId={debate.id}
          result={result}
          turkey={turkey}
          personaInitials={initials}
          continueLabel={homeLabel}
          onContinue={toHome}
        />
      </div>
    );
  }

  if (debate.completed) {
    const youName = turkey?.name ?? "Your turkey";
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
          <div className="flex flex-col items-center text-center">
            <MyTurkey turkey={turkey} size={120} inScene />
            <p className="mt-4 font-body text-sm font-semibold text-primary">
              {youName} and {initials}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-[-0.03em]">{debate.topic}</h1>
            {debate.overallScore != null && (
              <div className="mt-4">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="font-display text-[48px] font-bold leading-none tracking-[-0.04em] num-tabular">
                    {debate.overallScore.toFixed(1)}
                  </span>
                  <span className="font-body text-sm text-ink-muted">civility out of 10</span>
                </div>
                <p className="mt-1 font-body text-base font-semibold text-ink">{civilityLabel(debate.overallScore)}</p>
              </div>
            )}
          </div>

          {debate.dimensions && Object.keys(debate.dimensions).length > 0 && (
            <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
              <h2 className="mb-4 font-display text-lg font-bold tracking-[-0.02em]">Civility breakdown</h2>
              <div className="space-y-4">
                {Object.entries(debate.dimensions).map(([key, value]) => (
                  <DimensionRow key={key} dimKey={key} value={value} />
                ))}
              </div>
            </section>
          )}

          <div className="mt-10">
            <TurnReview debateId={debate.id} personaInitials={initials} />
          </div>

          <div className="mt-10 flex flex-col justify-center gap-2 sm:flex-row">
            <Button size="lg" onClick={toHome} className="w-full sm:w-auto">
              {homeLabel}
            </Button>
            {isPark && (
              <Button size="lg" variant="ghost" onClick={toPark} className="w-full sm:w-auto">
                Back to the park
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const initialMessages: ConvMsg[] = debate.messages
    .filter((m) => m.role !== "user" || m.content.trim() !== "")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  const stance: Stance | null = isStance(debate.userStance) ? debate.userStance : null;

  return (
    <ConversationScene
      debateId={debate.id}
      topic={debate.topic}
      personaInitials={initials}
      personaId={debate.personaId ?? null}
      difficulty={debate.difficulty}
      userStance={stance}
      initialMessages={initialMessages}
      maxTurns={debate.maxTurns ?? MAX_TURNS}
      turkey={turkey}
      onFinish={(r) => { setResult(r); void flock.reload(); }}
      onLeave={isPark ? toPark : toHome}
    />
  );
}
