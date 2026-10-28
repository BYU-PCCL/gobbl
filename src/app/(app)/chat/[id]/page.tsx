"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { fetchJson } from "@/lib/fetchJson";

import { ConversationScene, type ConversationYou } from "@/components/conversation/ConversationScene";
import { ConversationResults } from "@/components/conversation/ConversationResults";
import { TurnReview } from "@/components/conversation/TurnReview";
import { DimensionRow } from "@/components/chat/ScoreSummary";
import { FlatTurkey } from "@/components/gamification/FlatTurkey";
import { AvatarWithItems } from "@/components/gamification/AvatarWithItems";
import { Button } from "@/components/ui/Button";
import { MAX_TURNS, isStance, type ConvMsg, type FinishResult, type Stance } from "@/lib/conversation";
import { availableMoves } from "@/lib/moves";
import { civilityLabel } from "@/lib/civility";
import { companionStage, getSpecies, isHatched, type SpeciesId } from "@/lib/companion";
import type { EquippedCosmetics } from "@/lib/shop";

interface DebateData {
  id: string;
  topic: string;
  difficulty: string;
  personaInitials: string | null;
  userStance?: string | null;
  maxTurns?: number | null;
  completed: boolean;
  overallScore: number | null;
  dimensions?: Record<string, number> | null;
  messages: { role: string; content: string; moveId?: string | null }[];
}

interface UserData {
  level?: number;
  equippedCosmetics?: EquippedCosmetics | null;
  companion?: {
    speciesId: SpeciesId | null;
    hatched: boolean;
    learnedMoves: string[];
  } | null;
}

export default function ConversationPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const debateId = params.id as string;
  const [debate, setDebate] = useState<DebateData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [result, setResult] = useState<FinishResult | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/"); return; }
    if (status === "authenticated" && debateId) {
      fetchJson<DebateData>(`/api/debates?id=${debateId}`)
        .then(setDebate)
        .catch(() => router.push("/chat"));
      // Non-critical: the scene falls back to the default turkey without it.
      fetchJson<UserData>("/api/user").then(setUser).catch(() => setUser({}));
    }
  }, [status, debateId, router]);

  const you: ConversationYou = useMemo(
    () => ({
      speciesId: user?.companion?.speciesId ?? null,
      level: user?.level ?? 1,
      hatched: user?.companion?.hatched ?? isHatched({ companionHatchedAt: null, level: user?.level ?? 1 }),
      equipped: user?.equippedCosmetics ?? null,
    }),
    [user],
  );

  if (!debate || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <FlatTurkey stage={1} size="md" animate />
          <p className="mt-3 font-body text-sm text-ink-soft">Getting the conversation ready…</p>
        </div>
      </div>
    );
  }

  if (result) {
    // The layout hides the nav and clips this route's <main> (overflow-hidden) so the
    // conversation can own its own scrolling; the long results page needs its own scroll container.
    return (
      <div className="h-full overflow-y-auto">
        <ConversationResults
          debateId={debate.id}
          result={result}
          you={you}
          continueLabel="Back to the Nest"
          onContinue={() => router.push("/dashboard")}
        />
      </div>
    );
  }

  if (debate.completed) {
    const species = getSpecies(you.speciesId);
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
          <div className="flex flex-col items-center text-center">
            <AvatarWithItems
              stage={companionStage(you.level, you.hatched)}
              size={120}
              palette={species.palette}
              equipped={you.equipped ?? {}}
            />
            <p className="mt-4 font-body text-sm font-semibold text-primary">Finished conversation</p>
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
            <TurnReview debateId={debate.id} personaInitials={debate.personaInitials} />
          </div>

          <div className="mt-10 flex justify-center">
            <Button size="lg" onClick={() => router.push("/dashboard")} className="w-full sm:w-auto">
              Back to the Nest
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
      moveId: m.moveId ?? null,
    }));
  const stance: Stance | null = isStance(debate.userStance) ? debate.userStance : null;

  return (
    <ConversationScene
      debateId={debate.id}
      topic={debate.topic}
      personaInitials={debate.personaInitials ?? "Robert"}
      difficulty={debate.difficulty}
      userStance={stance}
      initialMessages={initialMessages}
      maxTurns={debate.maxTurns ?? MAX_TURNS}
      moves={availableMoves(user.companion?.learnedMoves ?? [])}
      you={you}
      onFinish={setResult}
      onLeave={() => router.push("/dashboard")}
    />
  );
}
