import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAIOpening, getAIResponse, type ChatMessage } from "@/lib/ai";
import type { ModuleAIConfig } from "@/lib/modules/ai-config";
import { getUserBelief } from "@/lib/prompts/userBelief";
import { getPersonaById, isTier, opposingPersonas, pickOpposingPersona } from "@/lib/personas/pool";
import { getStudioAccess, studioDenied } from "@/lib/studio/access";
import { validateComponentProps } from "@/lib/studio/components";

const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 2000;

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/**
 * One AI turn for Module Studio's preview. Stateless and never saved: the browser sends the
 * draft's AI chat settings plus the conversation so far, and gets the partner's next message.
 *
 * It goes through the same prompt-building as a real module (persona, language rules, the
 * module prompt), with the draft's settings standing in for the entry in ai-config.ts, so
 * what an author sees here is what Gobbl would do.
 */
export async function POST(req: Request) {
  const access = await getStudioAccess();
  if (access.status !== "ok") return studioDenied(access);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid request body");

  const stepError = validateComponentProps("practice", body.step);
  if (stepError) return bad(stepError);
  const step = body.step as Record<string, unknown>;

  const raw = body.messages;
  if (!Array.isArray(raw) || raw.length > MAX_MESSAGES) return bad(`Send up to ${MAX_MESSAGES} messages`);
  const messages: ChatMessage[] = [];
  for (const m of raw) {
    const ok =
      m && typeof m === "object" &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" && m.content.trim() !== "" && m.content.length <= MAX_MESSAGE_CHARS;
    if (!ok) return bad("Messages must be non-empty text of up to 2000 characters");
    messages.push({ role: m.role, content: m.content });
  }
  if (messages.length > 0 && messages[messages.length - 1].role !== "user") {
    return bad("The last message must be the learner's");
  }

  const tier = String(step.difficulty);
  if (!isTier(tier)) return bad("Unknown difficulty");
  const topic = String(step.topic);

  // Same partner choice as a real debate: across the aisle from the signed-in user.
  const user = await prisma.user.findUnique({
    where: { id: access.user.id },
    select: { surveyResponses: true },
  });
  const userBelief = getUserBelief(user?.surveyResponses);
  const requested = typeof body.personaId === "string" ? getPersonaById(body.personaId) : null;
  const persona =
    requested && opposingPersonas(tier, userBelief).includes(requested)
      ? requested
      : pickOpposingPersona(tier, userBelief);

  const promptText = typeof step.aiPromptText === "string" ? step.aiPromptText.trim() : "";
  const opening = typeof step.openingInstruction === "string" ? step.openingInstruction.trim() : "";
  const moduleAIOverride: ModuleAIConfig = {
    systemPrompt: promptText
      ? { mode: step.aiPromptMode === "replace" ? "replace" : "append", text: promptText }
      : undefined,
    openingInstruction: opening || undefined,
  };

  try {
    const reply =
      messages.length === 0
        ? await getAIOpening(topic, persona, { moduleAIOverride })
        : await getAIResponse(messages, topic, persona, { moduleAIOverride });
    return NextResponse.json({
      reply,
      personaId: persona.id,
      initials: persona.initials,
      // Without a key the reply is a placeholder; say so, so the preview doesn't pass it off as the AI.
      offline: !process.env.GROK_API_KEY,
    });
  } catch {
    return bad("The AI didn't respond — try again", 502);
  }
}
