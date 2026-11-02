import { describe, it, expect } from "vitest";
import { SCHOOL_SCRIPTS } from "./schoolScripts";
import { TURKEY_SKILLS } from "./skills";

describe("SCHOOL_SCRIPTS", () => {
  for (const skill of TURKEY_SKILLS) {
    it(`${skill.key} has 3 well-formed steps`, () => {
      const steps = SCHOOL_SCRIPTS[skill.key];
      expect(steps).toHaveLength(3);
      for (const s of steps) {
        expect(s.ask.trim()).not.toBe("");
        expect(s.reply.trim()).not.toBe("");
        expect(s.chips.length).toBeGreaterThanOrEqual(2);
        for (const c of s.chips) expect(c.trim().length).toBeGreaterThanOrEqual(10);
      }
    });
  }
});
