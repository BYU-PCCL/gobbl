"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import type { Topic } from "@/lib/topics";

/** Server-owned Daily Gobble topic (UTC day). Null while loading or on error. */
export function useDailyTopic(): Topic | null {
  const [topic, setTopic] = useState<Topic | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJson<{ today: { dailyTopic: Topic } }>("/api/config")
      .then((data) => { if (!cancelled) setTopic(data.today.dailyTopic); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return topic;
}
