import type { StudioDoc, StudioStep } from "./types";

/**
 * The Module Studio component registry: the building blocks an author can place in a
 * module. This is the one place to add a component.
 *
 * A component is described once, here, and that single description drives everything:
 * the palette, the settings form in the editor, the server-side check on save, and the
 * runtime step it exports to. Plain data and pure functions only — this file is imported
 * by client pages and by the API.
 */

interface FieldBase {
  key: string;
  label: string;
  help?: string;
  required?: boolean;
}

/** One setting of a component. The editor renders a form control for each. */
export type FieldSpec =
  | (FieldBase & { kind: "text"; maxLength?: number; placeholder?: string })
  | (FieldBase & { kind: "textarea"; maxLength?: number; placeholder?: string; rows?: number })
  | (FieldBase & { kind: "number"; min: number; max: number })
  | (FieldBase & {
      kind: "select";
      options: { value: string; label: string }[];
      /** Options come from code that only the browser has (the editor fills them in). */
      dynamicOptions?: "practice-addons";
    })
  | (FieldBase & { kind: "boolean" })
  | (FieldBase & {
      kind: "list";
      itemLabel: string;
      itemFields: FieldSpec[];
      /** What a freshly added item starts as. */
      itemDefault: Record<string, unknown>;
      minItems: number;
      maxItems: number;
    });

export interface StudioComponentDef {
  /** Stored on each step as `type`. Never rename once drafts use it. */
  type: string;
  label: string;
  description: string;
  /** The `props` a new step of this type starts with. Should already be valid. */
  defaultProps: Record<string, unknown>;
  fields: FieldSpec[];
  /** The step in Gobbl's module runner (src/lib/modules/types.ts) this becomes. */
  runtime: { kind: "content" | "practice" | "reflection" } | { kind: "custom"; component: string };
  /** A rule the field specs can't express. Returns an error message, or null if fine. */
  check?: (props: Record<string, unknown>) => string | null;
}

const TIERS = [
  { value: "Friendly Cluck", label: "Friendly Cluck (easy)" },
  { value: "Spirited Strut", label: "Spirited Strut (medium)" },
  { value: "Full Gobble", label: "Full Gobble (hard)" },
];

export const STUDIO_COMPONENTS: StudioComponentDef[] = [
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
        itemDefault: { heading: "New card", body: "Write what the learner should read." },
        itemFields: [
          { key: "heading", label: "Heading", kind: "text", required: true, maxLength: 120 },
          { key: "body", label: "Text", kind: "textarea", required: true, maxLength: 1500, rows: 4 },
        ],
      },
    ],
    runtime: { kind: "content" },
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
          prompt: "Question text",
          options: [
            { label: "Option A", correct: true },
            { label: "Option B", correct: false },
          ],
          explanation: "",
        },
        itemFields: [
          { key: "prompt", label: "Question", kind: "textarea", required: true, maxLength: 500, rows: 2 },
          {
            key: "options",
            label: "Answer options",
            kind: "list",
            itemLabel: "Option",
            minItems: 2,
            maxItems: 6,
            itemDefault: { label: "New option", correct: false },
            itemFields: [
              { key: "label", label: "Option text", kind: "text", required: true, maxLength: 200 },
              { key: "correct", label: "This is the correct answer", kind: "boolean" },
            ],
          },
          {
            key: "explanation",
            label: "Explanation (shown after answering)",
            kind: "textarea",
            maxLength: 800,
            rows: 2,
          },
        ],
      },
    ],
    runtime: { kind: "custom", component: "quiz" },
    check: (props) => {
      const questions = props.questions as Array<{ options: Array<{ correct?: boolean }> }>;
      for (let i = 0; i < questions.length; i++) {
        const correct = questions[i].options.filter((o: { correct?: boolean }) => o.correct === true);
        if (correct.length !== 1) return `Question ${i + 1} must have exactly one correct answer`;
      }
      return null;
    },
  },

  {
    type: "practice",
    label: "AI chat",
    description: "A conversation with the AI partner. Can show a companion (like a button) next to the chat.",
    defaultProps: {
      topic: "Minimum Wage Increase — Should the federal minimum wage be raised to $20/hour?",
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
      { key: "topic", label: "Topic", kind: "text", required: true, maxLength: 300 },
      { key: "difficulty", label: "Partner difficulty", kind: "select", options: TIERS, required: true },
      { key: "maxTurns", label: "Max turns (your messages)", kind: "number", min: 1, max: 20, required: true },
      {
        key: "mode",
        label: "Conversation mode",
        kind: "select",
        options: [{ value: "text", label: "Text" }],
        help: "Voice and video are coming soon.",
      },
      {
        key: "aiPromptMode",
        label: "How your prompt is used",
        kind: "select",
        options: [
          { value: "append", label: "Add to the normal partner's instructions" },
          { value: "replace", label: "Replace the normal instructions completely" },
        ],
      },
      {
        key: "aiPromptText",
        label: "Prompt for the AI",
        kind: "textarea",
        maxLength: 8000,
        rows: 8,
        help: "Leave empty for the normal partner. When replacing, {name}, {backstory}, {beliefs} and {topic} are filled in.",
      },
      {
        key: "openingInstruction",
        label: "Opening message instruction",
        kind: "textarea",
        maxLength: 1000,
        rows: 3,
        help: "How the AI should start the conversation. {topic} is filled in. Empty uses the default opener.",
      },
      {
        key: "addon",
        label: "Companion next to the chat",
        kind: "select",
        options: [],
        dynamicOptions: "practice-addons",
      },
      { key: "addonLabel", label: "Companion label", kind: "text", maxLength: 60, help: "For example the text on the button." },
    ],
    runtime: { kind: "practice" },
  },

  {
    type: "reflection",
    label: "Reflection",
    description: "A free-text question the learner answers in their own words.",
    defaultProps: { prompt: "What stood out to you in that conversation?", maxLength: 500 },
    fields: [
      { key: "prompt", label: "Question", kind: "textarea", required: true, maxLength: 500, rows: 3 },
      { key: "maxLength", label: "Max answer length (characters)", kind: "number", min: 50, max: 2000, required: true },
    ],
    runtime: { kind: "reflection" },
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
export const RUNTIME_LIMITS: Record<string, number> = { practice: 2, reflection: 2 };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function checkField(spec: FieldSpec, value: unknown): string | null {
  const name = spec.label;
  const empty = value === undefined || value === null || value === "";

  switch (spec.kind) {
    case "text":
    case "textarea": {
      if (empty) return spec.required ? `${name} is required` : null;
      if (typeof value !== "string") return `${name} must be text`;
      if (spec.required && !value.trim()) return `${name} is required`;
      const max = spec.maxLength ?? (spec.kind === "text" ? 200 : 2000);
      return value.length > max ? `${name} can be at most ${max} characters` : null;
    }
    case "number": {
      if (empty) return spec.required ? `${name} is required` : null;
      if (typeof value !== "number" || !Number.isInteger(value)) return `${name} must be a whole number`;
      return value < spec.min || value > spec.max ? `${name} must be between ${spec.min} and ${spec.max}` : null;
    }
    case "select": {
      if (empty) return spec.required ? `${name} is required` : null;
      if (typeof value !== "string") return `${name} is not a valid choice`;
      if (spec.dynamicOptions) return value.length <= 60 ? null : `${name} is not a valid choice`;
      return spec.options.some((o) => o.value === value) ? null : `${name} is not a valid choice`;
    }
    case "boolean":
      return value === undefined || typeof value === "boolean" ? null : `${name} must be on or off`;
    case "list": {
      if (!Array.isArray(value)) return `${name} must be a list`;
      if (value.length < spec.minItems) return `${name} needs at least ${spec.minItems}`;
      if (value.length > spec.maxItems) return `${name} can have at most ${spec.maxItems}`;
      for (let i = 0; i < value.length; i++) {
        const item: unknown = value[i];
        if (!isObject(item)) return `${spec.itemLabel} ${i + 1} is not valid`;
        const err = checkFields(spec.itemFields, item);
        if (err) return `${spec.itemLabel} ${i + 1}: ${err}`;
      }
      return null;
    }
  }
}

function checkFields(fields: FieldSpec[], values: Record<string, unknown>): string | null {
  for (const field of fields) {
    const err = checkField(field, values[field.key]);
    if (err) return err;
  }
  return null;
}

/** Error message if `props` aren't valid settings for this component type, else null. */
export function validateComponentProps(type: string, props: unknown): string | null {
  const def = getStudioComponent(type);
  if (!def) return `Unknown component "${type}"`;
  if (!isObject(props)) return "Settings are missing";
  return checkFields(def.fields, props) ?? def.check?.(props) ?? null;
}

export function validateStep(step: StudioStep): string | null {
  return validateComponentProps(step.type, step.props);
}

/** Error message for the first invalid step of a document, else null. */
export function validateStudioDoc(doc: StudioDoc): string | null {
  for (let i = 0; i < doc.steps.length; i++) {
    const step = doc.steps[i];
    const err = validateStep(step);
    if (err) {
      const label = getStudioComponent(step.type)?.label ?? step.type;
      return `Step ${i + 1} (${label}): ${err}`;
    }
  }
  return null;
}

/** Things worth knowing about a module that aren't errors. */
export function moduleWarnings(steps: StudioStep[]): string[] {
  const counts: Record<string, number> = {};
  for (const step of steps) {
    const kind = getStudioComponent(step.type)?.runtime.kind;
    if (kind) counts[kind] = (counts[kind] ?? 0) + 1;
  }
  const warnings: string[] = [];
  for (const [kind, limit] of Object.entries(RUNTIME_LIMITS)) {
    if ((counts[kind] ?? 0) > limit) {
      const name = kind === "practice" ? "AI chat" : "reflection";
      warnings.push(
        `Gobbl's module runner supports at most ${limit} ${name} steps today (before and after). ` +
          `This draft has ${counts[kind]}; the runner will need to change before it can ship.`,
      );
    }
  }
  return warnings;
}
