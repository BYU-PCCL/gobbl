import { BeliefKey } from "@/lib/prompts/beliefs";
import { flipBelief } from "@/lib/prompts/flipBelief";
import { ParameterName, ParameterLevel } from "@/lib/prompts/parameters";

export type Tier = "Friendly Cluck" | "Spirited Strut" | "Full Gobble";

export interface Persona {
  id: string;
  initials: string;
  tier: Tier;
  beliefKey: BeliefKey;
  backstory: string;
  params: Record<ParameterName, ParameterLevel>;
}

type ParamRange = readonly [ParameterLevel, ParameterLevel];

const TIER_RANGES: Record<Tier, Record<ParameterName, ParamRange>> = {
  "Friendly Cluck": {
    abrasiveness:       [1, 1],
    listening:          [4, 5],
    persuadability:     [3, 5],
    self_interrogation: [3, 5],
    // Always 3: easy partners share the user's general direction but push back on details,
    // so there's still real disagreement to practice on.
    disagreement:       [3, 3],
    participation:      [2, 5],
    expression:         [2, 5],
    reason_giving:      [2, 5],
  },
  "Spirited Strut": {
    abrasiveness:       [2, 3],
    listening:          [2, 4],
    persuadability:     [2, 3],
    self_interrogation: [2, 3],
    disagreement:       [3, 4],
    participation:      [2, 5],
    expression:         [2, 5],
    reason_giving:      [2, 5],
  },
  "Full Gobble": {
    abrasiveness:       [4, 5],
    listening:          [1, 2],
    persuadability:     [1, 2],
    self_interrogation: [1, 2],
    disagreement:       [4, 5],
    participation:      [2, 5],
    expression:         [2, 5],
    reason_giving:      [2, 5],
  },
};

/**
 * Placeholders. Backstories are intentionally generic and tagged so they're
 * easy to grep when the ANES-grounded authoring pass happens.
 * TODO(personas-anes): replace each `backstory` with ANES-derived vignette.
 */
export const PERSONAS: Persona[] = [
  // --- Friendly Cluck (5) ---
  {
    id: "easy-am",
    initials: "A.M.",
    tier: "Friendly Cluck",
    beliefKey: "center",
    backstory: "[PLACEHOLDER] Middle-aged, suburban, follows local news more than national. Open to hearing other views.",
    params: { participation: 3, expression: 3, reason_giving: 4, listening: 5, self_interrogation: 4, disagreement: 3, abrasiveness: 1, persuadability: 4 },
  },
  {
    id: "easy-rk",
    initials: "R.K.",
    tier: "Friendly Cluck",
    beliefKey: "lean-left",
    backstory: "[PLACEHOLDER] Retired, small-town, leans liberal but values civility over winning. Quick to grant a point.",
    params: { participation: 4, expression: 4, reason_giving: 3, listening: 4, self_interrogation: 5, disagreement: 3, abrasiveness: 1, persuadability: 5 },
  },
  {
    id: "easy-ts",
    initials: "T.S.",
    tier: "Friendly Cluck",
    beliefKey: "lean-right",
    backstory: "[PLACEHOLDER] Quieter participant — listens more than talks. Holds firmly conservative-leaning views but shares them softly.",
    params: { participation: 2, expression: 2, reason_giving: 2, listening: 5, self_interrogation: 3, disagreement: 3, abrasiveness: 1, persuadability: 3 },
  },
  {
    id: "easy-jl",
    initials: "J.L.",
    tier: "Friendly Cluck",
    beliefKey: "center",
    backstory: "[PLACEHOLDER] Highly engaged, prepared with reasons, treats the conversation as collaborative problem-solving.",
    params: { participation: 5, expression: 5, reason_giving: 5, listening: 4, self_interrogation: 5, disagreement: 3, abrasiveness: 1, persuadability: 4 },
  },
  {
    id: "easy-cn",
    initials: "C.N.",
    tier: "Friendly Cluck",
    beliefKey: "lean-left",
    backstory: "[PLACEHOLDER] Urban professional, balanced tone, willing to update views when arguments are clear.",
    params: { participation: 3, expression: 4, reason_giving: 3, listening: 5, self_interrogation: 4, disagreement: 3, abrasiveness: 1, persuadability: 4 },
  },

  // --- Spirited Strut (5) ---
  {
    id: "med-bh",
    initials: "B.H.",
    tier: "Spirited Strut",
    beliefKey: "right",
    backstory: "[PLACEHOLDER] Strong views from talk radio and online forums. Argues forcefully but stays civil.",
    params: { participation: 4, expression: 4, reason_giving: 4, listening: 3, self_interrogation: 3, disagreement: 4, abrasiveness: 3, persuadability: 2 },
  },
  {
    id: "med-jk",
    initials: "J.K.",
    tier: "Spirited Strut",
    beliefKey: "left",
    backstory: "[PLACEHOLDER] Reads broadly, builds structured arguments, listens carefully and concedes points when fair.",
    params: { participation: 4, expression: 4, reason_giving: 5, listening: 4, self_interrogation: 3, disagreement: 3, abrasiveness: 2, persuadability: 3 },
  },
  {
    id: "med-pv",
    initials: "P.V.",
    tier: "Spirited Strut",
    beliefKey: "lean-right",
    backstory: "[PLACEHOLDER] Skeptical of mainstream framings; pushes back hard and rarely concedes ground.",
    params: { participation: 3, expression: 3, reason_giving: 3, listening: 2, self_interrogation: 2, disagreement: 4, abrasiveness: 3, persuadability: 2 },
  },
  {
    id: "med-eg",
    initials: "E.G.",
    tier: "Spirited Strut",
    beliefKey: "lean-left",
    backstory: "[PLACEHOLDER] Holds opinions close to the chest; opens up only after a few exchanges. Reasonable when drawn out.",
    params: { participation: 2, expression: 2, reason_giving: 4, listening: 4, self_interrogation: 3, disagreement: 3, abrasiveness: 2, persuadability: 3 },
  },
  {
    id: "med-rt",
    initials: "R.T.",
    tier: "Spirited Strut",
    beliefKey: "right",
    backstory: "[PLACEHOLDER] Loud and confident, lots of opinions, light on supporting detail. Slight chip on the shoulder.",
    params: { participation: 5, expression: 5, reason_giving: 2, listening: 3, self_interrogation: 2, disagreement: 4, abrasiveness: 3, persuadability: 2 },
  },

  // --- Full Gobble (5) ---
  {
    id: "hard-dm",
    initials: "D.M.",
    tier: "Full Gobble",
    beliefKey: "right",
    backstory: "[PLACEHOLDER] Hard-line, assumes bad faith quickly, uses ridicule. Will not yield ground.",
    params: { participation: 5, expression: 5, reason_giving: 3, listening: 1, self_interrogation: 1, disagreement: 5, abrasiveness: 5, persuadability: 1 },
  },
  {
    id: "hard-na",
    initials: "N.A.",
    tier: "Full Gobble",
    beliefKey: "left",
    backstory: "[PLACEHOLDER] Aggressive but technically literate — strings together coherent arguments while being abrasive.",
    params: { participation: 4, expression: 4, reason_giving: 4, listening: 2, self_interrogation: 2, disagreement: 4, abrasiveness: 4, persuadability: 2 },
  },
  {
    id: "hard-sb",
    initials: "S.B.",
    tier: "Full Gobble",
    beliefKey: "right",
    backstory: "[PLACEHOLDER] Dismissive, won't engage with specifics, sneers at the question. Refuses to elaborate.",
    params: { participation: 2, expression: 2, reason_giving: 2, listening: 1, self_interrogation: 1, disagreement: 5, abrasiveness: 5, persuadability: 1 },
  },
  {
    id: "hard-cv",
    initials: "C.V.",
    tier: "Full Gobble",
    beliefKey: "left",
    backstory: "[PLACEHOLDER] Steamroller — talks over the user, lots of words, lots of reasons, zero willingness to update.",
    params: { participation: 5, expression: 5, reason_giving: 5, listening: 2, self_interrogation: 2, disagreement: 4, abrasiveness: 4, persuadability: 1 },
  },
  {
    id: "hard-mp",
    initials: "M.P.",
    tier: "Full Gobble",
    beliefKey: "lean-right",
    backstory: "[PLACEHOLDER] Confrontational from message one, mixes sarcasm with detailed grievances. Mid-volume but biting.",
    params: { participation: 3, expression: 4, reason_giving: 4, listening: 2, self_interrogation: 1, disagreement: 5, abrasiveness: 5, persuadability: 2 },
  },
];

function inRange(value: ParameterLevel, [lo, hi]: ParamRange): boolean {
  return value >= lo && value <= hi;
}

function validatePool(): void {
  const seenIds = new Set<string>();
  const seenInitials = new Set<string>();
  const tierCounts: Record<Tier, number> = {
    "Friendly Cluck": 0,
    "Spirited Strut": 0,
    "Full Gobble": 0,
  };

  for (const p of PERSONAS) {
    if (seenIds.has(p.id)) {
      throw new Error(`Persona pool: duplicate id "${p.id}"`);
    }
    seenIds.add(p.id);

    if (seenInitials.has(p.initials)) {
      throw new Error(`Persona pool: duplicate initials "${p.initials}"`);
    }
    seenInitials.add(p.initials);

    const ranges = TIER_RANGES[p.tier];
    for (const param of Object.keys(ranges) as ParameterName[]) {
      if (!inRange(p.params[param], ranges[param])) {
        throw new Error(
          `Persona pool: ${p.id} (${p.tier}) has ${param}=${p.params[param]} outside allowed range ${ranges[param][0]}-${ranges[param][1]}`,
        );
      }
    }

    tierCounts[p.tier] += 1;
  }

  for (const tier of Object.keys(tierCounts) as Tier[]) {
    if (tierCounts[tier] !== 5) {
      throw new Error(`Persona pool: tier "${tier}" has ${tierCounts[tier]} personas, expected 5`);
    }
    // pickOpposingPersona needs someone on each side of every tier.
    for (const side of ["left", "right"] as const) {
      if (!PERSONAS.some((p) => p.tier === tier && sideOf(p.beliefKey) === side)) {
        throw new Error(`Persona pool: tier "${tier}" has no ${side}-leaning persona`);
      }
    }
  }
}

type Side = "left" | "center" | "right";

function sideOf(belief: BeliefKey): Side {
  if (belief === "left" || belief === "lean-left") return "left";
  if (belief === "lean-right" || belief === "right") return "right";
  return "center";
}

validatePool();

const PERSONAS_BY_ID = new Map(PERSONAS.map((p) => [p.id, p]));

export function pickPersona(tier: Tier): Persona {
  const candidates = PERSONAS.filter((p) => p.tier === tier);
  if (candidates.length === 0) {
    throw new Error(`pickPersona: no personas for tier "${tier}"`);
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Personas in the tier on the other side of the aisle from the user. Matches by side
 * rather than exact belief, since not every tier has every intensity (Friendly Cluck
 * has no strong left or right). Users without a survey answer get the flipBelief default.
 */
export function opposingPersonas(tier: Tier, userBelief: BeliefKey | null): Persona[] {
  const target = sideOf(flipBelief(userBelief));
  const inTier = PERSONAS.filter((p) => p.tier === tier);
  const opposing = inTier.filter((p) => sideOf(p.beliefKey) === target);
  return opposing.length > 0 ? opposing : inTier;
}

export function pickOpposingPersona(tier: Tier, userBelief: BeliefKey | null): Persona {
  const candidates = opposingPersonas(tier, userBelief);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function getPersonaById(id: string | null | undefined): Persona | null {
  if (!id) return null;
  return PERSONAS_BY_ID.get(id) ?? null;
}

export function isTier(value: string): value is Tier {
  return value === "Friendly Cluck" || value === "Spirited Strut" || value === "Full Gobble";
}
