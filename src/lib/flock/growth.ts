import { STAGE_THRESHOLDS } from "./config";

export const STAGE_NAMES: Record<number, string> = {
  1: "Egg",
  2: "Hatchling",
  3: "Poult",
  4: "Youngster",
  5: "Tom",
  6: "Gobbler",
  7: "Grand Gobbler",
  8: "Thunderbird",
};

export function stageForActivityCount(count: number, hatched: boolean): number {
  if (!hatched) return 1;
  let stage = 2;
  for (let i = 1; i < STAGE_THRESHOLDS.length; i++) {
    if (count >= STAGE_THRESHOLDS[i]) stage = i + 2;
  }
  return stage;
}
