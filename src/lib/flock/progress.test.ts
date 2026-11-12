import { describe, expect, it } from "vitest";
import { followUp, nextStep, unlockedFor } from "./progress";

describe("activity order", () => {
  it("keeps School and Park shut for an egg", () => {
    expect(unlockedFor(false, { feed: true, school: true })).toEqual({ school: false, park: false });
  });
  it("opens School once fed, and Park once schooled", () => {
    expect(unlockedFor(true, { feed: false, school: false })).toEqual({ school: false, park: false });
    expect(unlockedFor(true, { feed: true, school: false })).toEqual({ school: true, park: false });
    expect(unlockedFor(true, { feed: true, school: true })).toEqual({ school: true, park: true });
  });
  it("never opens Park for a turkey that was schooled but not fed", () => {
    expect(unlockedFor(true, { feed: false, school: true })).toEqual({ school: false, park: false });
  });
  it("names the next step", () => {
    expect(nextStep(false, { feed: false, school: false })).toBe("feed");
    expect(nextStep(true, { feed: false, school: false })).toBe("feed");
    expect(nextStep(true, { feed: true, school: false })).toBe("school");
    expect(nextStep(true, { feed: true, school: true })).toBeNull();
  });
  it("leads on to the activity that just opened", () => {
    expect(followUp("feed")).toBe("school");
    expect(followUp("school")).toBe("park");
    expect(followUp("park")).toBe("park");
  });
});
