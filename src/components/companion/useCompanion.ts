"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import type { CompanionInfo } from "@/lib/companion";
import type { EquippedCosmetics } from "@/lib/shop";

export interface CompanionUserData {
  username: string;
  xp: number;
  level: number;
  levelInfo: { level: number; name: string; xpForNext: number; xpProgress: number; progressPercent: number };
  featherBalance: number;
  currentStreak: number;
  civilityScore: number;
  lastActiveDate?: string | null;
  equippedCosmetics: EquippedCosmetics;
  dailyCompleted?: boolean;
  recentDebates: {
    id: string;
    topic: string;
    category?: string;
    difficulty: string;
    score: number | null;
    xpEarned?: number;
    feathersEarned: number;
    completedAt?: string;
  }[];
  companion: CompanionInfo;
}

export function useCompanion() {
  const [data, setData] = useState<CompanionUserData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const d = await fetchJson<CompanionUserData>("/api/user");
      setData(d);
      setError(null);
      return d;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, companion: data?.companion ?? null, error, refresh };
}
