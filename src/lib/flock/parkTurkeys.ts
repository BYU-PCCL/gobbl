import type { TurkeySkillKey } from "./skills";

/**
 * The turkeys you meet at the park. Each one is an easy ("Friendly Cluck")
 * conversation partner from src/lib/personas/pool.ts, given a name, a look and
 * a spot in the park. `look` borrows a skill's tint so the placeholder turkeys
 * are easy to tell apart; it says nothing about the persona's views.
 */
export interface ParkTurkey {
  personaId: string;
  name: string;
  look: TurkeySkillKey;
  /** Position in the park, as percentages of its width and height. */
  x: number;
  y: number;
}

export const PARK_TURKEYS: ParkTurkey[] = [
  { personaId: "easy-am", name: "Amos", look: "listening", x: 24, y: 30 },
  { personaId: "easy-rk", name: "Ruthie", look: "selfExpression", x: 72, y: 26 },
  { personaId: "easy-ts", name: "Tobias", look: "reasonGiving", x: 50, y: 52 },
  { personaId: "easy-jl", name: "Juniper", look: "cognitiveDissonance", x: 22, y: 76 },
  { personaId: "easy-cn", name: "Clem", look: "selfInterrogation", x: 76, y: 74 },
];

export function getParkTurkey(personaId: string | null | undefined): ParkTurkey | null {
  return PARK_TURKEYS.find((t) => t.personaId === personaId) ?? null;
}
