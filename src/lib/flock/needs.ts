import { NEED_HOURS_TO_EMPTY, NEED_LOW, NEED_HAPPY } from "./config";

export type NeedKey = "hunger" | "loneliness" | "sadness";
export type TurkeyMood = "happy" | "okay" | "hungry" | "lonely" | "sad";

export function needLevel(lastAt: Date | null, now: Date): number {
  if (!lastAt) return 0;
  const hours = (now.getTime() - lastAt.getTime()) / 3600_000;
  return Math.min(100, Math.max(0, 100 - (hours * 100) / NEED_HOURS_TO_EMPTY));
}

export function turkeyNeeds(
  t: { lastFedAt: Date | null; lastSocialAt: Date | null; lastTaughtAt: Date | null },
  now: Date,
): Record<NeedKey, number> {
  return {
    hunger: needLevel(t.lastFedAt, now),
    loneliness: needLevel(t.lastSocialAt, now),
    sadness: needLevel(t.lastTaughtAt, now),
  };
}

const MOOD_ORDER: [NeedKey, TurkeyMood][] = [
  ["hunger", "hungry"],
  ["loneliness", "lonely"],
  ["sadness", "sad"],
];

export function turkeyMood(needs: Record<NeedKey, number>): TurkeyMood {
  let worst: [NeedKey, TurkeyMood] | null = null;
  for (const entry of MOOD_ORDER) {
    if (needs[entry[0]] < NEED_LOW && (!worst || needs[entry[0]] < needs[worst[0]])) worst = entry;
  }
  if (worst) return worst[1];
  const allHappy = MOOD_ORDER.every(([k]) => needs[k] >= NEED_HAPPY);
  return allHappy ? "happy" : "okay";
}
