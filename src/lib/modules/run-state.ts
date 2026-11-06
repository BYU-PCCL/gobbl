import type { ModuleConfig, ModuleStep, ModuleVariant } from "./types";

/**
 * Reserved key in SkillSession.stepResponses (step answers are keyed by step id next to it).
 * Holds stepsSignature() of the variant as it was when the run started.
 */
export const STEPS_SIGNATURE_KEY = "_steps";

/**
 * A variant's step list in order: each step's id and kind (and component, for custom steps).
 * Adding, removing, renaming, reordering or retyping a step changes it; rewording a step's
 * text does not, so a typo fix doesn't restart anyone.
 */
export function stepsSignature(variant: ModuleVariant): string {
  return variant.steps
    .map((s) => (s.kind === "custom" ? `${s.id}:custom:${s.component}` : `${s.id}:${s.kind}`))
    .join("|");
}

/**
 * Where a saved run (a SkillSession) stands against the module as it is defined today.
 *
 * A run is "stale" when the module's steps have changed since it started: it can't be trusted
 * to resume in the right place, and it can't be finalized. Treat a stale run as "no run to
 * resume" (the user starts again from the first step), never as "finished", or the user is
 * stuck on it. The stale row itself is left alone.
 */
export type RunState =
  | { kind: "step"; variant: ModuleVariant; step: ModuleStep }
  /** Every step is done; /complete still has to pay out and set completedAt. */
  | { kind: "finished"; variant: ModuleVariant }
  | { kind: "stale" };

export function getRunState(
  moduleConfig: ModuleConfig,
  run: { variant: string; stage: string; stepResponses?: unknown },
): RunState {
  const variant = moduleConfig.variants.find((v) => v.key === run.variant) ?? moduleConfig.variants[0];
  // All the work is done, so it still pays out even if the module has changed since.
  if (run.stage === "complete") return { kind: "finished", variant };

  const startedWith = (run.stepResponses as Record<string, unknown> | null | undefined)?.[STEPS_SIGNATURE_KEY];
  if (typeof startedWith === "string" && startedWith !== stepsSignature(variant)) return { kind: "stale" };

  // Runs from before signatures were saved have none: all that can be checked is that the
  // step they are on still exists.
  const step = variant.steps.find((s) => s.id === run.stage);
  return step ? { kind: "step", variant, step } : { kind: "stale" };
}
