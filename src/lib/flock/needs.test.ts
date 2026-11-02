import { test, expect } from "vitest";
import { needLevel, turkeyMood } from "./needs";

const now = new Date("2026-11-02T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);
test("never refilled is empty", () => expect(needLevel(null, now)).toBe(0));
test("just refilled is full", () => expect(needLevel(now, now)).toBe(100));
test("half drained at 36h", () => expect(needLevel(hoursAgo(36), now)).toBeCloseTo(50));
test("clamps to 0 when long ago", () => expect(needLevel(hoursAgo(10_000), now)).toBe(0));
test("clamps to 100 when lastAt is in the future", () => expect(needLevel(hoursAgo(-5), now)).toBe(100));
test("mood: lowest need under NEED_LOW wins, ties go hunger>loneliness>sadness", () => {
  expect(turkeyMood({ hunger: 10, loneliness: 20, sadness: 90 })).toBe("hungry");
  expect(turkeyMood({ hunger: 90, loneliness: 5, sadness: 5 })).toBe("lonely");
  expect(turkeyMood({ hunger: 80, loneliness: 75, sadness: 71 })).toBe("happy");
  expect(turkeyMood({ hunger: 80, loneliness: 50, sadness: 71 })).toBe("okay");
});
