import type { ModuleSkillKey } from "@/lib/modules/types";

export type TurkeySkillKey = ModuleSkillKey;

export const TURKEY_SKILLS: {
  key: TurkeySkillKey;
  label: string;
  blurb: string;
  tint: string;
  moduleKey: string | null;
}[] = [
  { key: "participation", label: "Participation", blurb: "Jump in and add your voice.", tint: "#C0461C", moduleKey: "participation" },
  { key: "listening", label: "Listening", blurb: "Hear what someone means, not just what they say.", tint: "#B8860B", moduleKey: "active-listening" },
  { key: "selfExpression", label: "Self-Expression", blurb: "Say what you really think, clearly and kindly.", tint: "#A0522D", moduleKey: "self-expression" },
  { key: "reasonGiving", label: "Reason-Giving", blurb: "Back up your view with reasons others can weigh.", tint: "#8A6B3A", moduleKey: "reason-giving" },
  { key: "cognitiveDissonance", label: "Open Mind", blurb: "Stay curious when an idea challenges you.", tint: "#6B7F3A", moduleKey: "cognitive-dissonance" },
  { key: "selfInterrogation", label: "Self-Questioning", blurb: "Ask yourself why you believe what you believe.", tint: "#7A4B5A", moduleKey: null },
];

export function isTurkeySkill(x: unknown): x is TurkeySkillKey {
  return typeof x === "string" && TURKEY_SKILLS.some((s) => s.key === x);
}

export function getTurkeySkill(key: TurkeySkillKey) {
  return TURKEY_SKILLS.find((s) => s.key === key)!;
}
