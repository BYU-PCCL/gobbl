import type { SurveyQuestion } from "@/lib/survey/questions";
import type { QuizQuestion } from "@/lib/quizzes";

export type ModuleSkillKey =
  | "participation"
  | "selfExpression"
  | "reasonGiving"
  | "listening"
  | "selfInterrogation"
  | "cognitiveDissonance";

export type ModuleStep =
  | { id: string; kind: "diagnostic"; questions: SurveyQuestion[] }
  | { id: string; kind: "content"; blocks: { heading: string; body: string }[] }
  | { id: string; kind: "practice"; topic: string; difficulty: string; maxTurns?: number }
  /** "Teach": the turkey quizzes the user on the lesson; passing (>= passScore) hatches the egg and teaches the module's move. */
  | { id: string; kind: "quiz"; questions: QuizQuestion[]; passScore: number }
  | { id: string; kind: "reflection"; prompt: string; maxLength: number };

export interface ModuleVariant {
  /** "standard" = try again with new content; "advanced" = level up. */
  key: "standard" | "advanced";
  steps: ModuleStep[];
}

export interface ModuleConfig {
  /** Matches SkillSession.skillKey. The practice partner's prompt/model live under this key in ai-config.ts. */
  key: string;
  skill: ModuleSkillKey;
  title: string;
  description: string;
  estimatedMinutes: number;
  variants: ModuleVariant[];
}
