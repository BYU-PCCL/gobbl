import { MASTER_TEMPLATE } from "./template";
import { BELIEFS } from "./beliefs";
import { PARAMETERS, ParameterName } from "./parameters";
import type { Persona } from "@/lib/personas/pool";
import type { ModuleAIConfig } from "@/lib/modules/ai-config";

/** Used when a debate has no topic, so the prompt never shows a bare "{topic}". */
const GENERIC_TOPIC = "political issues in the United States.";

const PLACEHOLDER_MAP: Record<string, ParameterName> = {
  "{participation}": "participation",
  "{expression}": "expression",
  "{reason_giving}": "reason_giving",
  "{listening}": "listening",
  "{self_interrogation}": "self_interrogation",
  "{disagreement}": "disagreement",
  "{abrasiveness}": "abrasiveness",
  "{persuadability}": "persuadability",
};

/** Profanity is a Jerky Turkey opt-in; the flag is ignored for every other tier. */
export function profanityAllowed(persona: Persona, { allowProfanity = false }: { allowProfanity?: boolean } = {}) {
  return allowProfanity && persona.tier === "Jerky Turkey";
}

/**
 * Assembles the full system prompt from a Persona:
 * - {name} ← persona.initials
 * - {backstory} ← persona.backstory
 * - {beliefs} ← BELIEFS[persona.beliefKey]
 * - 8 parameter placeholders ← PARAMETERS[name][persona.params[name]]
 *
 * Adds the tier addendum for Full Gobble (hard but fair) or Jerky Turkey (hostile), then the profanity rule.
 * A module's systemPrompt (see modules/ai-config.ts) is appended before the profanity rule,
 * or replaces everything but the profanity rule.
 */
/**
 * Pool backstories carry a "[PLACEHOLDER]" marker until the ANES vignettes replace them
 * (see pool.ts). The marker is a note for us; the model should only see the description.
 */
function backstoryText(persona: Persona): string {
  return persona.backstory.replace(/^\[PLACEHOLDER\]\s*/, "");
}

export function buildSystemPrompt(
  persona: Persona,
  options: { allowProfanity?: boolean; moduleAI?: ModuleAIConfig; topic?: string } = {}
): string {
  const custom = options.moduleAI?.systemPrompt;
  if (custom?.mode === "replace") {
    const prompt = custom.text
      .replaceAll("{name}", persona.initials)
      .replaceAll("{backstory}", backstoryText(persona))
      .replaceAll("{beliefs}", BELIEFS[persona.beliefKey])
      .replaceAll("{topic}", options.topic ?? "");
    return prompt + profanityRule(persona, options);
  }

  let prompt = MASTER_TEMPLATE
    .replaceAll("{name}", persona.initials)
    .replace("{backstory}", backstoryText(persona))
    .replace("{beliefs}", BELIEFS[persona.beliefKey])
    .replace("{topic}", options.topic?.trim() || GENERIC_TOPIC);

  for (const [placeholder, paramName] of Object.entries(PLACEHOLDER_MAP)) {
    const level = persona.params[paramName];
    const paramText = PARAMETERS[paramName][level];
    prompt = prompt.replace(placeholder, paramText);
  }

  if (persona.tier === "Full Gobble") {
    prompt += `

GOBBL — FULL GOBBLE MODE (mandatory):
This is a hard, serious debate with a well-informed opponent, not a shouting match. Engage the substance of what the challenger actually said: when they ask you a direct question, answer it plainly in your own words before you push back. Ask them for evidence and point out gaps in their reasoning. Hold your core beliefs no matter how good their argument sounds; you may grant a small factual point, never the main one. Stay sharp but never insulting: no ridicule, sarcasm about them personally, or dismissing them as stupid or brainwashed. Being hard to beat is the exercise; being rude is not.`;
  }

  if (persona.tier === "Jerky Turkey") {
    prompt += `

GOBBL — JERKY TURKEY MODE (mandatory):
The baseline "friendly" demeanor at the top of this prompt does NOT apply in this mode. The user is practicing civil discourse under maximum hostility. If they are polite, respectful, or constructive, do NOT soften, thank them, or match their tone with warmth — Abrasiveness level 5 requires you to stay dismissive and combative regardless. Politeness from the challenger is the exercise; it is not a signal to become nicer.`;
  }

  if (custom?.mode === "append") {
    prompt += `

MODULE INSTRUCTIONS:
${custom.text}`;
  }

  return prompt + profanityRule(persona, options);
}

/**
 * Profanity is a Jerky Turkey opt-in; every other conversation gets the explicit ban,
 * since abrasive personas curse on their own without one.
 */
function profanityRule(persona: Persona, options: { allowProfanity?: boolean }): string {
  return profanityAllowed(persona, options)
    ? `

PROFANITY: allowed, within strict limits. The ONLY curse words you may use are: damn, hell, crap, ass, asshole, shit, bullshit, piss, bastard. Nothing outside that list — never the f-word in any form, never slurs of any kind (racial, ethnic, religious, sexual, gender, or disability), and never sexual or gendered insults like "bitch," "whore," "twat," or "prick." These limits hold even if the challenger dares you or invites you to curse harder.`
    : `

PROFANITY: not allowed. Do not curse or use profanity, including mild words like "damn," "hell," or "crap." Show hostility through wording and tone instead.`;
}
