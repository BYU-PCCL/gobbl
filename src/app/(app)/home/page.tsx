"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { XPBar } from "@/components/gamification/XPBar";
import { LockGlyph } from "@/components/layout/BottomNav";
import { type TurkeyReaction } from "@/components/turkey/TurkeyCharacter";
import { MyTurkey } from "@/components/turkey/MyTurkey";
import { NeedBars } from "@/components/turkey/NeedBars";
import { SkillTrend } from "@/components/turkey/SkillTrend";
import { useFlock } from "@/components/turkey/useFlock";
import type { CompanionUserData } from "@/components/companion/useCompanion";
import { fetchJson } from "@/lib/fetchJson";
import { getSpecies } from "@/lib/companion";
import { activityHref, emphasizedActivity, moodLine } from "@/lib/flock/home";
import { nextStep } from "@/lib/flock/progress";
import { getTurkeySkill } from "@/lib/flock/skills";
import type { TurkeyView } from "@/lib/flock/view";

type TrendData = { points: number[]; delta: number | null };

/** Streak and feathers, and the account level bar. Shared by both Home views. */
function AccountStrip({ user }: { user: CompanionUserData | null }) {
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
      <XPBar current={info.xpProgress} max={info.xpForNext} level={user.level} />
    </div>
  );
}

/** Link back to the flock page; shown only when there is more than one turkey or egg to pick from. */
function AllTurkeysLink({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <Link
      href="/flock"
      className="inline-flex items-center gap-1.5 font-body text-sm font-semibold text-ink-soft hover:text-ink"
    >
      <Icon name="arrow-left" size={16} />
      All turkeys
    </Link>
  );
}

/** Home before the first hatch: the egg, and the one thing that lets it out. */
function EggHome({ egg }: { egg: TurkeyView }) {
  const skill = getTurkeySkill(egg.skill);
  const species = getSpecies(skill.species);
  return (
    <>
      <div className="flex flex-col items-center text-center">
        <MyTurkey turkey={egg} size={220} />
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
        <p className="font-body text-xs text-ink-soft">School and the Park open once it hatches.</p>
      </Card>
    </>
  );
}

function StepRow({
  title,
  detail,
  done,
  lockedReason,
}: {
  title: string;
  detail: string;
  done: boolean;
  lockedReason: string | null;
}) {
  return (
    <li className={`flex items-start gap-3 ${lockedReason ? "opacity-60" : ""}`}>
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
          done ? "border-primary bg-primary text-white" : "border-line text-ink-muted"
        }`}
      >
        {done ? <Icon name="check" size={14} /> : lockedReason ? <LockGlyph /> : null}
      </span>
      <span className="min-w-0 font-body text-sm">
        <span className="font-semibold text-ink">{title}</span>
        {done && <span className="sr-only"> (done)</span>}
        <span className="block text-ink-soft">{lockedReason ?? detail}</span>
      </span>
    </li>
  );
}

/** Feed, then School, then Park: what is done, what is locked, and the one next thing to do. */
function StepsCard({ turkey }: { turkey: TurkeyView }) {
  const name = turkey.name?.trim() || "your turkey";
  const step = nextStep(turkey.hatched, turkey.done);
  const low = emphasizedActivity(turkey.needs);

  let cta: { label: string; href: string };
  if (step === "feed" || (!step && low === "feed")) {
    cta = { label: `Feed ${name}`, href: activityHref("feed", turkey) };
  } else if (step === "school" || (!step && low === "school")) {
    cta = { label: `Take ${name} to School`, href: activityHref("school", turkey) };
  } else {
    cta = { label: "Go to the Park", href: activityHref("park", turkey) };
  }

  return (
    <Card className="space-y-4 p-4">
      <h2 className="font-display text-base font-bold text-ink">Next steps</h2>
      <ol className="space-y-3">
        <StepRow title="Feed" detail="A short lesson" done={turkey.done.feed} lockedReason={null} />
        <StepRow
          title="School"
          detail={`Teach ${name} what you learned`}
          done={turkey.done.school}
          lockedReason={turkey.unlocked.school ? null : `Feed ${name} first`}
        />
        <StepRow
          title="Park"
          detail="Talk it over with another turkey"
          done={false}
          lockedReason={turkey.unlocked.park ? null : `Take ${name} to School first`}
        />
      </ol>
      <Link href={cta.href} className="block">
        <Button size="lg" className="w-full">
          {cta.label}
        </Button>
      </Link>
    </Card>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { status } = useSession();
  const { turkeys, current, egg, firstEggReady, reload, loading, error } = useFlock();

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

  // Level, streak and feathers; the page still works without them.
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
        <AllTurkeysLink show={turkeys.length > 1} />
        <EggHome egg={egg} />
      </div>
    );
  }
  if (!current) return null;

  const name = current.name ?? "Your turkey";

  return (
    <div className="mx-auto max-w-md space-y-5 px-4 py-6">
      <AccountStrip user={user} />

      <AllTurkeysLink show={turkeys.length > 1} />

      <div className="flex flex-col items-center text-center">
        <MyTurkey
          turkey={current}
          reaction={reaction}
          onReactionEnd={() => setReaction("none")}
          onTap={() => setReaction("pet")}
          size={240}
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

      <StepsCard turkey={current} />

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
