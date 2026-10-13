import type { ModuleStep } from "@/lib/modules/types";
import { getStudioComponent } from "./components";
import type { StudioStep } from "./types";

type Values = Record<string, unknown>;

const str = (v: unknown) => (typeof v === "string" ? v : "");
const list = (v: unknown): Values[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : []);

/**
 * The step a Studio step becomes in Gobbl's module runner (src/lib/modules/types.ts).
 * Assumes the step's settings are valid. Survey question and answer keys are generated
 * from their position, since authors never see them.
 */
export function toModuleStep(step: StudioStep): ModuleStep | null {
  const runtime = getStudioComponent(step.type)?.runtime;
  if (!runtime) return null;
  const p = step.props;

  switch (runtime.kind) {
    case "diagnostic":
      return {
        id: step.id,
        kind: "diagnostic",
        questions: list(p.questions).map((q, i) => ({
          key: `q${i + 1}`,
          type: "single-choice" as const,
          prompt: str(q.prompt),
          options: list(q.options).map((o, j) => ({ value: `option${j + 1}`, label: str(o.label) })),
        })),
      };
    case "content":
      return {
        id: step.id,
        kind: "content",
        blocks: list(p.blocks).map((b) => ({ heading: str(b.heading), body: str(b.body) })),
      };
    case "practice": {
      const addon = str(p.addon);
      const label = str(p.addonLabel);
      return {
        id: step.id,
        kind: "practice",
        topic: str(p.topic),
        difficulty: str(p.difficulty),
        maxTurns: typeof p.maxTurns === "number" ? p.maxTurns : undefined,
        addon: addon || undefined,
        addonProps: addon && label ? { label } : undefined,
      };
    }
    case "reflection":
      return {
        id: step.id,
        kind: "reflection",
        prompt: str(p.prompt),
        maxLength: typeof p.maxLength === "number" ? p.maxLength : 500,
      };
    case "custom":
      return { id: step.id, kind: "custom", component: runtime.component, props: p };
  }
}
