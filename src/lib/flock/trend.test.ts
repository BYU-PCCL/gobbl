import { test, expect } from "vitest";
import { skillTrend } from "./trend";

test("empty", () => expect(skillTrend([])).toEqual({ points: [], earlierAvg: null, recentAvg: null, delta: null }));
test("one score has no delta", () => expect(skillTrend([6]).delta).toBeNull());
test("keeps last TREND_WINDOW, compares halves", () => {
  const t = skillTrend([1, 1, 1, 1, 4, 4, 4, 4, 8, 8, 8, 8]);
  expect(t.points).toEqual([1, 1, 4, 4, 4, 4, 8, 8, 8, 8]);
  expect(t.earlierAvg).toBeCloseTo(2.8);
  expect(t.recentAvg).toBeCloseTo(7.2);
  expect(t.delta).toBeCloseTo(4.4);
});
