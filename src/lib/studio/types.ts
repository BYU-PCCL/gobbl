import type { ModuleSkillKey } from "@/lib/modules/types";

/**
 * The saved shape of a Module Studio draft.
 *
 * A draft mirrors a ModuleConfig (src/lib/modules/types.ts): some module-wide settings and
 * one or two variants, each an ordered list of steps. Each step names a component from
 * STUDIO_COMPONENTS (see ./components.ts) by `type` and carries that component's settings
 * in `props`.
 */
export interface StudioStep {
  id: string;
  type: string;
  props: Record<string, unknown>;
}

export type StudioVariantKey = "standard" | "advanced";

export interface StudioVariant {
  key: StudioVariantKey;
  steps: StudioStep[];
}

export interface StudioSettings {
  /** Empty until the author picks one. */
  skill: ModuleSkillKey | "";
  estimatedMinutes: number;
}

export interface StudioDoc {
  version: 2;
  settings: StudioSettings;
  /** Always starts with "standard"; "advanced" is optional. */
  variants: StudioVariant[];
}

export const SKILLS: { value: ModuleSkillKey; label: string }[] = [
  { value: "participation", label: "Participation" },
  { value: "selfExpression", label: "Self-expression" },
  { value: "reasonGiving", label: "Giving reasons" },
  { value: "listening", label: "Listening" },
  { value: "selfInterrogation", label: "Questioning yourself" },
  { value: "cognitiveDissonance", label: "Cognitive dissonance" },
];

export const VARIANT_LABELS: Record<StudioVariantKey, { label: string; hint: string }> = {
  standard: { label: "Standard", hint: "What a learner gets the first time, and when they try again." },
  advanced: { label: "Advanced", hint: "The harder version a learner levels up to." },
};

export const MINUTES_MIN = 1;
export const MINUTES_MAX = 120;

export function emptyDoc(): StudioDoc {
  return { version: 2, settings: { skill: "", estimatedMinutes: 10 }, variants: [{ key: "standard", steps: [] }] };
}

export const TITLE_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 500;
export const VERSION_NAME_MAX_LENGTH = 80;
const DOC_MAX_CHARS = 400_000;

/** A draft as the list endpoint returns it. */
export interface StudioModuleSummary {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  /** Null for drafts last saved before this was tracked. */
  lastEditedBy: string | null;
  updatedAt: string;
}

/** A draft as the single-draft endpoint returns it. */
export interface StudioModuleDetail extends StudioModuleSummary {
  doc: StudioDoc;
}

/** One entry in a draft's version history. */
export interface StudioVersionSummary {
  id: string;
  name: string | null;
  title: string;
  savedBy: string;
  createdAt: string;
  updatedAt: string;
  /** Step count per variant, for telling versions apart at a glance. */
  stepCounts: Partial<Record<StudioVariantKey, number>>;
}

export interface StudioVersionDetail extends StudioVersionSummary {
  description: string;
  doc: StudioDoc;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSteps(value: unknown): StudioStep[] | null {
  if (!Array.isArray(value)) return null;
  const steps: StudioStep[] = [];
  const seen = new Set<string>();
  for (const step of value) {
    if (!isPlainObject(step)) return null;
    const { id, type, props } = step;
    if (typeof id !== "string" || !id || seen.has(id)) return null;
    if (typeof type !== "string" || !type) return null;
    if (!isPlainObject(props)) return null;
    seen.add(id);
    steps.push({ id, type, props });
  }
  return steps;
}

function parseSettings(value: unknown): StudioSettings | null {
  if (!isPlainObject(value)) return null;
  const { skill, estimatedMinutes } = value;
  if (skill !== "" && !SKILLS.some((s) => s.value === skill)) return null;
  if (
    typeof estimatedMinutes !== "number" ||
    !Number.isInteger(estimatedMinutes) ||
    estimatedMinutes < MINUTES_MIN ||
    estimatedMinutes > MINUTES_MAX
  ) {
    return null;
  }
  return { skill: skill as StudioSettings["skill"], estimatedMinutes };
}

/**
 * Validates untrusted JSON as a StudioDoc. Returns null if it isn't one.
 *
 * This checks shape only, not whether each step's settings are complete: a draft is allowed
 * to be half-finished. Version 1 documents (a bare step list) are read as a standard variant.
 */
export function parseStudioDoc(value: unknown): StudioDoc | null {
  if (!isPlainObject(value)) return null;

  let doc: StudioDoc;
  if (value.version === 1) {
    const steps = parseSteps(value.steps);
    if (!steps) return null;
    doc = { ...emptyDoc(), variants: [{ key: "standard", steps }] };
  } else if (value.version === 2) {
    const settings = parseSettings(value.settings);
    if (!settings || !Array.isArray(value.variants)) return null;
    const variants: StudioVariant[] = [];
    for (const v of value.variants) {
      if (!isPlainObject(v)) return null;
      const steps = parseSteps(v.steps);
      if (!steps) return null;
      if (v.key !== "standard" && v.key !== "advanced") return null;
      variants.push({ key: v.key, steps });
    }
    const keys = variants.map((v) => v.key).join(",");
    if (keys !== "standard" && keys !== "standard,advanced") return null;
    doc = { version: 2, settings, variants };
  } else {
    return null;
  }

  if (JSON.stringify(doc).length > DOC_MAX_CHARS) return null;
  return doc;
}
