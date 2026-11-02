import { test, expect } from "vitest";
import { stageForActivityCount, qualifiesParkVisit, STAGE_NAMES } from "./growth";

test("egg is stage 1", () => expect(stageForActivityCount(99, false)).toBe(1));
test("fresh hatchling is stage 2", () => expect(stageForActivityCount(0, true)).toBe(2));
test("thresholds", () => {
  expect(stageForActivityCount(2, true)).toBe(2);
  expect(stageForActivityCount(3, true)).toBe(3);
  expect(stageForActivityCount(60, true)).toBe(8);
  expect(stageForActivityCount(1000, true)).toBe(8);
});
test("park needs 3 user messages", () => {
  expect(qualifiesParkVisit(0)).toBe(false);
  expect(qualifiesParkVisit(2)).toBe(false);
  expect(qualifiesParkVisit(3)).toBe(true);
});
test("stage names", () => {
  expect(STAGE_NAMES[1]).toBe("Egg");
  expect(STAGE_NAMES[8]).toBe("Thunderbird");
});
