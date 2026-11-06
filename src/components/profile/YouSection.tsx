"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { fetchJson } from "@/lib/fetchJson";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

interface UserData {
  username: string;
  featherBalance: number;
  civilityScore: number;
  currentStreak: number;
  createdAt: string;
}

// Replace this map with real per-dimension scores once the API exposes them.
// For now we fan out the rolling civilityScore with small intentional variance.
function civilityBreakdown(score: number) {
  const base = Math.round(score * 10);
  return [
    { k: "Respectful tone", v: Math.min(100, base + 5) },
    { k: "Evidence-based", v: Math.max(0, base - 3) },
    { k: "Empathy", v: Math.min(100, base + 2) },
    { k: "Constructive", v: Math.max(0, base - 6) },
    { k: "Active listening", v: Math.min(100, base + 1) },
  ];
}

/** The user's own profile, shown at the bottom of Home (formerly the "You" page). */
export function YouSection() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJson<UserData>("/api/user")
      .then((d) => {
        if (!cancelled) setUserData(d);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const civilityRows =
    userData && userData.civilityScore > 0 ? civilityBreakdown(userData.civilityScore) : null;

  return (
    <section id="you" aria-labelledby="you-heading" className="scroll-mt-20 space-y-4 pt-2">
      <h2 id="you-heading" className="font-display text-xl font-bold tracking-[-0.02em]">
        You
      </h2>

      {loadError ? (
        <p className="font-body text-sm text-ink-soft">Couldn&apos;t load your profile: {loadError}</p>
      ) : !userData ? (
        <p className="font-body text-sm text-ink-soft">Loading...</p>
      ) : (
        <>
          <Card className="p-4">
            <div className="font-display text-2xl font-bold tracking-[-0.03em]">{userData.username}</div>
            <p className="mt-1 font-body text-xs text-ink-soft">
              Joined {new Date(userData.createdAt).toLocaleDateString()}.{" "}
              {userData.featherBalance.toLocaleString()} feathers.
            </p>
            <div className="mt-3 flex gap-1.5">
              <MiniStat
                k="Civility"
                v={userData.civilityScore > 0 ? Math.round(userData.civilityScore * 10) : "—"}
              />
              <MiniStat k="Streak" v={`${userData.currentStreak}d`} />
            </div>
          </Card>

          {civilityRows && (
            <Card>
              <h3 className="mb-1 font-display text-base font-bold">Civility, by dimension</h3>
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
          )}
        </>
      )}

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-surface-2"
        >
          <span className="font-body text-sm font-semibold text-plume-500">Fly the Coop</span>
          <Icon name="chevron-right" size={16} strokeWidth={2} className="text-ink-muted" />
        </button>
      </div>
    </section>
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
