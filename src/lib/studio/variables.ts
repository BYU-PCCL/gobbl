import {
  RESERVED_ANSWER_NAMES,
  getStudioComponent,
  type FieldError,
  type FieldSpec,
  type SavedAnswer,
} from "./components";
import type { StudioStep } from "./types";

/**
 * Answer variables: a step can save a learner's answer under a name (its answerName field),
 * and any text in a later step can write {name} to have that answer filled in.
 *
 * Pure functions only. The editor uses these for the flow badges, the "Insert answer" menu
 * and the checks; the preview uses fillAnswers on each step before showing it.
 */

/** A {name} written in some text of a step. */
export interface AnswerRef {
  name: string;
  /** Path of the text it's in, e.g. "blocks.0.body". */
  path: string;
}

export interface StepVariables {
  /** Answers this step saves for later steps. */
  saves: SavedAnswer[];
  /** Answers this step uses, once per name, in the order they first appear. */
  uses: string[];
}

/** An answer a step can use, with the step it comes from. */
export interface AvailableAnswer extends SavedAnswer {
  stepIndex: number;
  stepLabel: string;
}

const TOKEN = /\{([a-z][a-z0-9_]*)\}/g;

function walkStrings(value: unknown, path: string, visit: (path: string, text: string) => void): void {
  if (typeof value === "string") {
    visit(path, value);
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => walkStrings(item, path ? `${path}.${i}` : String(i), visit));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) walkStrings(item, path ? `${path}.${key}` : key, visit);
  }
}

/** Every {name} in a step's settings, except the ones the AI chat fills in itself ({topic}…). */
export function findRefs(props: unknown): AnswerRef[] {
  const refs: AnswerRef[] = [];
  walkStrings(props, "", (path, text) => {
    for (const match of Array.from(text.matchAll(TOKEN))) {
      if (!RESERVED_ANSWER_NAMES.includes(match[1])) refs.push({ name: match[1], path });
    }
  });
  return refs;
}

export function stepVariables(step: StudioStep): StepVariables {
  const saves = getStudioComponent(step.type)?.answers?.(step.props) ?? [];
  const uses = Array.from(new Set(findRefs(step.props).map((r) => r.name)));
  return { saves, uses };
}

/** What each step of a version saves and uses, by step id. */
export function variableMap(steps: StudioStep[]): Record<string, StepVariables> {
  return Object.fromEntries(steps.map((s) => [s.id, stepVariables(s)]));
}

/** The answers saved by steps before `index`, which the step at `index` may use. */
export function availableAnswers(steps: StudioStep[], index: number): AvailableAnswer[] {
  return steps.slice(0, index).flatMap((step, i) => {
    const def = getStudioComponent(step.type);
    return (def?.answers?.(step.props) ?? []).map((a) => ({ ...a, stepIndex: i, stepLabel: def?.label ?? step.type }));
  });
}

/**
 * Problems with answer variables in a version, by step id: a {name} with no earlier answer
 * of that name, and two answers sharing a name. Each error points at the field it's about.
 */
export function variableErrors(steps: StudioStep[]): Record<string, FieldError[]> {
  const out: Record<string, FieldError[]> = {};
  const add = (id: string, error: FieldError) => (out[id] ??= []).push(error);

  const savedAt = new Map<string, number>();
  steps.forEach((step, i) => {
    for (const a of stepVariables(step).saves) {
      const first = savedAt.get(a.name);
      if (first === undefined) savedAt.set(a.name, i);
      else add(step.id, { path: a.path, message: `Step ${first + 1} already saves an answer called ${a.name}` });
    }
  });

  steps.forEach((step, i) => {
    const seen = new Set<string>();
    for (const ref of findRefs(step.props)) {
      const key = `${ref.path}:${ref.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const at = savedAt.get(ref.name);
      if (at === undefined) {
        add(step.id, { path: ref.path, message: `No step saves an answer called {${ref.name}}` });
      } else if (at >= i) {
        add(step.id, {
          path: ref.path,
          message:
            at === i
              ? `{${ref.name}} is answered in this same step, so it can only be used in later ones`
              : `{${ref.name}} isn't answered until step ${at + 1}. Move this step after it`,
        });
      }
    }
  });

  return out;
}

/**
 * A copy of `value` with every {name} replaced by vars[name]. Names not in `vars` (including
 * {topic} and friends) are left as they are. Works on any JSON: Studio props or runner steps.
 */
export function fillAnswers<T>(value: T, vars: Record<string, string>): T {
  if (typeof value === "string") {
    return value.replace(TOKEN, (token, name: string) =>
      Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : token,
    ) as T;
  }
  if (Array.isArray(value)) return value.map((item) => fillAnswers(item, vars)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillAnswers(v, vars)])) as T;
  }
  return value;
}

/**
 * The values to fill in for a step, from the answers given in earlier steps. `values` holds
 * each step's answer by step id, as the runner (or preview) keeps it. An answer that wasn't
 * given (e.g. the preview started after it) shows as ‹name›, so the author sees where it goes.
 */
export function answerValues(steps: StudioStep[], values: Record<string, unknown>): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const step of steps) {
    const answers = getStudioComponent(step.type)?.answers?.(step.props, values[step.id] ?? null) ?? [];
    for (const a of answers) vars[a.name] = a.value ?? `‹${a.name}›`;
  }
  return vars;
}

/**
 * `props` with every answer name emptied, for a copied step: two steps saving the same name
 * would clash.
 */
export function withoutAnswerNames(type: string, props: Record<string, unknown>): Record<string, unknown> {
  const clear = (fields: FieldSpec[], values: Record<string, unknown>): Record<string, unknown> => {
    const out = { ...values };
    for (const f of fields) {
      if (f.kind === "answerName" && f.key in out) out[f.key] = "";
      else if (f.kind === "list" && Array.isArray(out[f.key])) {
        out[f.key] = (out[f.key] as unknown[]).map((item) =>
          item && typeof item === "object" ? clear(f.itemFields, item as Record<string, unknown>) : item,
        );
      }
    }
    return out;
  };
  return clear(getStudioComponent(type)?.fields ?? [], props);
}
