import { describe, it, expect } from "vitest";
import { emphasizedActivity, moodLine, trendLabel, activityHref, activityNavHref } from "./home";

describe("emphasizedActivity", () => {
  it("is null when nothing is low", () => {
    expect(emphasizedActivity({ hunger: 80, loneliness: 30, sadness: 50 })).toBeNull();
  });
  it("picks the lowest need below NEED_LOW", () => {
    expect(emphasizedActivity({ hunger: 20, loneliness: 5, sadness: 90 })).toBe("park");
    expect(emphasizedActivity({ hunger: 0, loneliness: 100, sadness: 100 })).toBe("feed");
    expect(emphasizedActivity({ hunger: 100, loneliness: 100, sadness: 10 })).toBe("school");
  });
});

describe("moodLine", () => {
  it("uses the agreed copy", () => {
    expect(moodLine("sad", "Gobbles")).toBe("Gobbles missed you.");
    expect(moodLine("happy", "Gobbles")).toBe("Gobbles is feeling great!");
    expect(moodLine("hungry", null)).toBe("Your turkey is hungry.");
  });
});

describe("trendLabel", () => {
  it("handles null, up, down, flat", () => {
    expect(trendLabel(null)).toBe("Do a few activities to see your trend");
    expect(trendLabel(1.23)).toBe("Up 1.2 from earlier");
    expect(trendLabel(-0.8)).toBe("Down 0.8 from earlier");
    expect(trendLabel(0.01)).toBe("Holding steady");
  });
});

describe("activityHref", () => {
  it("builds links", () => {
    expect(activityHref("park", { id: "a", moduleKey: null })).toBe("/chat?turkeyId=a");
    expect(activityHref("feed", { id: "a", moduleKey: "reason-giving" })).toBe("/skills/reason-giving?turkeyId=a");
    expect(activityHref("feed", { id: "a", moduleKey: null })).toBe("/skills?turkeyId=a");
    expect(activityHref("school", { id: "a", moduleKey: null })).toBe("/school/a");
  });
});

describe("activityNavHref", () => {
  const t = { id: "t1", moduleKey: "active-listening" };
  it("links to the current turkey's activity", () => {
    expect(activityNavHref("school", t)).toBe("/school/t1");
    expect(activityNavHref("park", t)).toBe("/chat?turkeyId=t1");
    expect(activityNavHref("feed", t)).toBe("/skills/active-listening?turkeyId=t1");
  });
  it("sends you to hatch when there is no turkey yet", () => {
    expect(activityNavHref("school", null)).toBe("/hatch");
    expect(activityNavHref("park", null)).toBe("/hatch");
    expect(activityNavHref("feed", null)).toBe("/hatch");
  });
});
