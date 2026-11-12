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
      return `${n} wants to learn something.`;
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
        : "/home";
    case "school":
      return `/school/${t.id}`;
  }
}

/** Hotbar link for an activity: the selected turkey's activity, or the hatch screen before there is one. */
export function activityNavHref(
  activity: HomeActivity,
  current: { id: string; moduleKey: string | null } | null,
): string {
  return current ? activityHref(activity, current) : "/hatch";
}

/** Button label for starting an activity with a turkey. */
export function activityCta(activity: HomeActivity, name: string | null): string {
  const n = name?.trim() || "your turkey";
  switch (activity) {
    case "feed":
      return `Feed ${n}`;
    case "school":
      return `Take ${n} to School`;
    case "park":
      return `Take ${n} to the Park`;
  }
}

/** Why an activity is shut for a turkey and which step opens it; null when it is open. */
export function lockedReason(
  activity: HomeActivity,
  t: { name: string | null; hatched: boolean; unlocked: { school: boolean; park: boolean } },
): { reason: string; step: HomeActivity } | null {
  const n = t.name?.trim() || "your turkey";
  if (!t.hatched) {
    return activity === "feed" ? null : { reason: "Your egg has to hatch first. Its first lesson does that.", step: "feed" };
  }
  if (activity === "school" && !t.unlocked.school) {
    return { reason: `${n} needs a lesson before School. Feed ${n} first.`, step: "feed" };
  }
  if (activity === "park" && !t.unlocked.park) {
    return t.unlocked.school
      ? { reason: `${n} has nothing to talk about yet. Take ${n} to School first.`, step: "school" }
      : { reason: `The Park opens after Feed and School. Feed ${n} first.`, step: "feed" };
  }
  return null;
}
