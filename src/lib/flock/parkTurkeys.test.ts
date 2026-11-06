import { describe, it, expect } from "vitest";
import { PERSONAS } from "@/lib/personas/pool";
import { PARK_TURKEYS, getParkTurkey } from "./parkTurkeys";
import { isTurkeySkill } from "./skills";

describe("PARK_TURKEYS", () => {
  it("has one turkey for every easy (Friendly Cluck) persona", () => {
    const easy = PERSONAS.filter((p) => p.tier === "Friendly Cluck").map((p) => p.id).sort();
    expect(PARK_TURKEYS.map((t) => t.personaId).sort()).toEqual(easy);
  });
  it("gives each turkey a distinct name and look", () => {
    expect(new Set(PARK_TURKEYS.map((t) => t.name)).size).toBe(PARK_TURKEYS.length);
    expect(new Set(PARK_TURKEYS.map((t) => t.look)).size).toBe(PARK_TURKEYS.length);
    for (const t of PARK_TURKEYS) expect(isTurkeySkill(t.look)).toBe(true);
  });
  it("places every turkey inside the park", () => {
    for (const t of PARK_TURKEYS) {
      expect(t.x).toBeGreaterThanOrEqual(10);
      expect(t.x).toBeLessThanOrEqual(90);
      expect(t.y).toBeGreaterThanOrEqual(15);
      expect(t.y).toBeLessThanOrEqual(85);
    }
  });
});

describe("getParkTurkey", () => {
  it("finds a park turkey by persona id", () => {
    expect(getParkTurkey(PARK_TURKEYS[0].personaId)?.name).toBe(PARK_TURKEYS[0].name);
  });
  it("is null for personas that aren't in the park", () => {
    expect(getParkTurkey("med-bh")).toBeNull();
    expect(getParkTurkey(null)).toBeNull();
    expect(getParkTurkey("nope")).toBeNull();
  });
});
