import type { ComponentType } from "react";

/** What every custom step component receives from the module runner. */
export interface CustomStepProps {
  /** The `props` object from the step in registry.ts (empty if none were given). */
  props: Record<string, unknown>;
  /** Whatever this component last passed to onChange; undefined until then. */
  value: unknown;
  /** Saves the step's answer. This is what gets sent to the server on Continue. */
  onChange: (value: unknown) => void;
}

export interface CustomStepDef {
  Component: ComponentType<CustomStepProps>;
  /** Whether Continue is enabled for the current value. Leave out to always allow it. */
  isComplete?: (value: unknown) => boolean;
}

/**
 * Custom step components, keyed by the name a step uses in registry.ts:
 *   { id: "my-step", kind: "custom", component: "my-component" }
 */
export const CUSTOM_STEPS: Record<string, CustomStepDef> = {};
