"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchJson } from "@/lib/fetchJson";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageShell } from "@/components/layout/PageShell";
import { XPBar } from "@/components/gamification/XPBar";
import { useFlock } from "@/components/turkey/useFlock";
import { MyTurkey } from "@/components/turkey/MyTurkey";
import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";
import { BadgeMark } from "@/components/gamification/BadgeMark";
import { Icon } from "@/components/ui/Icon";
import { BADGES } from "@/lib/gamification";
import { useCompanion } from "@/components/companion/useCompanion";

interface UserData {
  username: string;
  xp: number;
  featherBalance: number;
  level: number;
  levelInfo: { level: number; xpForNext: number; xpProgress: number; progressPercent: number };
  civilityScore: number;
  currentStreak: number;
  longestStreak: number;
  badges: string[];
  recentDebates: { id: string; topic: string; score: number | null; difficulty: string; completedAt: string }[];
  createdAt: string;
  civilityByDimension?: { key: string; label: string; average: number }[];
}

export default function ProfilePage() {
  const { status } = useSession();
  const router = useRouter();
  const { turkey, flock } = useCompanion();
  const { select } = useFlock();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [openBadge, setOpenBadge] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      fetchJson<UserData>("/api/user")
        .then(setUserData)
        .catch(() => setLoadError(true))
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <TurkeyCharacter stage={1} size={96} decorative />
        <p role="alert" className="font-body text-sm text-ink-soft">
          We could not load your profile.
        </p>
        <Button size="sm" onClick={() => window.location.reload()}>
          Try again
        </Button>
        <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
          Sign out
        </Button>
      </div>
    );
  }

  if (loading || !userData) {
    return <LoadingState message="Finding your profile..." />;
  }

  const civilityRows = userData.civilityByDimension ?? [];
  const info = userData.levelInfo;
  const sheetBadge = BADGES.find((b) => b.key === openBadge) ?? null;
  const sheetEarned = sheetBadge ? userData.badges.includes(sheetBadge.key) : false;

  return (
    <PageShell width="wide">
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
        {/* Hero card */}
        <Card className="p-6 text-center lg:sticky lg:top-6 lg:col-span-5 lg:p-8">
          <div className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-ochre-soft/60" />
          <div className="relative">
            <div className="font-body text-xs font-semibold text-ink-muted">
              Level {userData.level} of 8
            </div>
            {info && (
              <div className="mx-auto mt-2 max-w-xs text-left">
                <XPBar current={info.xpProgress} max={info.xpForNext} level={userData.level} showLabel={false} />
                <p className="mt-1 text-center font-body text-xs text-ink-muted num-tabular">
                  {info.xpForNext > 0
                    ? `${info.xpProgress} of ${info.xpForNext} XP to level ${userData.level + 1}`
                    : "Top level reached"}
                </p>
              </div>
            )}
            <h1 className="mt-3 break-words font-display text-display-md lg:text-display-lg">
              {userData.username}
            </h1>
            <p className="mt-1 font-body text-xs text-ink-soft">
              Joined {new Date(userData.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </p>
            <div className="mt-3 flex justify-center">
              <MyTurkey turkey={turkey} size={180} />
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              <MiniStat k="Civility" v={userData.civilityScore ? userData.civilityScore.toFixed(1) : "None yet"} muted={!userData.civilityScore} />
              <MiniStat k="Streak" v={`${userData.currentStreak}d`} />
              <MiniStat k="Feathers" v={userData.featherBalance.toLocaleString()} />
            </div>
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-5 lg:col-span-7 lg:gap-8">
          {/* Your flock */}
          <section>
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-xl font-bold tracking-[-0.02em]">Your flock</h2>
              <span className="flex items-baseline gap-3 font-body text-xs text-ink-muted">
                {flock.turkeys.length} {flock.turkeys.length === 1 ? "turkey" : "turkeys"}
                <Link
                  href="/flock"
                  className="-my-3 inline-flex min-h-11 items-center px-1 text-sm font-semibold text-primary hover:underline"
                >
                  All
                </Link>
              </span>
            </div>
            <Card className="p-2">
              {flock.turkeys.length === 0 ? (
                <div className="flex flex-col items-start gap-3 px-2 py-4">
                  <p className="font-body text-sm text-ink-soft">Your flock is empty for now.</p>
                  <ButtonLink href="/hatch" size="sm">Pick your first egg</ButtonLink>
                </div>
              ) : (
                flock.turkeys.map((t, i) => {
                  const rowClass = `flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-surface-2 ${
                    i > 0 ? "border-t border-line" : ""
                  }`;
                  const inner = (
                    <>
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center">
                        <MyTurkey turkey={t} size={52} animate={false} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-body text-sm font-semibold">{t.name ?? "Unhatched egg"}</div>
                        <div className="truncate font-body text-xs text-ink-soft">
                          {t.skillLabel} · {t.stageName}
                        </div>
                      </div>
                      <ChevronRight />
                    </>
                  );
                  return t.hatched ? (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        select(t.id);
                        router.push("/home");
                      }}
                      className={rowClass}
                    >
                      {inner}
                    </button>
                  ) : (
                    <Link key={t.id} href="/flock" className={rowClass}>
                      {inner}
                    </Link>
                  );
                })
              )}
            </Card>
          </section>

          {/* Civility breakdown */}
          <section>
            <h2 className="mb-2.5 font-display text-xl font-bold tracking-[-0.02em]">
              Civility, by dimension
            </h2>
            <Card>
              {civilityRows.length === 0 ? (
                <p className="py-3 font-body text-sm text-ink-soft">
                  Finish a conversation in the Park to see how you do on each part of civility.
                </p>
              ) : (
                civilityRows.map((row, i) => (
                  <div key={row.key} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="font-body text-[13px] font-semibold">{row.label}</span>
                      <span className="font-mono text-[13px] font-semibold text-forest-fg num-tabular">
                        {row.average.toFixed(1)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-bg">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-700"
                        style={{ width: `${Math.round(row.average * 10)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </Card>
          </section>

          {/* Badges */}
          <section>
            <div className="mb-2.5 flex items-baseline justify-between">
              <h2 className="font-display text-xl font-bold tracking-[-0.02em]">Badges</h2>
              <span className="font-body text-xs text-ink-muted">
                {userData.badges.length} of {BADGES.length} earned
              </span>
            </div>
            <Card className="p-3">
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                {BADGES.map((b) => {
                  const earned = userData.badges.includes(b.key);
                  return (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => setOpenBadge(b.key)}
                      className={`flex min-h-11 flex-col items-center justify-start gap-2 rounded-2xl border px-2 py-3 text-center transition-colors hover:border-ink-muted ${
                        earned ? "border-line bg-surface" : "border-dashed border-line text-ink-muted"
                      }`}
                    >
                      <BadgeMark badgeKey={b.key} earned={earned} size={40} />
                      <span className="font-body text-[13px] font-semibold leading-tight">{b.name}</span>
                      <span className={`font-body text-xs ${earned ? "text-forest-fg" : "text-ink-muted"}`}>
                        {earned ? "Earned" : "Locked"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </section>

          <Sheet open={sheetBadge !== null} onClose={() => setOpenBadge(null)} title={sheetBadge?.name ?? "Badge"}>
            {sheetBadge && (
              <div className="flex flex-col items-center gap-3 pb-2 text-center">
                <BadgeMark badgeKey={sheetBadge.key} earned={sheetEarned} size={72} />
                <p className="font-body text-sm text-ink">{sheetBadge.description}</p>
                <p className={`font-body text-xs font-semibold ${sheetEarned ? "text-forest-fg" : "text-ink-muted"}`}>
                  {sheetEarned ? "You earned this badge." : "Not earned yet."}
                </p>
              </div>
            )}
          </Sheet>

          {/* Actions list */}
          <Card bare>
            <Link href="/friends" className="flex items-center justify-between px-4 py-3.5 hover:bg-surface-2">
              <span className="font-body text-sm font-semibold">Friends</span>
              <ChevronRight />
            </Link>
            <div className="border-t border-line" />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex min-h-11 w-full items-center gap-2 px-4 py-3.5 text-danger hover:bg-surface-2"
            >
              <Icon name="sign-out" size={16} />
              <span className="font-body text-sm font-semibold">Sign out</span>
            </button>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function MiniStat({ k, v, muted = false }: { k: string; v: string | number; muted?: boolean }) {
  return (
    <div className="min-w-[5.5rem] rounded-xl border border-line bg-bg px-3.5 py-2 text-center">
      <div
        className={`num-tabular ${
          muted ? "font-body text-sm font-semibold leading-7 text-ink-muted" : "font-display text-lg font-bold tracking-[-0.02em]"
        }`}
      >
        {v}
      </div>
      <div className="font-body text-xs text-ink-muted">{k}</div>
    </div>
  );
}

function ChevronRight() {
  return (
    <Icon name="chevron-right" size={16} strokeWidth={2} className="text-ink-muted" />
  );
}
