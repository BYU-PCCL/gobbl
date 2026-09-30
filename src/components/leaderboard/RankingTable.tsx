"use client";

import type { EquippedCosmetics } from "@/lib/shop";
import { AvatarWithItems } from "../gamification/AvatarWithItems";

export interface RankEntry {
  rank: number;
  id: string;
  username: string;
  xp: number;
  level: number;
  civilityScore: number;
  streak: number;
  longestStreak: number;
  totalDebates: number;
  isCurrentUser: boolean;
  equippedCosmetics?: EquippedCosmetics;
}

interface RankingTableProps {
  data: RankEntry[];
  sortBy: string;
}

/** Podium tones for the top three; everyone else gets a plain numeral. */
const PODIUM: Record<number, string> = {
  1: "bg-ochre text-ink",
  2: "bg-roost-200 text-roost-700",
  3: "bg-gobbl-200 text-gobbl-700",
};

const COLUMN_LABEL: Record<string, string> = {
  xp: "XP",
  civility: "Civility",
  streak: "Longest streak",
};

export function RankingTable({ data, sortBy }: RankingTableProps) {
  const highlight = (entry: RankEntry) => {
    switch (sortBy) {
      case "civility":
        return entry.civilityScore.toFixed(1);
      case "streak":
        return `${entry.longestStreak} ${entry.longestStreak === 1 ? "day" : "days"}`;
      default:
        return entry.xp.toLocaleString();
    }
  };

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line py-12 text-center">
        <p className="font-body text-sm text-ink-soft">
          Nobody has finished a debate yet. Finish one to take the top spot.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <table className="w-full">
        <thead>
          <tr className="border-b border-line text-left font-body text-xs font-semibold text-ink-muted">
            <th scope="col" className="w-14 py-3 pl-4 pr-2">Rank</th>
            <th scope="col" className="px-2 py-3">Turkey</th>
            <th scope="col" className="hidden px-2 py-3 text-right sm:table-cell">Level</th>
            <th scope="col" className="hidden px-2 py-3 text-right md:table-cell">Debates</th>
            <th scope="col" className="py-3 pl-2 pr-4 text-right">{COLUMN_LABEL[sortBy] ?? "XP"}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => (
            <tr
              key={entry.id}
              aria-current={entry.isCurrentUser ? "true" : undefined}
              className={`border-b border-line last:border-b-0 ${
                entry.isCurrentUser ? "bg-primary-soft/60" : ""
              }`}
            >
              <td className="py-3 pl-4 pr-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-bold num-tabular ${
                    PODIUM[entry.rank] ?? "text-ink-muted"
                  }`}
                >
                  {entry.rank}
                </span>
              </td>
              <td className="px-2 py-3">
                <div className="flex items-center gap-3">
                  <AvatarWithItems
                    stage={entry.level}
                    size="xs"
                    equipped={entry.equippedCosmetics ?? {}}
                    animate={false}
                    showShadow={false}
                  />
                  <span className="min-w-0 truncate font-body text-sm font-semibold text-ink">
                    {entry.username}
                    {entry.isCurrentUser && <span className="ml-1.5 font-normal text-primary">(you)</span>}
                  </span>
                </div>
              </td>
              <td className="hidden px-2 py-3 text-right font-mono text-sm text-ink-soft num-tabular sm:table-cell">
                {entry.level}
              </td>
              <td className="hidden px-2 py-3 text-right font-mono text-sm text-ink-soft num-tabular md:table-cell">
                {entry.totalDebates}
              </td>
              <td className="py-3 pl-2 pr-4 text-right font-mono text-sm font-bold text-ink num-tabular">
                {highlight(entry)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
