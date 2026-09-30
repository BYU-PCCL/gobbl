"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FlatTurkey } from "@/components/gamification/FlatTurkey";
import { FlatTurkeyGlyph } from "@/components/gamification/FlatTurkey";
import { AvatarWithItems } from "@/components/gamification/AvatarWithItems";
import { XPBar } from "@/components/gamification/XPBar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { DailyChallenge } from "@/components/dashboard/DailyChallenge";
import { LevelUpModal } from "@/components/gamification/LevelUpModal";
import { getDailyTopic } from "@/lib/topics";
import { LEVELS } from "@/lib/gamification";
import type { EquippedCosmetics } from "@/lib/shop";

interface UserData {
  username: string;
  xp: number;
  featherBalance: number;
  level: number;
  equippedCosmetics: EquippedCosmetics;
  levelInfo: {
    level: number;
    name: string;
    xpForNext: number;
    xpProgress: number;
    progressPercent: number;
  };
  civilityScore: number;
  currentStreak: number;
  longestStreak: number;
  dailyCompleted: boolean;
  badges: string[];
  recentDebates: {
    id: string;
    topic: string;
    category: string;
    difficulty: string;
    score: number | null;
    xpEarned: number;
    feathersEarned: number;
    completedAt: string;
  }[];
}

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Level-up detection: cache previous level in sessionStorage; show modal when it jumps.
  const [levelUp, setLevelUp] = useState<{ from: number; to: number } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/user")
        .then((r) => r.json())
        .then((data: UserData) => {
          setUserData(data);
          if (typeof window !== "undefined") {
            const prev = Number(sessionStorage.getItem("gobbl:lastLevel") || data.level);
            if (data.level > prev) setLevelUp({ from: prev, to: data.level });
            sessionStorage.setItem("gobbl:lastLevel", String(data.level));
          }
        })
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  if (loading || !userData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <FlatTurkey stage={1} size="md" animate />
      </div>
    );
  }

  const dailyTopic = getDailyTopic();

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:gap-6">
      {/* Headline */}
      <div className="pt-1 lg:order-first lg:col-span-12 lg:pb-4">
        <h1 className="font-display text-[38px] font-bold leading-[0.95] tracking-[-0.035em] text-ink sm:text-[52px] lg:text-[84px] lg:leading-[0.88] lg:tracking-[-0.045em]">
          Ready to
          <br />
          talk turkey?
        </h1>
        <p className="mt-3 font-body text-sm leading-snug text-ink-soft lg:mt-5 lg:text-base">
          One conversation a day. The Flock&apos;s already gathering.
        </p>
      </div>

      {/* Hero: turkey + XP */}
      <Card className="overflow-hidden lg:order-1 lg:col-span-7 lg:flex lg:items-center lg:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-ochre-soft/60" />
        <div className="relative flex w-full items-center gap-4 lg:gap-8">
          <div className="lg:hidden">
            <AvatarWithItems stage={userData.level} size={120} equipped={userData.equippedCosmetics} animate />
          </div>
          <div className="hidden lg:block">
            <AvatarWithItems stage={userData.level} size={180} equipped={userData.equippedCosmetics} animate />
          </div>
          <div className="flex-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
              Level {userData.level} · {userData.levelInfo.name}
            </div>
            <div className="mt-1 font-display text-[22px] font-bold leading-[1.05] tracking-[-0.02em] lg:text-[32px]">
              Strutting
              <br />
              nicely.
            </div>
            <div className="mt-3.5">
              <XPBar
                current={userData.levelInfo.xpProgress}
                max={userData.levelInfo.xpForNext}
                level={userData.level}
                levelName={userData.levelInfo.name}
                showLabel={false}
              />
              <div className="mt-1.5 flex justify-between">
                <span className="font-mono text-[10px] text-ink-muted num-tabular">
                  {userData.levelInfo.xpProgress} / {userData.levelInfo.xpForNext} XP
                </span>
                <span className="font-mono text-[10px] font-semibold text-primary num-tabular">
                  {userData.levelInfo.xpForNext - userData.levelInfo.xpProgress > 0
                    ? `+${userData.levelInfo.xpForNext - userData.levelInfo.xpProgress} to ${LEVELS[userData.level]?.name ?? "next"}`
                    : "Max level"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2.5 lg:order-3 lg:col-span-12 lg:gap-4">
        <StatsCard
          label="Civility"
          value={userData.civilityScore > 0 ? Math.round(userData.civilityScore * 10) : "—"}
          unit="/100"
          tone="forest"
        />
        <StatsCard
          label="Streak"
          value={userData.currentStreak}
          unit="days"
          tone="primary"
        />
        <StatsCard
          label="Debates"
          value={userData.recentDebates.length}
          unit="total"
          tone="ochre"
        />
      </div>

      {/* Daily Gobble */}
      <DailyChallenge
        topic={dailyTopic}
        completed={userData.dailyCompleted}
        className="lg:order-2 lg:col-span-5"
      />

      {/* Recent */}
      {userData.recentDebates.length > 0 && (
        <section className="lg:order-4 lg:col-span-12">
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 className="font-display text-xl font-bold tracking-[-0.02em] lg:text-2xl">Recent</h2>
            <Link href="/profile" className="font-body text-xs font-semibold text-primary">
              See all
            </Link>
          </div>
          <div className="flex flex-col gap-2 lg:grid lg:grid-cols-3 lg:gap-4">
            {userData.recentDebates.slice(0, 3).map((debate) => (
              <Link
                key={debate.id}
                href={`/chat/${debate.id}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 transition-colors hover:border-ink-muted"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft">
                  <FlatTurkeyGlyph size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-body text-sm font-semibold text-ink">
                    {debate.topic}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-muted">
                    {debate.difficulty}
                  </div>
                </div>
                {debate.score != null ? (
                  <div className="font-display text-xl font-bold tracking-[-0.02em] text-forest-600 num-tabular">
                    {debate.score.toFixed(1)}
                  </div>
                ) : (
                  <Badge tone="neutral" size="sm">In progress</Badge>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {levelUp && (
        <LevelUpModal
          open
          fromLevel={levelUp.from}
          toLevel={levelUp.to}
          rewards={{ feathers: 500, outfits: 5, newBadge: "Gobbler" }}
          onClose={() => setLevelUp(null)}
          onSeeWhatsNew={() => {
            setLevelUp(null);
            router.push("/shop");
          }}
        />
      )}
    </div>
  );
}
