import "server-only";

import { CONVERSATION_PROMPT_TEMPLATE, DYNAMIC_TREATMENT_PROMPT } from "./prompt-text";
import { buildParticipantProfile, getCdIssue, type CdDiagnosticAnswer } from "./survey";

/** Which of the module's two AI conversations a chat step runs. */
export type CdChatKind = "dynamic" | "conversation";

export function isCdChatKind(value: unknown): value is CdChatKind {
  return value === "dynamic" || value === "conversation";
}

/** Saved with every transcript, so data can be matched to the prompt wording it used. Bump when prompts change. */
export const PROMPT_VERSION = "qsf-2026-11-05";

// Everything below is copied from the QID76 JavaScript.

/** Safety cap: on this user turn the closing instruction is sent and the chat ends regardless. */
export const MAX_TURNS = 40;
export const END_TOKEN = "[END_CONVERSATION]";

const TECHNICAL_NOTE =
  "\n\nTECHNICAL INSTRUCTIONS (follow these in addition to everything above):\n" +
  "- Your messages are displayed as plain text. Do not use markdown formatting (no asterisks, pound signs, or bullet syntax).\n" +
  "- When you deliver the final message that concludes the conversation, end that message with the exact text " +
  END_TOKEN +
  ". " +
  "Never include that text in any other message. The participant will not see it.";

/** Sent (once, unsaved) with the MAX_TURNS-th user message if the AI hasn't concluded by then. */
export const CLOSING_INSTRUCTION = `SYSTEM NOTE: This is the final message of the conversation.
The user has just submitted their last response and will NOT be able to reply again.
Do not ask any further questions.
Instead, briefly acknowledge what the user said and thank them for conversing with you.
Do not praise the user, provide external validation or affirmation.
Stay fully in your established role and tone.
Do not mention that the conversation was time-limited or reveal any structure behind it.`;

/**
 * The full system prompt for a chat. The "conversation" chat needs the participant's survey
 * answers; the technical note (plain text + end token) is added to both, as Qualtrics does.
 */
export function buildCdSystemPrompt(kind: CdChatKind, diagnostic: CdDiagnosticAnswer | null): string | null {
  if (kind === "dynamic") return DYNAMIC_TREATMENT_PROMPT + TECHNICAL_NOTE;

  const issue = diagnostic ? getCdIssue(diagnostic.issue) : undefined;
  if (!diagnostic || !issue) return null;
  const prompt = CONVERSATION_PROMPT_TEMPLATE.replaceAll("{{issue}}", issue.label).replaceAll(
    "{{participant_profile}}",
    buildParticipantProfile(diagnostic),
  );
  return prompt + TECHNICAL_NOTE;
}
