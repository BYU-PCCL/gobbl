"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { FlatTurkey } from "@/components/gamification/FlatTurkey";
import { XPBar } from "@/components/gamification/XPBar";
import { LevelUpModal } from "@/components/gamification/LevelUpModal";
import { TurkeyCharacter, type TurkeyReaction } from "@/components/turkey/TurkeyCharacter";
import { FlockSwitcher } from "@/components/turkey/FlockSwitcher";
import { NeedBars } from "@/components/turkey/NeedBars";
import { SkillTrend } from "@/components/turkey/SkillTrend";
import { useFlock } from "@/components/turkey/useFlock";
import type { CompanionUserData } from "@/components/companion/useCompanion";
import { fetchJson } from "@/lib/fetchJson";
import { getSpecies } from "@/lib/companion";
import { activityHref, moodLine } from "@/lib/flock/home";
import { getTurkeySkill } from "@/lib/flock/skills";
import type { TurkeyView } from "@/lib/flock/view";

type TrendData = { points: number[]; delta: number | null };

/** Streak and feathers, the account's level bar, and the level-up moment. Shared by both Home views. */
function AccountStrip({ user }: { user: CompanionUserData | null }) {
  const router = useRouter();
  const [levelUp, setLevelUp] = useState<{ from: number; to: number } | null>(null);

  // The last level seen is kept for the browser session; a higher one now means a level-up to celebrate.
  useEffect(() => {
    if (!user) return;
    try {
      const key = `gobbl:lastLevel:${user.username}`;
      const prev = Number(sessionStorage.getItem(key) || user.level);
      if (user.level > prev) setLevelUp({ from: prev, to: user.level });
      sessionStorage.setItem(key, String(user.level));
    } catch {
      // storage unavailable: no level-up moment, nothing else changes
    }
  }, [user]);

  if (!user) return null;
  const info = user.levelInfo;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[13px] font-semibold text-ink num-tabular">
          <Icon name="streak" size={14} />
          {user.currentStreak}-day streak
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[13px] font-semibold text-ink num-tabular">
          <Icon name="feather" size={14} />
          {user.featherBalance.toLocaleString()} feathers
        </span>
      </div>
      <XPBar current={info.xpProgress} max={info.xpForNext} level={user.level} levelName={info.name} />
      {levelUp && (
        <LevelUpModal
          open
          fromLevel={levelUp.from}
          toLevel={levelUp.to}
          rewards={{ feathers: user.recentDebates[0]?.feathersEarned ?? 0 }}
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

/** Home before the first hatch: the egg, and the one thing that lets it out. */
function EggHome({ egg }: { egg: TurkeyView }) {
  const skill = getTurkeySkill(egg.skill);
  const species = getSpecies(skill.species);
  return (
    <>
      <div className="flex flex-col items-center text-center">
        <div className="animate-wiggle" style={{ transformOrigin: "50% 92%" }}>
          <FlatTurkey stage={1} size={220} palette={species.palette} eggPattern={species.eggPattern} />
        </div>
        <h1 className="mt-2 font-display text-display-lg text-ink">Your egg is listening</h1>
        <p className="font-body text-sm text-ink-soft">
          {species.commonName} egg · {skill.label}
        </p>
      </div>

      <Card className="space-y-4 p-4 text-center">
        <p className="font-body text-sm text-ink">
          It can hear you through the shell. Teach it a lesson and pass the quiz at the end, and it will hatch.
        </p>
        <Link href={activityHref("feed", egg)} className="block">
          <Button size="lg" className="w-full">
            Start its first lesson
          </Button>
        </Link>
        <p className="font-body text-xs text-ink-soft">The Park and School open once it hatches.</p>
      </Card>
    </>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { status } = useSession();
  const { turkeys, current, egg, firstEggReady, select, reload, loading, error } = useFlock();

  const [user, setUser] = useState<CompanionUserData | null>(null);
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [reaction, setReaction] = useState<TurkeyReaction>("none");

  // To the hatch screen when there is an egg to pick or one that can be opened now: no turkey at
  // all, a bought egg waiting, or a first egg whose quiz is already passed. A first egg that still
  // needs its quiz stays here.
  const needsHatch =
    !loading &&
    !error &&
    (turkeys.length === 0 ||
      (current !== null && turkeys.some((t) => !t.hatched)) ||
      (egg !== null && firstEggReady));

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    if (needsHatch) router.replace("/hatch");
  }, [needsHatch, router]);

  // Level, streak, feathers and equipped cosmetics; the page still works without them.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetchJson<CompanionUserData>("/api/user")
      .then((d) => {
        if (!cancelled) setUser(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status]);

  const currentId = current?.id ?? null;
  useEffect(() => {
    if (!currentId) return;
    let cancelled = false;
    setTrend(null);
    fetchJson<{ turkey: TurkeyView; trend: TrendData }>(`/api/turkeys/${currentId}`)
      .then((d) => {
        if (!cancelled) setTrend(d.trend);
      })
      .catch(() => {
        if (!cancelled) setTrend({ points: [], delta: null });
      });
    return () => {
      cancelled = true;
    };
  }, [currentId]);

  if (status === "unauthenticated") return null;

  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <p className="font-body text-ink-soft">We could not load your flock: {error}</p>
        <Button onClick={() => void reload()}>Try again</Button>
      </div>
    );
  }

  if (loading || status === "loading" || needsHatch || (!current && !egg)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center font-body text-ink-soft">
        Finding your turkey...
      </div>
    );
  }

  if (!current && egg) {
    return (
      <div className="mx-auto max-w-md space-y-5 px-4 py-6">
        <AccountStrip user={user} />
        <EggHome egg={egg} />
      </div>
    );
  }
  if (!current) return null;

  const name = current.name ?? "Your turkey";

  return (
    <div className="mx-auto max-w-md space-y-5 px-4 py-6">
      <AccountStrip user={user} />

      <FlockSwitcher turkeys={turkeys} currentId={current.id} onSelect={select} />

      <div className="flex flex-col items-center text-center">
        <TurkeyCharacter
          stage={current.stage}
          mood={current.mood}
          skill={current.skill}
          equipped={user?.equippedCosmetics}
          reaction={reaction}
          onReactionEnd={() => setReaction("none")}
          onTap={() => setReaction("pet")}
          size={240}
          label={name}
        />
        <h1 className="mt-2 font-display text-display-lg text-ink">{name}</h1>
        <p className="font-body text-sm text-ink-soft">
          {current.stageName} · {current.skillLabel}
        </p>
      </div>

      <Card className="space-y-4 p-4">
        <NeedBars needs={current.needs} />
        <p className="text-center font-body text-sm font-semibold text-ink" aria-live="polite">
          {moodLine(current.mood, current.name)}
        </p>
      </Card>

      <Card className="p-4">
        <h2 className="mb-2 font-display text-base font-bold text-ink">{current.skillLabel} trend</h2>
        {trend ? (
          <SkillTrend points={trend.points} delta={trend.delta} />
        ) : (
          <p className="font-body text-sm text-ink-soft">Loading...</p>
        )}
      </Card>
    </div>
  );
}
