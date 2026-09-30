import OpenAI from "openai";
import { CivilityDimensions, CivilityResult, averageDimensions } from "./civility";
import {
  CIVILITY_HOLISTIC_SYSTEM,
  CIVILITY_MESSAGE_SYSTEM,
  CIVILITY_PARTNER_MESSAGE_SYSTEM,
} from "./prompts/civility-rubric";
import { ANALYZE_SYSTEM } from "./prompts/analyze";
import { buildSystemPrompt, profanityAllowed } from "./prompts/builder";
import { breaksLanguageRules, LANGUAGE_REMINDER, scrubLanguage } from "./prompts/language";
import type { Persona } from "@/lib/personas/pool";

const MOCK_MODE = !process.env.GROK_API_KEY;

/**
 * Non-reasoning on purpose: reasoning models think silently before replying (~3x slower
 * per turn in testing). Pin a full model id — retired aliases like "grok-4-1-fast-reasoning"
 * and "grok-3-fast" silently resolve to grok-4.3, a reasoning model.
 * See https://docs.x.ai/docs/models
 */
const GROK_MODEL = process.env.GROK_MODEL ?? "grok-4.20-0309-non-reasoning";

/** Model for JSON civility scoring. */
const GROK_CIVILITY_MODEL = process.env.GROK_CIVILITY_MODEL ?? "grok-4.20-0309-non-reasoning";

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

/** Every Grok call goes through here so latency shows up in the logs, labeled by purpose. */
async function complete(
  label: string,
  params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
) {
  const start = Date.now();
  try {
    const completion = await getClient()!.chat.completions.create(params);
    console.log(
      `[grok] ${label} ${completion.model} ${Date.now() - start}ms ` +
        `(in ${completion.usage?.prompt_tokens ?? "?"} / out ${completion.usage?.completion_tokens ?? "?"} tokens)`
    );
    return completion;
  } catch (err) {
    console.log(`[grok] ${label} ${params.model} failed after ${Date.now() - start}ms`);
    throw err;
  }
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

export interface PromptOptions {
  allowProfanity?: boolean;
}

export async function getAIOpening(
  topic: string,
  persona: Persona,
  options: PromptOptions = {}
): Promise<string> {
  if (MOCK_MODE) return NO_GROK_KEY;

  const text = await generateInCharacter("opening", persona, options, {
    messages: [{ role: "user", content: buildOpeningUserContent(topic) }],
    temperature: 0.92,
  });
  return text || "Hmm, I blanked — say that again?";
}

export async function getAIResponse(
  messages: ChatMessage[],
  topic: string,
  persona: Persona,
  options: PromptOptions = {}
): Promise<string> {
  if (MOCK_MODE) return NO_GROK_KEY;

  const text = await generateInCharacter("reply", persona, options, {
    messages,
    temperature: 0.8,
  });
  return text || "Lost my train of thought — what were you saying?";
}

/**
 * One in-character persona message, with the language rules enforced: a reply that
 * breaks them is regenerated once, and scrubbed if the retry breaks them too.
 */
async function generateInCharacter(
  label: string,
  persona: Persona,
  options: PromptOptions,
  { messages, temperature }: { messages: ChatMessage[]; temperature: number }
): Promise<string | undefined> {
  const allowProfanity = profanityAllowed(persona, options);
  const base = [{ role: "system" as const, content: buildSystemPrompt(persona, options) }, ...messages];
  const run = async (tag: string, extra: ChatMessage[] = []) => {
    const completion = await complete(tag, {
      model: GROK_MODEL,
      messages: [...base, ...extra],
      max_tokens: 400,
      temperature,
    });
    return completion.choices[0]?.message?.content?.trim();
  };

  const first = await run(label);
  if (!first || !breaksLanguageRules(first, allowProfanity)) return first;

  const retry = await run(`${label}:language-retry`, [
    { role: "system", content: LANGUAGE_REMINDER(allowProfanity) },
  ]);
  if (retry && !breaksLanguageRules(retry, allowProfanity)) return retry;

  console.log(`[grok] ${label} still broke language rules after retry; scrubbing`);
  return scrubLanguage(retry || first, allowProfanity);
}

export async function scoreCivility(
  userMessage: string,
  conversationContext: ChatMessage[],
  speaker: "user" | "assistant" = "user"
): Promise<CivilityResult> {
  if (MOCK_MODE) return getMockScore(userMessage);

  const contextStr = conversationContext
    .slice(-4)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const completion = await complete(`civility:${speaker}`, {
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

  const completion = await complete("civility:holistic", {
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

export interface TurnFeedback {
  turn: number;
  wellDone: string;
  tryInstead: string;
}

/** Turn-by-turn feedback on a finished conversation ("Analyze" button). Null on failure. */
export async function analyzeDebate(
  transcript: string,
  userTurnCount: number
): Promise<TurnFeedback[] | null> {
  if (userTurnCount === 0) return [];
  if (MOCK_MODE) return getMockAnalysis(userTurnCount);

  const completion = await complete("analyze", {
    model: GROK_CIVILITY_MODEL,
    messages: [
      { role: "system", content: ANALYZE_SYSTEM },
      { role: "user", content: `Full conversation:\n\n${transcript}` },
    ],
    max_tokens: 200 * userTurnCount + 200,
    temperature: 0.4,
  });

  try {
    const raw = completion.choices[0]?.message?.content || "";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found");
    const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
    const feedback = parsed
      .map((p) => ({
        turn: Number(p.turn),
        wellDone: String(p.wellDone ?? "").trim(),
        tryInstead: String(p.tryInstead ?? "").trim(),
      }))
      .filter((t) => Number.isInteger(t.turn) && t.wellDone && t.tryInstead);
    return feedback.length > 0 ? feedback : null;
  } catch {
    return null;
  }
}

function getMockAnalysis(userTurnCount: number): TurnFeedback[] {
  return Array.from({ length: userTurnCount }, (_, i) => ({
    turn: i + 1,
    wellDone: "You stayed in the conversation and responded directly to what they said.",
    tryInstead: "Try asking a follow-up question before making your next point.",
  }));
}
