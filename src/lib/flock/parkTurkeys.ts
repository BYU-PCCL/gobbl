import { PERSONAS, type Persona, type Tier } from "@/lib/personas/pool";

/** Where turkeys stand in the park, as percentages of its width and height. */
export const PARK_SPOTS: { x: number; y: number }[] = [
  { x: 24, y: 30 },
  { x: 72, y: 26 },
  { x: 50, y: 52 },
  { x: 22, y: 76 },
  { x: 76, y: 74 },
];

/** The five personas of a difficulty, in a shuffled order, each standing on one park spot. */
export function parkLineup(
  tier: Tier,
  rng: () => number = Math.random,
): { persona: Persona; x: number; y: number }[] {
  const pool = PERSONAS.filter((p) => p.tier === tier);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, PARK_SPOTS.length).map((persona, i) => ({ persona, ...PARK_SPOTS[i] }));
}
