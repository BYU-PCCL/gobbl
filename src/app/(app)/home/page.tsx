"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageShell } from "@/components/layout/PageShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { LoadingState } from "@/components/ui/LoadingState";
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
import { activityCta, activityHref, emphasizedActivity, moodLine, type HomeActivity } from "@/lib/flock/home";
import { nextStep } from "@/lib/flock/progress";
import { getTurkeySkill } from "@/lib/flock/skills";
import type { TurkeyView } from "@/lib/flock/view";

type TrendData = { points: number[]; delta: number | null };

/**
 * Level progress and the streak. Feathers and the level number are already in the app
 * chrome, so they are not repeated here. Holds its height while /api/user loads.
 */
function AccountStrip({ user }: { user: CompanionUserData | null }) {
  if (!user) return <div aria-hidden className="h-9" />;
  const info = user.levelInfo;
  return (
    <div className="flex h-9 items-center gap-3">
      <div className="min-w-0 flex-1">
        <XPBar current={info.xpProgress} max={info.xpForNext} level={user.level} />
      </div>
      {user.currentStreak > 0 && (
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-xs font-semibold text-ink num-tabular">
          <Icon name="streak" size={14} />
          {user.currentStreak}-day streak
        </span>
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
        <MyTurkey turkey={egg} size={220} />
        <h1 className="mt-2 font-display text-display-md text-ink lg:text-display-lg">Your egg is listening</h1>
        <p className="font-body text-sm text-ink-soft">
          {species.commonName} egg · {skill.label}
        </p>
      </div>

      <Card className="space-y-4 p-4 text-center">
        <p className="font-body text-sm text-ink">
          It can hear you through the shell. Teach it a lesson and pass the quiz at the end, and it will hatch.
        </p>
        <ButtonLink href={activityHref("feed", egg)} size="lg" className="w-full">
          Start its first lesson
        </ButtonLink>
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

/**
 * Until the Park is open: Feed, then School, then Park, with what is done, what is locked
 * and the one next thing to do. Once all three are open the checklist has done its job, so
 * the card becomes the three activities, leading with whichever need is lowest.
 */
function StepsCard({ turkey }: { turkey: TurkeyView }) {
  const name = turkey.name?.trim() || "your turkey";
  const step = nextStep(turkey.hatched, turkey.done);
  const low = emphasizedActivity(turkey.needs);

  if (!step) {
    const lead: HomeActivity = low ?? "park";
    const rest = (["feed", "school", "park"] as HomeActivity[]).filter((a) => a !== lead);
    return (
      <Card className="space-y-3 p-4">
        <h2 className="font-display text-display-sm text-ink">Look after {name}</h2>
        <ButtonLink href={activityHref(lead, turkey)} size="lg" className="w-full">
          {activityCta(lead, turkey.name)}
        </ButtonLink>
        <div className="grid grid-cols-2 gap-2">
          {rest.map((a) => (
            <ButtonLink key={a} href={activityHref(a, turkey)} variant="outline" className="w-full">
              {a === "feed" ? "Feed" : a === "school" ? "School" : "Park"}
            </ButtonLink>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-4">
      <h2 className="font-display text-display-sm text-ink">Next steps</h2>
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
      <ButtonLink href={activityHref(step, turkey)} size="lg" className="w-full">
        {activityCta(step, turkey.name)}
      </ButtonLink>
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

  // To the hatch screen only when it is the one thing to do: no turkey at all, or a first egg
  // whose quiz is already passed. A first egg that still needs its quiz stays here. An egg
  // bought later waits in the coop and never blocks this page.
  const needsHatch = !loading && !error && (turkeys.length === 0 || (egg !== null && firstEggReady));

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    if (needsHatch) router.replace(egg ? `/hatch?turkeyId=${egg.id}` : "/hatch");
  }, [needsHatch, egg, router]);

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
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <p className="font-body text-ink-soft">We could not load your flock.</p>
        <Button onClick={() => void reload()}>Try again</Button>
      </div>
    );
  }

  if (loading || status === "loading" || needsHatch || (!current && !egg)) {
    return <LoadingState message="Finding your turkey..." />;
  }

  const back = { href: "/flock", label: "Flock" };

  if (!current && egg) {
    return (
      <PageShell width="narrow" back={back}>
        <div className="space-y-5">
          <AccountStrip user={user} />
          <EggHome egg={egg} />
        </div>
      </PageShell>
    );
  }
  if (!current) return null;

  const name = current.name ?? "Your turkey";

  return (
    <PageShell width="wide" back={back}>
      <div className="mx-auto grid max-w-xl gap-5 lg:max-w-none lg:grid-cols-2 lg:items-start lg:gap-10">
        <div className="space-y-5">
          <div className="flex flex-col items-center text-center">
            <MyTurkey
              turkey={current}
              reaction={reaction}
              onReactionEnd={() => setReaction("none")}
              onTap={() => setReaction("pet")}
              size={240}
            />
            <h1 className="mt-2 break-words font-display text-display-md text-ink lg:text-display-lg">{name}</h1>
            <p className="font-body text-sm text-ink-soft">
              {current.stageName} · {current.skillLabel}
            </p>
            <p className="mt-1 font-body text-xs text-ink-muted">Tap {name} to say hello.</p>
          </div>

          <Card className="space-y-4 p-4">
            <p className="text-center font-body text-sm font-semibold text-ink" aria-live="polite">
              {moodLine(current.mood, current.name)}
            </p>
            <NeedBars
              needs={current.needs}
              hrefs={{
                hunger: activityHref("feed", current),
                sadness: current.unlocked.school ? activityHref("school", current) : null,
                loneliness: current.unlocked.park ? activityHref("park", current) : null,
              }}
            />
          </Card>
        </div>

        <div className="space-y-5">
          <AccountStrip user={user} />
          <StepsCard turkey={current} />

          <Card className="p-4">
            <h2 className="mb-2 font-display text-display-sm text-ink">{current.skillLabel} trend</h2>
            {/* Same height loading or loaded, so the card does not jump. */}
            <div className="min-h-[5.5rem]">
              {trend ? (
                <SkillTrend points={trend.points} delta={trend.delta} />
              ) : (
                <div aria-hidden className="h-14 animate-pulse rounded-xl bg-surface-2 motion-reduce:animate-none" />
              )}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
