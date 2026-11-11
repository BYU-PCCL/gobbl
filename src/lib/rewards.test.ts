import { describe, expect, it } from "vitest";
import { buildStats, computeStreak, daysBetween } from "./rewards";
import { BADGES, checkNewBadges } from "./gamification";

const at = (iso: string) => new Date(iso);

describe("computeStreak", () => {
  const now = at("2026-11-10T15:00:00");
  it("starts at 1 with no history", () => {
    expect(computeStreak({ currentStreak: 0, longestStreak: 0, lastActiveDate: null }, now)).toEqual({
      currentStreak: 1,
      longestStreak: 1,
    });
  });
  it("extends on the next day", () => {
    const r = computeStreak({ currentStreak: 3, longestStreak: 5, lastActiveDate: at("2026-11-09T22:00:00") }, now);
    expect(r).toEqual({ currentStreak: 4, longestStreak: 5 });
  });
  it("does nothing on a same-day repeat", () => {
    const r = computeStreak({ currentStreak: 3, longestStreak: 3, lastActiveDate: at("2026-11-10T01:00:00") }, now);
    expect(r).toEqual({ currentStreak: 3, longestStreak: 3 });
  });
  it("starts the streak after a same-day quiz (streak 0, active today)", () => {
    const r = computeStreak({ currentStreak: 0, longestStreak: 0, lastActiveDate: at("2026-11-10T01:00:00") }, now);
    expect(r.currentStreak).toBe(1);
  });
  it("resets after a long gap and keeps the longest", () => {
    const r = computeStreak({ currentStreak: 9, longestStreak: 9, lastActiveDate: at("2026-11-05T12:00:00") }, now);
    expect(r).toEqual({ currentStreak: 1, longestStreak: 9 });
  });
  it("counts calendar days", () => {
    expect(daysBetween(at("2026-11-09T23:59:00"), at("2026-11-10T00:01:00"))).toBe(1);
  });
});

describe("badges", () => {
  const base = { level: 1, currentStreak: 0, debates: [], messageDimensions: [] };
  const dims = (mutualExchange: number, selfExpressionReason: number) =>
    JSON.stringify({ participation: 5, selfExpressionReason, mutualExchange, interrogation: 5 });

  it("awards nothing to a new user", () => {
    expect(checkNewBadges(buildStats(base), [])).toEqual([]);
  });
  it("first-gobble after one finished conversation", () => {
    const s = buildStats({ ...base, debates: [{ difficulty: "Friendly Cluck", overallScore: 4 }] });
    expect(checkNewBadges(s, [])).toEqual(["first-gobble"]);
  });
  it("counts Full Gobble for the 10-conversation badge", () => {
    const debates = Array.from({ length: 10 }, () => ({ difficulty: "Full Gobble", overallScore: 5 }));
    expect(checkNewBadges(buildStats({ ...base, debates }), [])).toContain("flock-leader");
    const wrong = Array.from({ length: 10 }, () => ({ difficulty: "Spirited Strut", overallScore: 5 }));
    expect(checkNewBadges(buildStats({ ...base, debates: wrong }), [])).not.toContain("flock-leader");
  });
  it("dimension badges read stored message scores", () => {
    const s = buildStats({ ...base, messageDimensions: [dims(9, 3), null, dims(2, 9)] });
    const keys = checkNewBadges(s, []);
    expect(keys).toContain("warm-nest");
    expect(keys).toContain("sharp-beak");
  });
  it("streak and level badges", () => {
    const keys = checkNewBadges(buildStats({ ...base, currentStreak: 30, level: 5 }), []);
    expect(keys).toEqual(expect.arrayContaining(["migration-streak", "roosting-ritual", "golden-drumstick"]));
  });
  it("does not re-award existing badges", () => {
    const s = buildStats({ ...base, currentStreak: 30, level: 5 });
    expect(checkNewBadges(s, ["migration-streak", "roosting-ritual", "golden-drumstick"])).toEqual([]);
  });
  it("badge copy never mentions ranks or daily challenges", () => {
    for (const b of BADGES) {
      expect(`${b.name} ${b.description}`).not.toMatch(/daily|leader|rank|tom\b|flock leader/i);
    }
  });
});
