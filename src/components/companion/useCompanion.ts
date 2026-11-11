"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import { useFlock } from "@/components/turkey/useFlock";
import { getTurkeySkill } from "@/lib/flock/skills";
import type { TurkeyView } from "@/lib/flock/view";
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
  equippedCosmetics: EquippedCosmetics;
  lastTopicId: string | null;
  badges: string[];
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
}

/** How a flock turkey (or egg) looks and where it is in life, for the conversation and lesson screens. */
export function companionFromTurkey(turkey: TurkeyView | null): CompanionInfo {
  return {
    turkeyId: turkey?.id ?? null,
    speciesId: turkey ? getTurkeySkill(turkey.skill).species : null,
    hatched: turkey?.hatched ?? false,
    stage: turkey?.stage ?? 1,
    name: turkey?.name ?? null,
  };
}

/**
 * The signed-in user (`/api/user`) plus the turkey they have selected, as one "companion".
 * Before the first egg hatches, the companion is that egg. Pass `turkeyId` to pin a specific
 * turkey (a `?turkeyId=` link) instead of the selected one.
 */
export function useCompanion(turkeyId?: string | null) {
  const [data, setData] = useState<CompanionUserData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const flock = useFlock();

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

  const turkey = useMemo(
    () => flock.turkeys.find((t) => t.id === turkeyId) ?? flock.current ?? flock.egg,
    [flock.turkeys, flock.current, flock.egg, turkeyId],
  );
  const companion = useMemo(() => (flock.loading ? null : companionFromTurkey(turkey)), [flock.loading, turkey]);

  return { data, companion, turkey, flock, error, refresh };
}
