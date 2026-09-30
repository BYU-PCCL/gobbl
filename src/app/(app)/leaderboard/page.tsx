"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RankingTable, RankEntry } from "@/components/leaderboard/RankingTable";
import { Chip } from "@/components/ui/Chip";
import { Icon, type IconName } from "@/components/ui/Icon";
import { FlatTurkey } from "@/components/gamification/FlatTurkey";

const SORT_OPTIONS: { key: string; label: string; icon: IconName }[] = [
  { key: "xp", label: "XP", icon: "xp" },
  { key: "civility", label: "Civility", icon: "target" },
  { key: "streak", label: "Longest streak", icon: "streak" },
];

export default function LeaderboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const [sortBy, setSortBy] = useState("xp");
  const [data, setData] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      setLoading(true);
      setLoadError(false);
      fetch(`/api/leaderboard?sort=${sortBy}`)
        .then((r) => {
          if (!r.ok) throw new Error("load failed");
          return r.json();
        })
        .then(setData)
        .catch(() => setLoadError(true))
        .finally(() => setLoading(false));
    }
  }, [status, sortBy, router, attempt]);

  return (
    <div className="flex w-full max-w-4xl flex-col gap-5 lg:gap-8">
      <div>
        <p className="font-body text-sm font-semibold text-primary">Leaderboard</p>
        <h1 className="mt-1 font-display text-[32px] font-bold leading-none tracking-[-0.03em] lg:text-[56px]">
          The Flock
        </h1>
        <p className="mt-2 font-body text-sm text-ink-soft lg:text-base">
          See how your civil discourse stacks up against everyone else practicing.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rank by">
        {SORT_OPTIONS.map((opt) => (
          <Chip
            key={opt.key}
            selected={sortBy === opt.key}
            onClick={() => setSortBy(opt.key)}
            leadingIcon={<Icon name={opt.icon} size={14} />}
          >
            {opt.label}
          </Chip>
        ))}
      </div>

      {loading || status === "loading" ? (
        <div className="flex items-center justify-center py-16">
          <FlatTurkey stage={1} size="md" animate />
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-body text-sm text-ink-soft">Couldn&apos;t load the leaderboard.</p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="font-body text-sm font-semibold text-primary underline-offset-2 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <RankingTable data={data} sortBy={sortBy} />
      )}
    </div>
  );
}
