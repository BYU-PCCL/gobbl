import { describe, it, expect } from "vitest";
import { toTurkeyView } from "./view";

const now = new Date("2026-11-02T12:00:00Z");
const base = {
  id: "t1",
  userId: "u1",
  skill: "listening",
  name: null,
  hatchedAt: null,
  activityCount: 0,
  lastFedAt: null,
  lastSocialAt: null,
  lastTaughtAt: null,
  createdAt: now,
};

describe("toTurkeyView", () => {
  it("renders an unhatched row as an egg with empty needs", () => {
    const v = toTurkeyView(base, now);
    expect(v.stage).toBe(1);
    expect(v.hatched).toBe(false);
    expect(v.needs).toEqual({ hunger: 0, loneliness: 0, sadness: 0 });
  });

  it("renders a fresh hatched row", () => {
    const v = toTurkeyView(
      { ...base, name: "Gobbles", hatchedAt: now, activityCount: 3, lastFedAt: now, lastSocialAt: now, lastTaughtAt: now },
      now,
    );
    expect(v.stage).toBe(3);
    expect(v.hatched).toBe(true);
    expect(v.needs).toEqual({ hunger: 100, loneliness: 100, sadness: 100 });
    expect(v.mood).toBe("happy");
    expect(v.skillLabel).toBe("Listening");
    expect(v.moduleKey).toBe("active-listening");
    expect(v.stageName).toBe("Poult");
  });
});
