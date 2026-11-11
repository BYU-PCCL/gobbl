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

/**
 * Where a turkey is inside its current stage: activities done since the stage began, and how
 * many the stage needs before the next one. `nextStage` is null for an egg and at the last stage.
 */
export function stageProgress(
  activityCount: number,
  hatched: boolean
): { stage: number; nextStage: number | null; done: number; needed: number } {
  const stage = stageForActivityCount(activityCount, hatched);
  if (!hatched) return { stage, nextStage: null, done: 0, needed: 0 };
  const start = STAGE_THRESHOLDS[stage - 2];
  const next = STAGE_THRESHOLDS[stage - 1];
  if (next === undefined) return { stage, nextStage: null, done: activityCount - start, needed: 0 };
  return { stage, nextStage: stage + 1, done: activityCount - start, needed: next - start };
}
