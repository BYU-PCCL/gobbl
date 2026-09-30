/**
 * The partner's ideology is the "flip" of the user's onboarding belief, so the user
 * practices across the aisle. pickOpposingPersona (personas/pool.ts) uses this to choose
 * a persona on the opposite side; the persona's own beliefKey is what the prompt uses.
 */

import { BeliefKey } from "./beliefs";

const FLIP: Record<BeliefKey, BeliefKey> = {
  left: "right",
  "lean-left": "lean-right",
  center: "lean-right", // default opposing nudge; tweak as desired
  "lean-right": "lean-left",
  right: "left",
};

/** Opposite of the user's onboarding belief. */
export function flipBelief(userBelief: BeliefKey | null | undefined): BeliefKey {
  if (!userBelief) return "lean-right";
  return FLIP[userBelief] ?? "center";
}

/** Reads naturally after "you're" / "they're". */
const BELIEF_PHRASE: Record<BeliefKey, string> = {
  left: "on the left",
  "lean-left": "left-leaning",
  center: "a centrist",
  "lean-right": "right-leaning",
  right: "on the right",
};

/**
 * Setup-card copy explaining the partner's politics. Pass the previewed partner's actual
 * beliefKey — it can differ in intensity from flipBelief when a tier lacks an exact match.
 */
export function describeFlip(
  userBelief: BeliefKey | null | undefined,
  partnerBelief: BeliefKey | null | undefined,
): string {
  if (!partnerBelief) return "Matched from your onboarding profile so you practice across the aisle.";
  const partner = BELIEF_PHRASE[partnerBelief];
  if (!userBelief) return `They're ${partner} — set so you practice across the aisle.`;
  return `You're ${BELIEF_PHRASE[userBelief]}, so they're ${partner} — matched from your onboarding profile.`;
}
