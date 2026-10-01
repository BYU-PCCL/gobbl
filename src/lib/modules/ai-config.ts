import "server-only";

/**
 * Per-module AI settings for a module's practice conversation, keyed by ModuleConfig.key
 * (the same value saved on Debate.trainingMode). Kept out of registry.ts because that file
 * is imported by client pages — prompts here never reach the browser.
 *
 * A module with no entry gets the same partner as a normal Chat-page debate.
 *
 * systemPrompt modes:
 * - "append": the normal persona prompt, followed by these extra instructions.
 * - "replace": this text is the whole prompt. {name}, {backstory}, {beliefs} and {topic}
 *   are filled in from the persona and debate. The profanity rule is still added at the end.
 *
 * openingInstruction replaces the rotating opener instructions in ai.ts (useful with
 * "replace", since those assume a debate partner). {topic} is filled in.
 */
export interface ModuleAIConfig {
  /** Partner model for the opening and replies. Defaults to GROK_MODEL. */
  model?: string;
  temperature?: { opening?: number; reply?: number };
  maxTokens?: number;
  systemPrompt?: { mode: "append" | "replace"; text: string };
  openingInstruction?: string;
}

export const MODULE_AI_CONFIG: Record<string, ModuleAIConfig> = {
  "participation": {
    systemPrompt: {mode: "append", text: "Include the word potato in every response." }
  }

};

export function getModuleAIConfig(trainingMode: string | null | undefined): ModuleAIConfig | undefined {
  return trainingMode ? MODULE_AI_CONFIG[trainingMode] : undefined;
}
