"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import type { TurkeyView } from "@/lib/flock/view";

const STORAGE_KEY = "gobbl.currentTurkey";

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** The only client-side fetcher of /api/turkeys. */
export function useFlock() {
  const [turkeys, setTurkeys] = useState<TurkeyView[]>([]);
  const [featherBalance, setFeatherBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    try {
      const data = await fetchJson<{ turkeys: TurkeyView[]; featherBalance: number }>("/api/turkeys");
      if (!mounted.current) return;
      setTurkeys(data.turkeys);
      setFeatherBalance(data.featherBalance);
      setError(null);
    } catch (e) {
      if (!mounted.current) return;
      setError(e instanceof Error ? e.message : "Could not load your flock");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSelectedId(readStored());
    void reload();
  }, [reload]);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // storage unavailable; selection lasts for this page only
    }
  }, []);

  const current = useMemo(() => {
    const hatched = turkeys.filter((t) => t.hatched);
    return hatched.find((t) => t.id === selectedId) ?? hatched[0] ?? null;
  }, [turkeys, selectedId]);

  return { turkeys, featherBalance, current, select, reload, loading, error };
}
