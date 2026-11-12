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
import { Button, ButtonLink } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
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
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <LoadingState message="Getting the conversation ready..." />
    </div>
  );
}

function ConversationProblem({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-body text-base text-ink-soft">{message}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        {onRetry && <Button onClick={onRetry}>Try again</Button>}
        <ButtonLink href="/chat" variant={onRetry ? "ghost" : "primary"}>
          Back to the Park
        </ButtonLink>
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
  const { turkey, flock } = useCompanion(turkeyIdParam);
  const [debate, setDebate] = useState<DebateData | null>(null);
  const [debateFailed, setDebateFailed] = useState(false);
  const [result, setResult] = useState<FinishResult | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/"); return; }
    if (status === "authenticated" && debateId) {
      setDebateFailed(false);
      fetchJson<DebateData>(`/api/debates?id=${encodeURIComponent(debateId)}`)
        .then(setDebate)
        .catch(() => setDebateFailed(true));
    }
  }, [status, debateId, router]);

  if (debateFailed) return <ConversationProblem message="We could not open that conversation." />;
  if (!debate || flock.loading) return <ConversationLoading />;
  // The turkey is needed to draw you. Every way of not having one ends here, not in a spinner.
  if (!turkey && !result) {
    return (
      <ConversationProblem
        message="We could not load your turkey."
        onRetry={() => void flock.reload()}
      />
    );
  }

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
    const score = debate.overallScore;
    const scoreTone = score == null ? "" : score >= 8 ? "text-forest-fg" : score >= 6 ? "text-ink" : "text-danger";
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-5 pb-[max(env(safe-area-inset-bottom),2rem)] pt-[max(env(safe-area-inset-top),2rem)] sm:px-8">
          <div className="flex flex-col items-center text-center">
            <MyTurkey turkey={turkey} size={120} inScene />
            <h1 className="mt-4 font-display text-display-md text-ink">How it went</h1>
            <p className="mt-1 break-words font-body text-sm text-ink-soft">{debate.topic}</p>
            {score != null && (
              <div className="mt-6">
                <div className="flex items-baseline justify-center gap-2">
                  <span className={`font-display text-[56px] font-bold leading-none tracking-[-0.04em] num-tabular ${scoreTone}`}>
                    {score.toFixed(1)}
                  </span>
                  <span className="font-body text-sm text-ink-muted">civility out of 10</span>
                </div>
                <p className="mt-1 font-body text-base font-semibold text-ink">{civilityLabel(score)}</p>
              </div>
            )}
          </div>

          {debate.dimensions && Object.keys(debate.dimensions).length > 0 && (
            <section className="mt-8 rounded-2xl border border-line bg-surface p-5">
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

          <div className="mt-10 flex flex-col justify-center gap-2 sm:flex-row-reverse">
            <ButtonLink href={turkey?.id ? `/chat?turkeyId=${encodeURIComponent(turkey.id)}` : "/chat"} size="lg" className="w-full sm:w-auto">
              Talk to someone else
            </ButtonLink>
            <Button size="lg" variant="ghost" onClick={toHome} className="w-full sm:w-auto">
              {homeLabel}
            </Button>
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
      onLeave={toPark}
    />
  );
}
