/**
 * The saved shape of a Module Studio draft.
 *
 * A draft is an ordered list of steps. Each step names a component from
 * STUDIO_COMPONENTS (see ./components.ts) by `type` and carries that
 * component's settings in `props`.
 */
export interface StudioStep {
  id: string;
  type: string;
  props: Record<string, unknown>;
}

export interface StudioDoc {
  version: 1;
  steps: StudioStep[];
}

export const EMPTY_DOC: StudioDoc = { version: 1, steps: [] };

export const TITLE_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 500;
const DOC_MAX_CHARS = 200_000;

/** A draft as the list endpoint returns it. */
export interface StudioModuleSummary {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  updatedAt: string;
}

/** A draft as the single-draft endpoint returns it. */
export interface StudioModuleDetail extends StudioModuleSummary {
  doc: StudioDoc;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validates untrusted JSON as a StudioDoc. Returns null if it isn't one. */
export function parseStudioDoc(value: unknown): StudioDoc | null {
  if (!isPlainObject(value) || value.version !== 1 || !Array.isArray(value.steps)) return null;

  const steps: StudioStep[] = [];
  const seen = new Set<string>();
  for (const step of value.steps) {
    if (!isPlainObject(step)) return null;
    const { id, type, props } = step;
    if (typeof id !== "string" || !id || seen.has(id)) return null;
    if (typeof type !== "string" || !type) return null;
    if (!isPlainObject(props)) return null;
    seen.add(id);
    steps.push({ id, type, props });
  }

  const doc: StudioDoc = { version: 1, steps };
  if (JSON.stringify(doc).length > DOC_MAX_CHARS) return null;
  return doc;
}
