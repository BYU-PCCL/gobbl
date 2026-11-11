import { test, expect } from "vitest";
import { TURKEY_SKILLS, getTurkeySkill, isTurkeySkill } from "./skills";

test("all six keys resolve", () => {
  expect(TURKEY_SKILLS).toHaveLength(6);
  for (const s of TURKEY_SKILLS) expect(getTurkeySkill(s.key)).toBe(s);
});
test("tints are valid and distinct", () => {
  const tints = TURKEY_SKILLS.map((s) => s.tint);
  for (const t of tints) expect(t).toMatch(/^#[0-9A-F]{6}$/i);
  expect(new Set(tints.map((t) => t.toLowerCase())).size).toBe(6);
});
test("isTurkeySkill rejects unknown", () => expect(isTurkeySkill("juggling")).toBe(false));
