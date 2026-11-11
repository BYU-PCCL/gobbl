"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import type { TurkeyView } from "@/lib/flock/view";

const STORAGE_KEY = "gobbl.currentTurkey";
const SELECT_EVENT = "gobbl:select-turkey";
const CHANGED_EVENT = "gobbl:flock-changed";

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** The only client-side fetcher of /api/turkeys. Selection is shared across every mounted instance. */
export function useFlock() {
  const [turkeys, setTurkeys] = useState<TurkeyView[]>([]);
  const [featherBalance, setFeatherBalance] = useState(0);
  const [firstEggReady, setFirstEggReady] = useState(false);
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

  const load = useCallback(async () => {
    try {
      const data = await fetchJson<{ turkeys: TurkeyView[]; featherBalance: number; firstEggReady?: boolean }>(
        "/api/turkeys",
      );
      if (!mounted.current) return;
      setTurkeys(data.turkeys);
      setFeatherBalance(data.featherBalance);
      setFirstEggReady(data.firstEggReady === true);
      setError(null);
    } catch (e) {
      if (!mounted.current) return;
      setError(e instanceof Error ? e.message : "Could not load your flock");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  // A reload asked for by one component (a hatch, a finished activity) refreshes every mounted
  // instance, so the hotbar and user bubble never show a stale flock.
  const reload = useCallback(async () => {
    await load();
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT, { detail: load }));
  }, [load]);

  useEffect(() => {
    const onChanged = (e: Event) => {
      // Skip the instance that already reloaded itself.
      if ((e as CustomEvent<unknown>).detail !== load) void load();
    };
    window.addEventListener(CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(CHANGED_EVENT, onChanged);
  }, [load]);

  useEffect(() => {
    setSelectedId(readStored());
    void load();
  }, [load]);

  // Several components use this hook at once (Home and the hotbar), so a
  // selection made in one is broadcast to the others.
  useEffect(() => {
    const onSelect = (e: Event) => setSelectedId((e as CustomEvent<string>).detail);
    window.addEventListener(SELECT_EVENT, onSelect);
    return () => window.removeEventListener(SELECT_EVENT, onSelect);
  }, []);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // storage unavailable; selection lasts for this page only
    }
    window.dispatchEvent(new CustomEvent(SELECT_EVENT, { detail: id }));
  }, []);

  const current = useMemo(() => {
    const hatched = turkeys.filter((t) => t.hatched);
    return hatched.find((t) => t.id === selectedId) ?? hatched[0] ?? null;
  }, [turkeys, selectedId]);

  // The first egg: the only state where the user has a turkey but none is hatched. It hatches
  // by passing a module quiz (firstEggReady), unlike eggs bought later, which hatch by tapping.
  const egg = useMemo(() => (current ? null : turkeys[0] ?? null), [turkeys, current]);

  return { turkeys, featherBalance, current, egg, firstEggReady, select, reload, loading, error };
}
