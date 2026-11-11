import type { TurkeyPalette } from "@/lib/turkeyPalette";

/**
 * Species looks for flock turkeys (one species per skill, see `TURKEY_SKILLS[].species`) and the
 * lines a turkey says on lesson screens. Client-safe (no Prisma, no DOM).
 */
export type SpeciesId = "eastern" | "ocellated" | "goulds" | "rio" | "merriams";
export type EggPattern = "flecks" | "rings" | "split" | "stripe" | "tips";

export interface Species {
  id: SpeciesId;
  /** Full name, e.g. "Eastern wild turkey". */
  name: string;
  /** Short name used in UI, e.g. "Eastern". */
  commonName: string;
  /** The module of the skill this species belongs to (ModuleConfig.key). */
  suggestedModuleKey: string;
  /** Starter-style blurb shown on the egg screen. */
  eggDesc: string;
  /** Professor Pinfeather's line when the egg is tapped. */
  professorLine: string;
  /** Species colours; `egg`/`speck` colour the stage-1 egg. */
  palette: TurkeyPalette;
  eggPattern: EggPattern;
}

export const SPECIES: Species[] = [
  {
    id: "eastern", name: "Eastern wild turkey", commonName: "Eastern", suggestedModuleKey: "participation",
    eggDesc: "The most widespread turkey in the land, and tough as old boots. This one wants to learn how to stay in the room when talk gets heated.",
    professorLine: "Ah, the Eastern! Hardy and stubborn in the best way. It will want to stay put when the going gets tough.",
    palette: { body: "#C0461C", bodyDark: "#8E2F11", belly: "#E4A547", fan1: "#E4A547", fan2: "#C0461C", fan3: "#7A2916", fan4: "#1F4937", crown: "#E4A547", egg: "#F6E3CF", speck: "#B5602F" },
    eggPattern: "flecks",
  },
  {
    id: "ocellated", name: "Ocellated turkey", commonName: "Ocellated", suggestedModuleKey: "active-listening",
    eggDesc: "A jewel of the Yucatan, with shimmering eye-spots all over its tail. It has been watching everything, and it wants to learn how to really listen.",
    professorLine: "The Ocellated! Look at those eye-spots. A bird that notices things makes a fine listener.",
    palette: { body: "#1F7A7A", bodyDark: "#145559", belly: "#D9A83E", fan1: "#2FA39A", fan2: "#1B6F8C", fan3: "#14455F", fan4: "#D9A83E", crown: "#3FB6D6", egg: "#D6EEE9", speck: "#2B8C8C" },
    eggPattern: "rings",
  },
  {
    id: "goulds", name: "Gould's wild turkey", commonName: "Gould's", suggestedModuleKey: "cognitive-dissonance",
    eggDesc: "The biggest of them all, and it lives right across the US-Mexico border. It wants to get comfortable with ideas that pull in two directions at once.",
    professorLine: "Gould's! Big bird, big feelings. It will learn to sit with the tension instead of running from it.",
    palette: { body: "#5A3A28", bodyDark: "#3A2418", belly: "#8A6446", fan1: "#FBF3E2", fan2: "#7A5238", fan3: "#4A2E1E", fan4: "#F4E7CC", crown: "#E9D8B4", egg: "#E6D3C4", speck: "#8A6446" },
    eggPattern: "split",
  },
  {
    id: "rio", name: "Rio Grande wild turkey", commonName: "Rio Grande", suggestedModuleKey: "self-expression",
    eggDesc: "An open-country strutter with a very loud voice. It has plenty to say, and it wants to learn how to say what it really thinks.",
    professorLine: "The Rio Grande! Loud and proud on the open plains. Let's help it find its own words.",
    palette: { body: "#B9794A", bodyDark: "#8A5430", belly: "#E8CFA0", fan1: "#EBD7AE", fan2: "#C98B58", fan3: "#8A5430", fan4: "#6E8B5A", crown: "#F0DDB4", egg: "#F4E6D0", speck: "#C98B58" },
    eggPattern: "stripe",
  },
  {
    id: "merriams", name: "Merriam's wild turkey", commonName: "Merriam's", suggestedModuleKey: "reason-giving",
    eggDesc: "A sure-footed mountain bird with a white-tipped tail. It likes solid footing, so it wants to learn how to back up what it believes.",
    professorLine: "Merriam's! Look at that white-tipped tail. A mountain bird knows you need firm ground, and so do good reasons.",
    palette: { body: "#2E2F36", bodyDark: "#1A1B20", belly: "#6C6F7A", fan1: "#FBF6EA", fan2: "#E6DCC4", fan3: "#46474F", fan4: "#FFFFFF", crown: "#EFE3C6", egg: "#E8E6EA", speck: "#FFFFFF" },
    eggPattern: "tips",
  },
];

export const DEFAULT_SPECIES_ID: SpeciesId = "eastern";

export function isSpeciesId(x: unknown): x is SpeciesId {
  return typeof x === "string" && SPECIES.some((s) => s.id === x);
}

/** Falls back to the Eastern (the app's default Harvest palette) when there is no turkey or its skill has no species. */
export function getSpecies(id: string | null | undefined): Species {
  return SPECIES.find((s) => s.id === id) ?? SPECIES[0];
}

/** The turkey (or egg) shown beside the user on lesson and conversation screens. See `companionFromTurkey`. */
export interface CompanionInfo {
  /** The flock turkey this is; null when the user has no turkey yet. */
  turkeyId: string | null;
  speciesId: SpeciesId | null;
  hatched: boolean;
  /** Per-turkey growth stage (1 = egg), from its own activities. */
  stage: number;
  name: string | null;
}

/* ---------- copy ---------- */

export type CompanionLineKind = "diagnostic" | "content" | "reflection" | "quiz" | "practice" | "last";

/** What the companion says on a module step, before (egg) and after (turkey) hatching. */
export const COMPANION_LINES: Record<CompanionLineKind, { egg: string; turkey: string }> = {
  diagnostic: { egg: "Answer honestly. I can feel it either way.", turkey: "What do you think? I'm listening." },
  content:    { egg: "Read it to me? I can hear you through the shell.", turkey: "Let's go through this together." },
  reflection: { egg: "Hm, that stirred something in here.", turkey: "That's worth sitting with for a moment." },
  quiz:       { egg: "Teach me. If I get it, I think I can come out.", turkey: "Quiz me. I want to get this right." },
  practice:   { egg: "Pick a topic and I'll listen from in here.", turkey: "Pick a topic. I'll stand next to you." },
  last:       { egg: "Almost done. I can feel it.", turkey: "One last stretch, and we're through." },
};

export function companionLine(kind: CompanionLineKind, hatched: boolean): string {
  return COMPANION_LINES[kind][hatched ? "turkey" : "egg"];
}

export const PROFESSOR_NAME = "Professor Pinfeather";

export function professorIntro(username: string | null | undefined): string {
  const name = (username ?? "").trim() || "friend";
  return `Welcome, ${name}! I'm ${PROFESSOR_NAME}, and I study how turkeys learn to talk things out. Five eggs are warming in the straw, and each one wants to practice a different skill. Take your time, then pick the one that feels like yours.`;
}
