"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { FlatTurkey, FlatTurkeyGlyph } from "@/components/gamification/FlatTurkey";
import { XPBar } from "@/components/gamification/XPBar";
import { DailyChallenge } from "@/components/dashboard/DailyChallenge";
import { LevelUpModal } from "@/components/gamification/LevelUpModal";
import { NestScene } from "@/components/nest/NestScene";
import { NestMeters } from "@/components/nest/NestMeters";
import { NestActions } from "@/components/nest/NestActions";
import { useCompanion } from "@/components/companion/useCompanion";
import { fetchJson } from "@/lib/fetchJson";
import { getDailyTopic } from "@/lib/topics";
import { STAGE_LABELS, getSpecies, nestLine, warmthFrom } from "@/lib/companion";
import { MODULES, getModule } from "@/lib/modules/registry";

interface ModuleRow {
  key: string;
  title: string;
  timesCompleted: number;
  progress: { sessionId: string; stage: string; variant: string; inProgress: boolean } | null;
}

export default function NestPage() {
  const { status } = useSession();
  const router = useRouter();
  const { data, companion, error } = useCompanion();
  const [modules, setModules] = useState<ModuleRow[] | null>(null);
  const [levelUp, setLevelUp] = useState<{ from: number; to: number } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchJson<ModuleRow[] | { modules: ModuleRow[] }>("/api/modules")
      .then((m) => setModules(Array.isArray(m) ? m : m.modules))
      .catch(() => setModules([]));
  }, [status]);

  // Level-up detection: cache previous level in sessionStorage; show modal when it jumps.
  useEffect(() => {
    if (!data || typeof window === "undefined") return;
    try {
      const prev = Number(sessionStorage.getItem("gobbl:lastLevel") || data.level);
      if (data.level > prev) setLevelUp({ from: prev, to: data.level });
      sessionStorage.setItem("gobbl:lastLevel", String(data.level));
    } catch {
      /* storage unavailable */
    }
  }, [data]);

  const current = useMemo(() => {
    if (!modules || !companion) return null;
    const species = getSpecies(companion.speciesId);
    const byKey = (k: string) => modules.find((m) => m.key === k);
    const inProgress = modules.find((m) => m.progress?.inProgress);
    const suggested = byKey(species.suggestedModuleKey);
    const pick =
      inProgress ??
      (suggested && suggested.timesCompleted === 0 ? suggested : undefined) ??
      modules.find((m) => m.timesCompleted === 0) ??
      suggested ??
      modules[0];
    if (!pick) return null;
    const config = getModule(pick.key) ?? MODULES.find((m) => m.key === pick.key);
    if (!config) return null;
    const live = pick.progress?.inProgress ? pick.progress : null;
    return { config, stage: live ? live.stage : null, variantKey: live ? live.variant : null };
  }, [modules, companion]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <FlatTurkey stage={1} size="md" />
        <p className="font-body text-sm text-ink-soft">Couldn&apos;t load your nest: {error}</p>
        <Button variant="secondary" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
          Sign out
        </Button>
      </div>
    );
  }

  if (!data || !companion) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <FlatTurkey stage={1} size="md" animate />
      </div>
    );
  }

  const species = getSpecies(companion.speciesId);
  const warmth = warmthFrom(data.lastActiveDate);
  const mood = data.civilityScore > 0 ? data.civilityScore : null;
  const line = nestLine({ hatched: companion.hatched, warmth, mood, seed: data.xp });
  const dailyTopic = getDailyTopic();
  const info = data.levelInfo;
  const recent = data.recentDebates.slice(0, 3);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      {/* Header pills */}
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-line bg-surface px-3 py-1.5 font-body text-sm font-semibold text-ink">
          {data.username}
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[13px] font-semibold text-ink num-tabular">
          <Icon name="feather" size={14} />
          {data.featherBalance.toLocaleString()} feathers
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[13px] font-semibold text-ink num-tabular">
          <Icon name="streak" size={14} />
          {data.currentStreak}-day streak
        </span>
      </div>

      <NestScene
        speciesId={companion.speciesId}
        level={data.level}
        hatched={companion.hatched}
        equipped={data.equippedCosmetics}
        line={line}
      />

      {/* Identity */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-[28px] font-bold leading-none tracking-[-0.03em] text-ink">
            {species.commonName} turkey
          </h1>
          <Badge tone="ochre" variant="soft" size="sm">{STAGE_LABELS[companion.stage] ?? "Egg"}</Badge>
          <Badge tone="primary" variant="soft" size="sm">Level {data.level}</Badge>
        </div>
        <XPBar current={info.xpProgress} max={info.xpForNext} level={data.level} levelName={info.name} />
      </div>

      <NestMeters warmth={warmth} civilityScore={data.civilityScore} />

      {current && <NestActions mod={current.config} stage={current.stage} variantKey={current.variantKey} />}

      {/* Playground */}
      <Link
        href="/chat"
        className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 transition-colors hover:border-ink-muted"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-soft">
          <Icon name="debate" size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="eyebrow text-ink-muted">Playground</div>
          <div className="mt-1 font-body text-sm font-semibold text-ink">Pick a topic and talk it out</div>
        </div>
        <Icon name="chevron-right" size={16} strokeWidth={2} className="text-ink-muted" />
      </Link>

      <DailyChallenge topic={dailyTopic} completed={data.dailyCompleted} />

      {recent.length > 0 && (
        <section>
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 className="font-display text-xl font-bold tracking-[-0.02em]">Recent conversations</h2>
            <Link href="/profile" className="font-body text-xs font-semibold text-primary">See all</Link>
          </div>
          <div className="flex flex-col gap-2">
            {recent.map((c) => (
              <Link
                key={c.id}
                href={`/chat/${c.id}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 transition-colors hover:border-ink-muted"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft">
                  <FlatTurkeyGlyph size={22} palette={species.palette} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-body text-sm font-semibold text-ink">{c.topic}</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-muted">
                    {c.difficulty}
                  </div>
                </div>
                {c.score != null ? (
                  <div className="font-display text-xl font-bold tracking-[-0.02em] text-forest-fg num-tabular">
                    {c.score.toFixed(1)}
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
          rewards={{ feathers: data.recentDebates[0]?.feathersEarned ?? 0 }}
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
