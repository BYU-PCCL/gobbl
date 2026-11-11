import { test, expect } from "vitest";
import { stageForActivityCount, stageProgress, STAGE_NAMES } from "./growth";

test("egg is stage 1", () => expect(stageForActivityCount(99, false)).toBe(1));
test("fresh hatchling is stage 2", () => expect(stageForActivityCount(0, true)).toBe(2));
test("thresholds", () => {
  expect(stageForActivityCount(2, true)).toBe(2);
  expect(stageForActivityCount(3, true)).toBe(3);
  expect(stageForActivityCount(60, true)).toBe(8);
  expect(stageForActivityCount(1000, true)).toBe(8);
});
test("stage names", () => {
  expect(STAGE_NAMES[1]).toBe("Egg");
  expect(STAGE_NAMES[8]).toBe("Thunderbird");
});
test("stageProgress inside a stage", () => {
  expect(stageProgress(0, true)).toEqual({ stage: 2, nextStage: 3, done: 0, needed: 3 });
  expect(stageProgress(2, true)).toEqual({ stage: 2, nextStage: 3, done: 2, needed: 3 });
  expect(stageProgress(3, true)).toEqual({ stage: 3, nextStage: 4, done: 0, needed: 5 });
  expect(stageProgress(10, true)).toEqual({ stage: 4, nextStage: 5, done: 2, needed: 7 });
});
test("stageProgress at the last stage and for eggs", () => {
  expect(stageProgress(60, true)).toEqual({ stage: 8, nextStage: null, done: 0, needed: 0 });
  expect(stageProgress(75, true)).toEqual({ stage: 8, nextStage: null, done: 15, needed: 0 });
  expect(stageProgress(5, false)).toEqual({ stage: 1, nextStage: null, done: 0, needed: 0 });
});
