import type { SurveyQuestion } from "@/lib/survey/questions";

export type ModuleSkillKey =
  | "participation"
  | "selfExpression"
  | "reasonGiving"
  | "listening"
  | "selfInterrogation";

export type ModuleStep =
  | { id: string; kind: "diagnostic"; questions: SurveyQuestion[] }
  | { id: string; kind: "content"; blocks: { heading: string; body: string }[] }
  | { id: string; kind: "practice"; topic: string; difficulty: string; maxTurns?: number }
  | { id: string; kind: "reflection"; prompt: string; maxLength: number };

export interface ModuleVariant {
  /** "standard" = try again with new content; "advanced" = level up. */
  key: "standard" | "advanced";
  steps: ModuleStep[];
}

export interface ModuleConfig {
  /** Matches SkillSession.skillKey. */
  key: string;
  skill: ModuleSkillKey;
  title: string;
  description: string;
  estimatedMinutes: number;
  variants: ModuleVariant[];
}
