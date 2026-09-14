import type { ModuleConfig } from "./types";

/**
 * Placeholder content for validating the harness end-to-end. Not research
 * content — Busby supplies the real diagnostic questions, tips, and prompts
 * per module before this ships to users.
 */
const PARTICIPATION_MODULE: ModuleConfig = {
  key: "participation",
  skill: "participation",
  title: "Participation",
  description: "Practice staying in the conversation, even when it gets uncomfortable.",
  estimatedMinutes: 10,
  variants: [
    {
      key: "standard",
      steps: [
        {
          id: "diagnostic",
          kind: "diagnostic",
          questions: [
            {
              key: "speaks_up_when_disagree",
              type: "single-choice",
              prompt: "How often do you speak up when you disagree with someone?",
              options: [
                { value: "rarely", label: "Rarely — I usually stay quiet" },
                { value: "sometimes", label: "Sometimes, if it feels safe" },
                { value: "often", label: "Often — I say what I think" },
              ],
            },
            {
              key: "leaves_hard_conversations",
              type: "single-choice",
              prompt: "When a political conversation gets tense, what do you usually do?",
              options: [
                { value: "exit", label: "Change the subject or leave" },
                { value: "go_quiet", label: "Stay, but go quiet" },
                { value: "stay_engaged", label: "Stay engaged and keep talking" },
              ],
            },
          ],
        },
        {
          id: "content",
          kind: "content",
          blocks: [
            {
              heading: "Why participation matters",
              body: "Placeholder tip copy — staying in a hard conversation, instead of shutting down or leaving, is the first skill everything else builds on.",
            },
            {
              heading: "One thing to try",
              body: "Placeholder tip copy — before you respond, name one thing you actually agree with, even a small one.",
            },
          ],
        },
        {
          id: "practice",
          kind: "practice",
          topic: "Minimum Wage Increase — Should the federal minimum wage be raised to $20/hour?",
          difficulty: "Friendly Cluck",
          maxTurns: 8,
        },
        {
          id: "reflection",
          kind: "reflection",
          prompt: "Placeholder prompt — what almost made you want to drop out of that conversation, and what kept you in it?",
          maxLength: 500,
        },
      ],
    },
  ],
};

export const MODULES: ModuleConfig[] = [PARTICIPATION_MODULE];

export function getModule(key: string): ModuleConfig | undefined {
  return MODULES.find((m) => m.key === key);
}
