import OpenAI from "openai";
import { CivilityDimensions, CivilityResult, averageDimensions } from "./civility";
import {
  CIVILITY_HOLISTIC_SYSTEM,
  CIVILITY_MESSAGE_SYSTEM,
  CIVILITY_PARTNER_MESSAGE_SYSTEM,
} from "./prompts/civility-rubric";
import { buildSystemPrompt } from "./prompts/builder";
import type { Persona } from "@/lib/personas/pool";

const MOCK_MODE = !process.env.GROK_API_KEY;

/** Grok 4 fast reasoning — see https://docs.x.ai/docs/models */
const GROK_MODEL = process.env.GROK_MODEL ?? "grok-4-1-fast-reasoning";

/** Lighter model for JSON civility scoring (lower latency than reasoning). */
const GROK_CIVILITY_MODEL = process.env.GROK_CIVILITY_MODEL ?? "grok-3-fast";

let grokClient: OpenAI | null = null;
function getClient() {
  if (!grokClient && !MOCK_MODE) {
    grokClient = new OpenAI({
      apiKey: process.env.GROK_API_KEY,
      baseURL: "https://api.x.ai/v1",
    });
  }
  return grokClient;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const NO_GROK_KEY =
  "Robert is offline — add GROK_API_KEY to your environment to run conversations.";

/** Rotating instructions so openings don't all sound the same; same rules, different phrasing hooks. */
const OPENING_USER_TEMPLATES = [
  `The issue on the table is: {topic}\n\nFirst message — they haven't said where they stand. Ask what they make of it (or where they land). Optional: one short line from your own angle per your fixed beliefs. Stay in character; don't rebut a position they haven't taken; don't flip to the opposite ideology. Avoid canned phrases you've used in other chats — sound like a real opener.`,

  `Topic: {topic}\n\nYou're up first. They haven't weighed in yet. Draw them out: what do they think? You can drop a quick, casual hint of how you see it from your beliefs — nothing essay-length. No debating a straw man. Match your ideology in the system prompt. Vary your tone (warm, blunt, curious — pick what fits) so this doesn't read like a template.`,

  `{topic} — that's what we're chewing on.\n\nNobody's stated a side yet. Lead with curiosity about their view; you can thread in a sentence of yours from your fixed beliefs if it feels natural. Short. Conversational. Not a speech. Don't mirror a generic "debate bot" opener.`,

  `We're discussing: {topic}\n\nOpening beat: invite their take before you argue anything. A brief aside showing where you're coming from (your belief block) is fine. They have not spoken yet — don't argue against them. Stay on-ideology. Make the greeting and question feel specific to *this* topic, not copy-paste.`,

  `Issue for today: {topic}\n\nYour first reply should pull their perspective out of them — question-first. Sprinkle a little of your own stance if you want, but keep it tight. First message only; no fake debate with an imaginary opponent. Fresh wording each time; skip stock openers like "I'm curious" or "I'd love to hear" if you used those last time.`,
];

const OPENING_BANNED_PHRASING = `Do not use "Spill it," "spill the beans," or similar pushy/casual clichés when asking for their view — vary your wording naturally.`;

function buildOpeningUserContent(topic: string): string {
  const template = OPENING_USER_TEMPLATES[Math.floor(Math.random() * OPENING_USER_TEMPLATES.length)];
  return `${template.replace("{topic}", topic)}\n\n${OPENING_BANNED_PHRASING}`;
}

export async function getAIOpening(
  topic: string,
  persona: Persona
): Promise<string> {
  if (MOCK_MODE) return NO_GROK_KEY;

  const client = getClient()!;
  const systemPrompt = buildSystemPrompt(persona);

  const completion = await client.chat.completions.create({
    model: GROK_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildOpeningUserContent(topic) },
    ],
    max_tokens: 400,
    temperature: 0.92,
  });
  const text = completion.choices[0]?.message?.content?.trim();
  return text || "Hmm, I blanked — say that again?";
}

export async function getAIResponse(
  messages: ChatMessage[],
  topic: string,
  persona: Persona
): Promise<string> {
  if (MOCK_MODE) return NO_GROK_KEY;

  const client = getClient()!;
  const systemPrompt = buildSystemPrompt(persona);

  const completion = await client.chat.completions.create({
    model: GROK_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    max_tokens: 400,
    temperature: 0.8,
  });
  const text = completion.choices[0]?.message?.content?.trim();
  return text || "Lost my train of thought — what were you saying?";
}

export async function scoreCivility(
  userMessage: string,
  conversationContext: ChatMessage[],
  speaker: "user" | "assistant" = "user"
): Promise<CivilityResult> {
  if (MOCK_MODE) return getMockScore(userMessage);

  const client = getClient()!;
  const contextStr = conversationContext
    .slice(-4)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const completion = await client.chat.completions.create({
    model: GROK_CIVILITY_MODEL,
    messages: [
      {
        role: "system",
        content: speaker === "assistant" ? CIVILITY_PARTNER_MESSAGE_SYSTEM : CIVILITY_MESSAGE_SYSTEM,
      },
      {
        role: "user",
        content: `Conversation context:\n${contextStr}\n\n${
          speaker === "assistant" ? "AI partner" : "User"
        } message to score:\n"${userMessage}"`,
      },
    ],
    max_tokens: 220,
    temperature: 0.3,
  });

  try {
    const raw = completion.choices[0]?.message?.content || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]);
    const dimensions: CivilityDimensions = {
      participation: clamp(parsed.participation),
      selfExpressionReason: clamp(parsed.selfExpressionReason),
      mutualExchange: clamp(parsed.mutualExchange),
      interrogation: clamp(parsed.interrogation),
    };
    return {
      dimensions,
      overall: averageDimensions(dimensions),
      feedback: parsed.feedback || "Keep those feathers flying — great discourse!",
    };
  } catch {
    return getMockScore(userMessage);
  }
}

function dimensionsFromParsed(parsed: Record<string, unknown>): CivilityDimensions {
  return {
    participation: clamp(Number(parsed.participation)),
    selfExpressionReason: clamp(Number(parsed.selfExpressionReason)),
    mutualExchange: clamp(Number(parsed.mutualExchange)),
    interrogation: clamp(Number(parsed.interrogation)),
  };
}

/** Full transcript of user + assistant roles, chronological. Used at wrap-up for holistic civility. */
export async function scoreConversationHolistic(transcript: string): Promise<CivilityResult | null> {
  if (MOCK_MODE) return null;

  const client = getClient()!;
  const completion = await client.chat.completions.create({
    model: GROK_CIVILITY_MODEL,
    messages: [
      { role: "system", content: CIVILITY_HOLISTIC_SYSTEM },
      { role: "user", content: `Full conversation:\n\n${transcript}` },
    ],
    max_tokens: 400,
    temperature: 0.25,
  });

  try {
    const raw = completion.choices[0]?.message?.content || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const dimensions = dimensionsFromParsed(parsed);
    return {
      dimensions,
      overall: averageDimensions(dimensions),
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : "Solid conversation.",
    };
  } catch {
    return null;
  }
}

function clamp(val: number): number {
  if (!Number.isFinite(val)) return 5;
  return Math.max(1, Math.min(10, Math.round(val)));
}

function getMockScore(message: string): CivilityResult {
  const length = message.length;
  const hasQuestion = message.includes("?");
  const base = 5 + Math.min(3, length / 100);

  const dimensions: CivilityDimensions = {
    participation: clamp(base + (Math.random() * 2 - 0.5)),
    selfExpressionReason: clamp(base - 1 + Math.random() * 2),
    mutualExchange: clamp(base - 0.5 + (hasQuestion ? 1 : 0) + Math.random()),
    interrogation: clamp(base - 0.5 + Math.random() * 2),
  };

  return {
    dimensions,
    overall: averageDimensions(dimensions),
    feedback: hasQuestion
      ? "Nice work asking questions — that shows real engagement with the other side. Your feathers are looking bright!"
      : "Try asking a question to show you're actively engaging with the other viewpoint. Curious turkeys earn more feathers!",
  };
}
