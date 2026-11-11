import type { Tier } from "@/lib/personas/pool";
import type { TurkeySkillKey } from "./skills";

/**
 * The turkeys you meet at the park. Each one is a conversation partner from
 * src/lib/personas/pool.ts, given a name, a look and a spot in the park. `personaId` is
 * its easy ("Friendly Cluck") persona and the id the park knows it by; `harder` are the
 * personas it uses when the user asks it to push back more, so the same named turkey can
 * be talked to at every difficulty. `look` borrows a skill's tint so the placeholder turkeys
 * are easy to tell apart; it says nothing about the persona's views.
 */
export interface ParkTurkey {
  personaId: string;
  harder: Record<Exclude<Tier, "Friendly Cluck">, string>;
  name: string;
  look: TurkeySkillKey;
  /** Position in the park, as percentages of its width and height. */
  x: number;
  y: number;
}

export const PARK_TURKEYS: ParkTurkey[] = [
  { personaId: "easy-am", harder: { "Spirited Strut": "med-bh", "Full Gobble": "hard-dm" }, name: "Amos", look: "listening", x: 24, y: 30 },
  { personaId: "easy-rk", harder: { "Spirited Strut": "med-jk", "Full Gobble": "hard-na" }, name: "Ruthie", look: "selfExpression", x: 72, y: 26 },
  { personaId: "easy-ts", harder: { "Spirited Strut": "med-pv", "Full Gobble": "hard-sb" }, name: "Tobias", look: "reasonGiving", x: 50, y: 52 },
  { personaId: "easy-jl", harder: { "Spirited Strut": "med-eg", "Full Gobble": "hard-cv" }, name: "Juniper", look: "cognitiveDissonance", x: 22, y: 76 },
  { personaId: "easy-cn", harder: { "Spirited Strut": "med-rt", "Full Gobble": "hard-mp" }, name: "Clem", look: "selfInterrogation", x: 76, y: 74 },
];

/** The persona a park turkey speaks with at a difficulty. */
export function parkPersonaIdFor(turkey: ParkTurkey, tier: Tier): string {
  return tier === "Friendly Cluck" ? turkey.personaId : turkey.harder[tier];
}

/** The park turkey behind a persona id, whichever difficulty that persona is. */
export function getParkTurkey(personaId: string | null | undefined): ParkTurkey | null {
  if (!personaId) return null;
  return (
    PARK_TURKEYS.find((t) => t.personaId === personaId || Object.values(t.harder).includes(personaId)) ?? null
  );
}
