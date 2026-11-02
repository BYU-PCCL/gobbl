import { NEED_LOW } from "./config";
import type { NeedKey, TurkeyMood } from "./needs";

export type HomeActivity = "feed" | "park" | "school";

const NEED_ACTIVITY: [NeedKey, HomeActivity][] = [
  ["hunger", "feed"],
  ["loneliness", "park"],
  ["sadness", "school"],
];

/** The activity whose need is lowest and below NEED_LOW; null when nothing is low. */
export function emphasizedActivity(needs: Record<NeedKey, number>): HomeActivity | null {
  let best: [NeedKey, HomeActivity] | null = null;
  for (const entry of NEED_ACTIVITY) {
    if (needs[entry[0]] < NEED_LOW && (!best || needs[entry[0]] < needs[best[0]])) best = entry;
  }
  return best ? best[1] : null;
}

export function moodLine(mood: TurkeyMood, name: string | null): string {
  const n = name?.trim() || "Your turkey";
  switch (mood) {
    case "happy":
      return `${n} is feeling great!`;
    case "okay":
      return `${n} is doing fine.`;
    case "hungry":
      return `${n} is hungry.`;
    case "lonely":
      return `${n} is lonely.`;
    case "sad":
      return `${n} missed you.`;
  }
}

export function trendLabel(delta: number | null): string {
  if (delta === null) return "Do a few activities to see your trend";
  const rounded = Math.round(Math.abs(delta) * 10) / 10;
  if (rounded === 0) return "Holding steady";
  return `${delta > 0 ? "Up" : "Down"} ${rounded.toFixed(1)} from earlier`;
}

export function activityHref(
  activity: HomeActivity,
  t: { id: string; moduleKey: string | null },
): string {
  switch (activity) {
    case "park":
      return `/chat?turkeyId=${t.id}`;
    case "feed":
      return t.moduleKey
        ? `/skills/${t.moduleKey}?turkeyId=${t.id}`
        : `/skills?turkeyId=${t.id}`;
    case "school":
      return `/school/${t.id}`;
  }
}
