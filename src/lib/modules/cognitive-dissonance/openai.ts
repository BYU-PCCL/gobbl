import "server-only";

import OpenAI from "openai";
import { END_TOKEN } from "./prompts";

/**
 * OpenAI client for the Cognitive Dissonance study conversations. Separate from the Grok
 * client in lib/ai.ts on purpose: the study ran on OpenAI gpt-5.1 (QID76 JavaScript), and these
 * chats should behave like the treatment being tested.
 *
 * Without OPENAI_API_KEY it runs in mock mode (canned replies that end after a few turns), so
 * the module can be clicked through locally for free.
 */
const MOCK_MODE = !process.env.OPENAI_API_KEY;
export const CD_MODEL = process.env.CD_OPENAI_MODEL || "gpt-5.1";
const MOCK_TURNS = 3;

let client: OpenAI | null = null;
function getClient() {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export interface CdModelMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Returns the model's raw reply. Throws on API errors and on an empty reply. */
export async function cdComplete(label: string, messages: CdModelMessage[]): Promise<string> {
  if (MOCK_MODE) return mockReply(messages);

  const start = Date.now();
  try {
    const completion = await getClient().chat.completions.create({
      model: CD_MODEL,
      messages,
      max_completion_tokens: 1000, // gpt-5.x uses max_completion_tokens, not max_tokens
      // Same as the study. "none" is newer than this SDK's types, which only list low/medium/high.
      reasoning_effort: "none" as unknown as "low",
    });
    console.log(
      `[cd-openai] ${label} ${completion.model} ${Date.now() - start}ms ` +
        `(in ${completion.usage?.prompt_tokens ?? "?"} / out ${completion.usage?.completion_tokens ?? "?"} tokens)`,
    );
    const text = completion.choices[0]?.message?.content ?? "";
    if (!text.trim()) throw new Error("Empty response from model");
    return text;
  } catch (err) {
    console.log(`[cd-openai] ${label} ${CD_MODEL} failed after ${Date.now() - start}ms`);
    throw err;
  }
}

/** Strips END_TOKEN out of a reply and reports whether it was there (as processReply in QID76). */
export function processReply(raw: string): { text: string; ended: boolean } {
  return { text: raw.split(END_TOKEN).join("").trim(), ended: raw.includes(END_TOKEN) };
}

function mockReply(messages: CdModelMessage[]): string {
  const userTurns = messages.filter((m) => m.role === "user").length;
  if (userTurns === 0) return "(Mock mode: no OPENAI_API_KEY set.) Hi! This is a test conversation. Say anything to continue.";
  if (userTurns >= MOCK_TURNS) return `Thanks for talking with me. That's the end of this part. ${END_TOKEN}`;
  return `(Mock reply ${userTurns} of ${MOCK_TURNS}.) Tell me a bit more.`;
}
