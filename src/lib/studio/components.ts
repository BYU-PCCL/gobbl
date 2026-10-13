import { TOPICS } from "@/lib/topics";
import type { StudioStep, StudioVariant } from "./types";

/**
 * The Module Studio component registry: the building blocks an author can place in a
 * module. This is the one place to add a component.
 *
 * A component is described once, here, and that single description drives everything:
 * the palette, the settings form in the editor, the checks before preview, and the
 * runtime step it becomes. Plain data and pure functions only — this file is imported
 * by client pages and by the API.
 */

type Values = Record<string, unknown>;

interface FieldBase {
  key: string;
  label: string;
  help?: string;
  required?: boolean;
  /** Show (and check) this field only when this returns true for the values beside it. */
  showIf?: (values: Values) => boolean;
}

/** One setting of a component. The editor renders a form control for each. */
export type FieldSpec =
  | (FieldBase & {
      kind: "text";
      maxLength?: number;
      placeholder?: string;
      /** Ready-made values offered in a dropdown, with "Write my own" as the last choice. */
      presets?: { value: string; label: string }[];
    })
  | (FieldBase & { kind: "textarea"; maxLength?: number; placeholder?: string; rows?: number })
  | (FieldBase & { kind: "number"; min: number; max: number })
  | (FieldBase & {
      kind: "select";
      options: { value: string; label: string }[];
      /** Options come from code that only the browser has (the editor fills them in). */
      dynamicOptions?: "practice-addons";
    })
  | (FieldBase & {
      /** A name the step's answer is saved under, so later steps can write {name} to use it. */
      kind: "answerName";
    })
  | (FieldBase & {
      kind: "boolean";
      /** Inside a list: only one item may have it on, so it shows as a radio button. */
      exclusive?: boolean;
    })
  | (FieldBase & {
      kind: "list";
      itemLabel: string;
      itemFields: FieldSpec[];
      /** What a freshly added item starts as. */
      itemDefault: Values;
      minItems: number;
      maxItems: number;
    });

/** A problem with one setting. `path` is the field's key path, e.g. "questions.0.prompt". */
export interface FieldError {
  path: string;
  message: string;
}

export interface StudioComponentDef {
  /** Stored on each step as `type`. Never rename once drafts use it. */
  type: string;
  label: string;
  description: string;
  /** The `props` a new step of this type starts with. Should already be valid. */
  defaultProps: Values;
  fields: FieldSpec[];
  /** The step in Gobbl's module runner (src/lib/modules/types.ts) this becomes. */
  runtime: { kind: "diagnostic" | "content" | "practice" | "reflection" } | { kind: "custom"; component: string };
  /** A rule the field specs can't express. */
  check?: (props: Values) => FieldError | null;
  /** One line telling this step apart from others of its type, shown in the module flow. */
  summarize: (props: Values) => string;
  /**
   * The answers this step saves for later steps (one per filled-in answerName field).
   * `value` is what the learner gave, as the runner holds it; without one, `value` is left out.
   */
  answers?: (props: Values, value?: unknown) => SavedAnswer[];
}

export interface SavedAnswer {
  /** What later steps write in braces, e.g. "goal" for {goal}. */
  name: string;
  /** The question it answers, to tell answers apart in the editor. */
  label: string;
  /** Path of the answerName field this came from, e.g. "questions.0.saveAs". */
  path: string;
  value?: string;
}

/** Answer names: what the AI chat already fills in can't be reused. */
export const ANSWER_NAME_PATTERN = /^[a-z][a-z0-9_]{0,29}$/;
export const RESERVED_ANSWER_NAMES = ["name", "backstory", "beliefs", "topic"];

/** Turns what an author types into a valid-looking answer name: "My Goal" → "my_goal". */
export function toAnswerName(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 30);
}

export const TIERS = [
  { value: "Friendly Cluck", label: "Friendly Cluck: easy, patient and open" },
  { value: "Spirited Strut", label: "Spirited Strut: medium, pushes back" },
  { value: "Full Gobble", label: "Full Gobble: hard, blunt and stubborn" },
];

const TOPIC_PRESETS = TOPICS.map((t) => {
  const value = `${t.title} — ${t.description}`;
  return { value, label: value };
});

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const count = (v: unknown) => (Array.isArray(v) ? v.length : 0);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function firstText(list: unknown, key: string): string {
  return Array.isArray(list) && list.length > 0 && typeof list[0] === "object" && list[0] ? str(list[0][key]) : "";
}

function withCount(first: string, n: number, word: string): string {
  if (!first) return plural(n, word);
  return n > 1 ? `${first} (+${n - 1} more)` : first;
}

const items = (v: unknown): Values[] => (Array.isArray(v) ? v.filter(isObject) : []);

const SAVE_AS: FieldSpec = {
  key: "saveAs",
  label: "Save the answer as (optional)",
  kind: "answerName",
  help: "Give it a short name, like goal, and later steps can write {goal} to show what the learner picked.",
};

/**
 * Answers for steps whose questions each pick one option. `chosenIndex` reads which option
 * the learner picked for question i out of the step's value.
 */
function choiceAnswers(
  props: Values,
  value: unknown,
  chosenIndex: (value: unknown, i: number) => number | undefined,
): SavedAnswer[] {
  return items(props.questions).flatMap((q, i) => {
    const name = str(q.saveAs);
    if (!name) return [];
    const chosen = value === undefined ? undefined : chosenIndex(value, i);
    const option = chosen === undefined ? undefined : items(q.options)[chosen];
    return [
      {
        name,
        label: str(q.prompt) || `Question ${i + 1}`,
        path: `questions.${i}.saveAs`,
        value: option ? str(option.label) : undefined,
      },
    ];
  });
}

export const STUDIO_COMPONENTS: StudioComponentDef[] = [
  {
    type: "diagnostic",
    label: "Survey questions",
    description: "Multiple-choice questions about the learner, with no right answer. Usually the first step.",
    defaultProps: {
      questions: [{ prompt: "How often do you…?", options: [{ label: "Rarely" }, { label: "Sometimes" }, { label: "Often" }] }],
    },
    fields: [
      {
        key: "questions",
        label: "Questions",
        kind: "list",
        itemLabel: "Question",
        minItems: 1,
        maxItems: 10,
        itemDefault: { prompt: "", options: [{ label: "" }, { label: "" }] },
        itemFields: [
          { key: "prompt", label: "Question", kind: "textarea", required: true, maxLength: 300, rows: 2 },
          {
            key: "options",
            label: "Answer options",
            kind: "list",
            itemLabel: "Option",
            minItems: 2,
            maxItems: 8,
            itemDefault: { label: "" },
            itemFields: [{ key: "label", label: "Option text", kind: "text", required: true, maxLength: 150 }],
          },
          SAVE_AS,
        ],
      },
    ],
    runtime: { kind: "diagnostic" },
    summarize: (p) => withCount(firstText(p.questions, "prompt"), count(p.questions), "question"),
    // The runner keys answers as { q1: "option2" } (see runtime.ts), so undo that here.
    answers: (p, value) =>
      choiceAnswers(p, value, (v, i) => {
        const chosen = isObject(v) ? v[`q${i + 1}`] : undefined;
        const match = typeof chosen === "string" ? /^option(\d+)$/.exec(chosen) : null;
        return match ? Number(match[1]) - 1 : undefined;
      }),
  },

  {
    type: "content",
    label: "Content cards",
    description: "Short things to read: a heading and a few sentences per card.",
    defaultProps: { blocks: [{ heading: "New card", body: "Write what the learner should read." }] },
    fields: [
      {
        key: "blocks",
        label: "Cards",
        kind: "list",
        itemLabel: "Card",
        minItems: 1,
        maxItems: 12,
        itemDefault: { heading: "", body: "" },
        itemFields: [
          { key: "heading", label: "Heading", kind: "text", required: true, maxLength: 120 },
          { key: "body", label: "Text", kind: "textarea", required: true, maxLength: 3000, rows: 4 },
        ],
      },
    ],
    runtime: { kind: "content" },
    summarize: (p) => withCount(firstText(p.blocks, "heading"), count(p.blocks), "card"),
  },

  {
    type: "quiz",
    label: "Quiz",
    description: "Multiple-choice questions with a right answer. Shows the answer and why before moving on.",
    defaultProps: {
      mustAnswerCorrectly: false,
      questions: [
        {
          prompt: "Question text",
          options: [
            { label: "Option A", correct: true },
            { label: "Option B", correct: false },
          ],
          explanation: "",
        },
      ],
    },
    fields: [
      {
        key: "mustAnswerCorrectly",
        label: "Learner must get each question right to continue",
        kind: "boolean",
        help: "Off: a wrong answer shows the right one and they continue. On: they keep trying until correct.",
      },
      {
        key: "questions",
        label: "Questions",
        kind: "list",
        itemLabel: "Question",
        minItems: 1,
        maxItems: 10,
        itemDefault: {
          prompt: "",
          options: [
            { label: "", correct: true },
            { label: "", correct: false },
          ],
          explanation: "",
        },
        itemFields: [
          { key: "prompt", label: "Question", kind: "textarea", required: true, maxLength: 500, rows: 2 },
          {
            key: "options",
            label: "Answer options",
            help: "Pick the correct answer with the circle.",
            kind: "list",
            itemLabel: "Option",
            minItems: 2,
            maxItems: 6,
            itemDefault: { label: "", correct: false },
            itemFields: [
              { key: "label", label: "Option text", kind: "text", required: true, maxLength: 200 },
              { key: "correct", label: "Correct answer", kind: "boolean", exclusive: true },
            ],
          },
          {
            key: "explanation",
            label: "Explanation (shown after answering)",
            kind: "textarea",
            maxLength: 800,
            rows: 2,
          },
          SAVE_AS,
        ],
      },
    ],
    runtime: { kind: "custom", component: "quiz" },
    check: (props) => {
      const questions = props.questions as Array<{ options: Array<{ correct?: boolean }> }>;
      for (let i = 0; i < questions.length; i++) {
        const correct = questions[i].options.filter((o) => o.correct === true);
        if (correct.length !== 1) {
          return { path: `questions.${i}.options`, message: "Pick the one correct answer" };
        }
      }
      return null;
    },
    summarize: (p) => withCount(firstText(p.questions, "prompt"), count(p.questions), "question"),
    // QuizStep's value: { answers: ({ chosen } | null)[] }, where chosen is the option index.
    answers: (p, value) =>
      choiceAnswers(p, value, (v, i) => {
        const answer = isObject(v) && Array.isArray(v.answers) ? v.answers[i] : undefined;
        return isObject(answer) && typeof answer.chosen === "number" ? answer.chosen : undefined;
      }),
  },

  {
    type: "practice",
    label: "AI chat",
    description: "A conversation with the AI partner. Can show a companion (like a button) next to the chat.",
    defaultProps: {
      topic: TOPIC_PRESETS[0].value,
      difficulty: "Friendly Cluck",
      maxTurns: 8,
      mode: "text",
      aiPromptMode: "append",
      aiPromptText: "",
      openingInstruction: "",
      addon: "",
      addonLabel: "",
    },
    fields: [
      { key: "topic", label: "Topic", kind: "text", required: true, maxLength: 300, presets: TOPIC_PRESETS },
      { key: "difficulty", label: "How hard the partner is", kind: "select", options: TIERS, required: true },
      {
        key: "maxTurns",
        label: "Learner messages before the chat ends",
        kind: "number",
        min: 1,
        max: 20,
        required: true,
        help: "The learner can also wrap up early after two messages.",
      },
      {
        key: "aiPromptText",
        label: "Extra instructions for the AI (optional)",
        kind: "textarea",
        maxLength: 8000,
        rows: 6,
        help: "Leave empty for Gobbl's normal partner.",
      },
      {
        key: "aiPromptMode",
        label: "How these instructions are used",
        kind: "select",
        options: [
          { value: "append", label: "Add them to the normal partner's instructions" },
          { value: "replace", label: "Use only these instructions" },
        ],
        help: "When using only yours, write {name}, {backstory}, {beliefs} or {topic} to have them filled in.",
        showIf: (v) => str(v.aiPromptText) !== "",
      },
      {
        key: "openingInstruction",
        label: "How the AI opens the conversation (optional)",
        kind: "textarea",
        maxLength: 1000,
        rows: 3,
        help: "Write {topic} to have it filled in. Empty uses the usual opener.",
      },
      {
        key: "addon",
        label: "Companion next to the chat",
        kind: "select",
        options: [],
        dynamicOptions: "practice-addons",
      },
      {
        key: "addonLabel",
        label: "Companion text",
        kind: "text",
        maxLength: 60,
        help: "For example the words on the button. Empty uses its default.",
        showIf: (v) => str(v.addon) !== "",
      },
    ],
    runtime: { kind: "practice" },
    summarize: (p) => str(p.topic).split(" — ")[0] || "No topic yet",
  },

  {
    type: "reflection",
    label: "Reflection",
    description: "A free-text question the learner answers in their own words.",
    defaultProps: { prompt: "What stood out to you in that conversation?", maxLength: 500 },
    fields: [
      { key: "prompt", label: "Question", kind: "textarea", required: true, maxLength: 500, rows: 3 },
      { key: "maxLength", label: "Longest answer allowed (characters)", kind: "number", min: 50, max: 2000, required: true },
      { ...SAVE_AS, help: "Give it a short name, like goal, and later steps can write {goal} to show what the learner wrote." },
    ],
    runtime: { kind: "reflection" },
    summarize: (p) => str(p.prompt) || "No question yet",
    // The runner sends a reflection as plain text; the editor's preview holds it as { text }.
    answers: (p, value) => {
      const name = str(p.saveAs);
      if (!name) return [];
      const text = typeof value === "string" ? value : isObject(value) && typeof value.text === "string" ? value.text : undefined;
      return [{ name, label: str(p.prompt) || "Reflection", path: "saveAs", value: text }];
    },
  },
];

export function getStudioComponent(type: string): StudioComponentDef | undefined {
  return STUDIO_COMPONENTS.find((c) => c.type === type);
}

/**
 * Limits of Gobbl's module runner today (see HowToForHumans.MD). These are warnings in
 * Studio, not errors: the framework can change, and a draft that hits one is exactly the
 * kind of thing the sandbox is for finding.
 */
export const RUNTIME_LIMITS: Record<string, { limit: number; name: string }> = {
  practice: { limit: 2, name: "AI chats" },
  reflection: { limit: 2, name: "reflections" },
};

function isObject(value: unknown): value is Values {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFieldShown(spec: FieldSpec, values: Values): boolean {
  return !spec.showIf || spec.showIf(values);
}

function checkField(spec: FieldSpec, value: unknown, path: string, out: FieldError[]): void {
  const fail = (message: string): void => {
    out.push({ path, message });
  };
  const empty = value === undefined || value === null || value === "";

  switch (spec.kind) {
    case "text":
    case "textarea": {
      if (empty || (typeof value === "string" && !value.trim())) {
        if (spec.required) fail("Required");
        return;
      }
      if (typeof value !== "string") return fail("Must be text");
      const max = spec.maxLength ?? (spec.kind === "text" ? 200 : 2000);
      if (value.length > max) fail(`At most ${max} characters`);
      return;
    }
    case "number": {
      if (empty) {
        if (spec.required) fail("Required");
        return;
      }
      if (typeof value !== "number" || !Number.isInteger(value)) return fail("Must be a whole number");
      if (value < spec.min || value > spec.max) fail(`Must be between ${spec.min} and ${spec.max}`);
      return;
    }
    case "select": {
      if (empty) {
        if (spec.required) fail("Required");
        return;
      }
      if (typeof value !== "string") return fail("Not a valid choice");
      const ok = spec.dynamicOptions ? value.length <= 60 : spec.options.some((o) => o.value === value);
      if (!ok) fail("Not a valid choice");
      return;
    }
    case "answerName": {
      if (empty) return;
      if (typeof value !== "string") return fail("Must be text");
      if (!/^[a-z]/.test(value)) return fail("Start with a letter");
      if (!ANSWER_NAME_PATTERN.test(value)) return fail("Use only lowercase letters, numbers and _ (up to 30)");
      if (RESERVED_ANSWER_NAMES.includes(value)) return fail(`The AI chat already uses {${value}}. Pick another name`);
      return;
    }
    case "boolean":
      if (value !== undefined && typeof value !== "boolean") fail("Must be on or off");
      return;
    case "list": {
      if (!Array.isArray(value)) return fail("Must be a list");
      if (value.length < spec.minItems) fail(`Needs at least ${spec.minItems}`);
      if (value.length > spec.maxItems) fail(`At most ${spec.maxItems}`);
      value.forEach((item: unknown, i) => {
        if (!isObject(item)) out.push({ path: `${path}.${i}`, message: "Not valid" });
        else collectFieldErrors(spec.itemFields, item, `${path}.${i}.`, out);
      });
      return;
    }
  }
}

function collectFieldErrors(fields: FieldSpec[], values: Values, prefix: string, out: FieldError[]): void {
  for (const field of fields) {
    if (isFieldShown(field, values)) checkField(field, values[field.key], prefix + field.key, out);
  }
}

/** Every problem with `props` as settings for this component type. Empty when all is well. */
export function stepErrors(type: string, props: unknown): FieldError[] {
  const def = getStudioComponent(type);
  if (!def) return [{ path: "", message: `Unknown component "${type}"` }];
  if (!isObject(props)) return [{ path: "", message: "Settings are missing" }];
  const out: FieldError[] = [];
  collectFieldErrors(def.fields, props, "", out);
  // The custom check assumes the fields are well-formed, so only run it once they are.
  if (out.length === 0) {
    const extra = def.check?.(props);
    if (extra) out.push(extra);
  }
  return out;
}

/** Turns "questions.0.options" into "Question 1 › Answer options", using the field labels. */
export function describePath(type: string, path: string): string {
  let fields = getStudioComponent(type)?.fields ?? [];
  const parts: string[] = [];
  const segments = path.split(".").filter(Boolean);
  for (let i = 0; i < segments.length; i++) {
    const spec = fields.find((f) => f.key === segments[i]);
    if (!spec) break;
    if (spec.kind === "list" && i + 1 < segments.length && /^\d+$/.test(segments[i + 1])) {
      parts.push(`${spec.itemLabel} ${Number(segments[i + 1]) + 1}`);
      fields = spec.itemFields;
      i++;
    } else {
      parts.push(spec.label);
    }
  }
  return parts.join(" › ");
}

/** A one-line description of the first problem with a step, or null if it has none. */
export function validateComponentProps(type: string, props: unknown): string | null {
  const [first] = stepErrors(type, props);
  if (!first) return null;
  const where = describePath(type, first.path);
  return where ? `${where}: ${first.message}` : first.message;
}

/** Things worth knowing about a variant that aren't errors. */
export function variantWarnings(variant: StudioVariant): string[] {
  const counts: Record<string, number> = {};
  for (const step of variant.steps) {
    const kind = getStudioComponent(step.type)?.runtime.kind;
    if (kind) counts[kind] = (counts[kind] ?? 0) + 1;
  }
  const warnings: string[] = [];
  for (const [kind, { limit, name }] of Object.entries(RUNTIME_LIMITS)) {
    if ((counts[kind] ?? 0) > limit) {
      warnings.push(
        `Gobbl can only run ${limit} ${name} per module today (one before and one after). ` +
          `This version has ${counts[kind]}, so Gobbl's module runner will need a change before it can ship.`,
      );
    }
  }
  return warnings;
}

export function summarizeStep(step: StudioStep): string {
  return getStudioComponent(step.type)?.summarize(step.props) ?? "";
}
