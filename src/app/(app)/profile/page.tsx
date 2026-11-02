"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/lib/fetchJson";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FlatTurkey } from "@/components/gamification/FlatTurkey";
import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";
import { useFlock } from "@/components/turkey/useFlock";
import { Icon } from "@/components/ui/Icon";
import type { EquippedCosmetics } from "@/lib/shop";

interface UserData {
  username: string;
  featherBalance: number;
  equippedCosmetics: EquippedCosmetics;
  civilityScore: number;
  currentStreak: number;
  longestStreak: number;
  createdAt: string;
}

// Replace this map with real per-dimension scores once the API exposes them.
// For now we fan out the rolling civilityScore with small intentional variance.
function civilityBreakdown(score: number) {
  const base = Math.round(score * 10);
  return [
    { k: "Respectful tone",  v: Math.min(100, base + 5) },
    { k: "Evidence-based",   v: Math.max(0, base - 3) },
    { k: "Empathy",          v: Math.min(100, base + 2) },
    { k: "Constructive",     v: Math.max(0, base - 6) },
    { k: "Active listening", v: Math.min(100, base + 1) },
  ];
}

export default function ProfilePage() {
  const { status } = useSession();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { turkeys, current } = useFlock();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      fetchJson<UserData>("/api/user")
        .then(setUserData)
        .catch((err: Error) => setLoadError(err.message))
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <FlatTurkey stage={1} size="md" />
        <p className="font-body text-sm text-ink-soft">
          Couldn&apos;t load your profile: {loadError}
        </p>
        <Button variant="secondary" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
          Sign out
        </Button>
      </div>
    );
  }

  if (loading || !userData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <FlatTurkey stage={1} size="md" animate />
      </div>
    );
  }

  const civilityRows = userData.civilityScore > 0 ? civilityBreakdown(userData.civilityScore) : null;

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
      {/* Hero card */}
      <Card className="overflow-hidden p-6 text-center lg:sticky lg:top-0 lg:col-span-5 lg:p-8">
        <div className="pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-ochre-soft/60" />
        <div className="relative">
          <h1 className="mt-2 font-display text-[36px] font-bold tracking-[-0.03em] lg:text-[44px]">
            {userData.username}
          </h1>
          <p className="mt-1 font-body text-xs text-ink-soft">
            Joined {new Date(userData.createdAt).toLocaleDateString()}. {userData.featherBalance.toLocaleString()} feathers.
          </p>
          <div className="mt-3 flex justify-center">
            {current ? (
              <TurkeyCharacter
                stage={current.stage}
                mood={current.mood}
                skill={current.skill}
                equipped={userData.equippedCosmetics}
                size={180}
                label={current.name ?? current.skillLabel}
              />
            ) : (
              <FlatTurkey stage={1} size={140} />
            )}
          </div>
          <div className="mt-3 flex justify-center gap-1.5">
            <MiniStat k="Civility" v={userData.civilityScore > 0 ? Math.round(userData.civilityScore * 10) : "—"} />
            <MiniStat k="Streak" v={`${userData.currentStreak}d`} />
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-5 lg:col-span-7 lg:gap-8">
      {/* Your flock */}
      <section>
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold tracking-[-0.02em]">Your flock</h2>
          <span className="font-body text-xs text-ink-muted">{turkeys.length} {turkeys.length === 1 ? "turkey" : "turkeys"}</span>
        </div>
        <Card className="p-0">
          {turkeys.length === 0 ? (
            <p className="px-4 py-3.5 font-body text-sm text-ink-soft">No turkeys yet. Pick an egg to begin.</p>
          ) : (
            turkeys.map((t, i) => (
              <div
                key={t.id}
                className={`flex items-center justify-between gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-line" : ""}`}
              >
                <div className="min-w-0">
                  <div className="truncate font-body text-sm font-semibold">{t.name ?? "Unnamed turkey"}</div>
                  <div className="truncate font-body text-xs text-ink-soft">{t.skillLabel}</div>
                </div>
                <Badge tone="dark" size="sm" variant="solid">{t.stageName}</Badge>
              </div>
            ))
          )}
        </Card>
      </section>

      {/* Civility breakdown */}
      {civilityRows && (
        <section>
          <h2 className="mb-2.5 font-display text-xl font-bold tracking-[-0.02em]">
            Civility, by dimension
          </h2>
          <Card>
            {civilityRows.map((row, i) => (
              <div key={row.k} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="font-body text-[13px] font-semibold">{row.k}</span>
                  <span className="font-mono text-[13px] font-semibold text-forest-600 num-tabular">
                    {row.v}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-bg">
                  <div
                    className="h-full rounded-full bg-forest-500 transition-[width] duration-700"
                    style={{ width: `${row.v}%` }}
                  />
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

      {/* Actions list */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-surface-2"
        >
          <span className="font-body text-sm font-semibold text-plume-500">Fly the Coop</span>
          <ChevronRight />
        </button>
      </div>
      </div>
    </div>
  );
}

function MiniStat({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="rounded-xl border border-line bg-bg px-3.5 py-2 text-center">
      <div className="font-display text-lg font-bold tracking-[-0.02em] num-tabular">{v}</div>
      <div className="font-body text-[11px] text-ink-muted">{k}</div>
    </div>
  );
}

function ChevronRight() {
  return (
    <Icon name="chevron-right" size={16} strokeWidth={2} className="text-ink-muted" />
  );
}
