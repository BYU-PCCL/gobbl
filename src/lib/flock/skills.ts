import type { ModuleSkillKey } from "@/lib/modules/types";
import type { SpeciesId } from "@/lib/companion";

export type TurkeySkillKey = ModuleSkillKey;

export const TURKEY_SKILLS: {
  key: TurkeySkillKey;
  label: string;
  blurb: string;
  tint: string;
  moduleKey: string | null;
  /** The species look every turkey of this skill has. null: no look yet, so no egg is offered. */
  species: SpeciesId | null;
}[] = [
  { key: "participation", label: "Participation", blurb: "Jump in and add your voice.", tint: "#C0461C", moduleKey: "participation", species: "eastern" },
  { key: "listening", label: "Listening", blurb: "Hear what someone means, not just what they say.", tint: "#477649", moduleKey: "active-listening", species: "ocellated" },
  { key: "selfExpression", label: "Self-Expression", blurb: "Say what you really think, clearly and kindly.", tint: "#E4A547", moduleKey: "self-expression", species: "rio" },
  { key: "reasonGiving", label: "Reason-Giving", blurb: "Back up your view with reasons others can weigh.", tint: "#7A2916", moduleKey: "reason-giving", species: "merriams" },
  { key: "cognitiveDissonance", label: "Open Mind", blurb: "Stay curious when an idea challenges you.", tint: "#759B73", moduleKey: "cognitive-dissonance", species: "goulds" },
  { key: "selfInterrogation", label: "Self-Questioning", blurb: "Ask yourself why you believe what you believe.", tint: "#9B6D1E", moduleKey: null, species: null },
];

export function isTurkeySkill(x: unknown): x is TurkeySkillKey {
  return typeof x === "string" && TURKEY_SKILLS.some((s) => s.key === x);
}

/** Skills an egg can be picked or bought for: the ones with a species look and a module. */
export const EGG_SKILLS = TURKEY_SKILLS.filter((s) => s.species !== null && s.moduleKey !== null);

export function isEggSkill(x: unknown): x is TurkeySkillKey {
  return typeof x === "string" && EGG_SKILLS.some((s) => s.key === x);
}

export function getTurkeySkill(key: TurkeySkillKey) {
  return TURKEY_SKILLS.find((s) => s.key === key)!;
}
