import { describe, it, expect } from "vitest";
import { PERSONAS, type Tier } from "@/lib/personas/pool";
import { PARK_SPOTS, parkLineup } from "./parkTurkeys";

const TIERS: Tier[] = ["Friendly Cluck", "Spirited Strut", "Full Gobble"];

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe("parkLineup", () => {
  it("puts exactly the tier's five personas on five distinct spots", () => {
    for (const tier of TIERS) {
      const lineup = parkLineup(tier);
      const expected = PERSONAS.filter((p) => p.tier === tier).map((p) => p.id).sort();
      expect(lineup).toHaveLength(5);
      expect(lineup.map((l) => l.persona.id).sort()).toEqual(expected);
      const spots = new Set(lineup.map((l) => `${l.x},${l.y}`));
      expect(spots.size).toBe(5);
      for (const l of lineup) expect(PARK_SPOTS).toContainEqual({ x: l.x, y: l.y });
    }
  });
  it("shuffles: some seed gives a different order than the pool order", () => {
    const identity = PERSONAS.filter((p) => p.tier === "Friendly Cluck").map((p) => p.id);
    const differs = [1, 2, 3, 4, 5].some(
      (seed) => parkLineup("Friendly Cluck", seeded(seed)).map((l) => l.persona.id).join() !== identity.join(),
    );
    expect(differs).toBe(true);
  });
  it("keeps every spot inside the park", () => {
    for (const s of PARK_SPOTS) {
      expect(s.x).toBeGreaterThanOrEqual(10);
      expect(s.x).toBeLessThanOrEqual(90);
      expect(s.y).toBeGreaterThanOrEqual(15);
      expect(s.y).toBeLessThanOrEqual(85);
    }
  });
});
