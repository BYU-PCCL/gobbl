import type { ModuleStep, ModuleVariant } from "./types";

/** Position metadata for a step, so clients can render "Step 2 of 6" without the registry. */
export function stepMeta(variant: ModuleVariant, step: ModuleStep | null) {
  return {
    stepIndex: step ? variant.steps.findIndex((s) => s.id === step.id) : null,
    stepCount: variant.steps.length,
  };
}
