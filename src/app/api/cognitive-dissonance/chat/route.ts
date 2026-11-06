import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { SkillSession } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getModule } from "@/lib/modules/registry";
import { validateCdDiagnostic } from "@/lib/modules/cognitive-dissonance/survey";
import {
  CLOSING_INSTRUCTION,
  MAX_TURNS,
  PROMPT_VERSION,
  buildCdSystemPrompt,
  isCdChatKind,
  type CdChatKind,
} from "@/lib/modules/cognitive-dissonance/prompts";
import { CD_MODEL, cdComplete, processReply, type CdModelMessage } from "@/lib/modules/cognitive-dissonance/openai";

/**
 * The Cognitive Dissonance module's study conversations (the "cd-study-chat" custom steps).
 * Runs outside the debate pipeline on purpose: no persona, civility scoring, XP or turn-limit
 * UI; the AI ends the chat itself with END_TOKEN, as in the Qualtrics treatment.
 *
 * Lives at /api/cognitive-dissonance rather than /api/modules/cognitive-dissonance because a
 * static folder there would shadow /api/modules/[key]/* (advance, start, complete) for this module.
 *
 * Storage, in SkillSession.stepResponses (not under "<stepId>" itself, which the advance route
 * overwrites with the step's answer on Continue):
 *   "<stepId>_chat"       the transcript and its metadata (CdTranscript)
 *   "<stepId>_discomfort" every discomfort button press, synced as they happen
 * Each is written with a single-key jsonb_set, so a press saved while a reply is being generated
 * can't overwrite the transcript (or the other way round).
 *
 * GET  ?stepId=                         -> { messages, ended, started, discomfort }
 * POST { stepId }                       -> starts the chat (AI speaks first), or retries a reply
 *                                          that failed. Safe to repeat.
 * POST { stepId, message, pasteAttempted? } -> sends a message and returns the AI's reply.
 * POST { stepId, action: "discomfort", discomfort } -> saves the discomfort button presses.
 */

const MODULE_KEY = "cognitive-dissonance";
const CHAT_COMPONENT = "cd-study-chat";
const MIN_CHARS = 2; // as the Qualtrics length gate
const MAX_CHARS = 2000;
const MAX_PRESSES = 1000;

interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  at: string;
}

interface CdTranscript {
  chat: CdChatKind;
  model: string;
  promptVersion: string;
  /** The full prompt this participant got (includes their survey answers for "conversation"). */
  systemPrompt: string;
  messages: StoredMessage[];
  userTurns: number;
  ended: boolean;
  endReason: "model" | "turn_cap" | null;
  apiErrors: number;
  pasteAttempted: boolean;
  startedAt: string;
  endedAt: string | null;
}

interface DiscomfortPresses {
  count: number;
  presses: { at: string; afterMessage: number }[];
}

const bad = (error: string, status: number, extra?: Record<string, unknown>) =>
  NextResponse.json({ error, ...extra }, { status });

const view = (t: CdTranscript) => ({
  messages: t.messages.map(({ role, content }) => ({ role, content })),
  ended: t.ended,
});

type Context =
  | { error: NextResponse }
  | { session: SkillSession; stepId: string; kind: CdChatKind; responses: Record<string, unknown> };

async function loadContext(stepId: unknown): Promise<Context> {
  const auth = await getServerSession(authOptions);
  if (!auth?.user) return { error: bad("Unauthorized", 401) };
  const userId = (auth.user as { id: string }).id;

  if (typeof stepId !== "string") return { error: bad("Missing stepId", 400) };
  const moduleConfig = getModule(MODULE_KEY);
  if (!moduleConfig) return { error: bad("Module not found", 404) };

  // /start resumes an in-progress run instead of creating another, so there is at most one.
  const session = await prisma.skillSession.findFirst({
    where: { userId, skillKey: MODULE_KEY, completedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!session) return { error: bad("Session not found", 404) };

  const variant = moduleConfig.variants.find((v) => v.key === session.variant) ?? moduleConfig.variants[0];
  const step = variant.steps.find((s) => s.id === stepId);
  if (!step || step.kind !== "custom" || step.component !== CHAT_COMPONENT) return { error: bad("Unknown step", 400) };
  // Which conversation to run comes from the registry, never from the browser.
  const kind = step.props?.chat;
  if (!isCdChatKind(kind)) return { error: bad("Step is misconfigured", 500) };

  const responses = (session.stepResponses as Record<string, unknown> | null) ?? {};
  return { session, stepId, kind, responses };
}

/**
 * Sets one key of stepResponses, only while the session is still on this step.
 * Returns false if it has moved on (or finished).
 */
async function setResponseKey(session: SkillSession, stepId: string, key: string, value: unknown) {
  const updated = await prisma.$executeRaw`
    UPDATE "SkillSession"
    SET "stepResponses" = jsonb_set(COALESCE("stepResponses", '{}'::jsonb), ARRAY[${key}]::text[], ${JSON.stringify(value)}::jsonb)
    WHERE "id" = ${session.id} AND "stage" = ${stepId} AND "completedAt" IS NULL`;
  return updated > 0;
}

/** Accepts the discomfort button's value from the browser only if it has the expected shape. */
function parseDiscomfort(value: unknown): DiscomfortPresses | null {
  if (!value || typeof value !== "object") return null;
  const { presses } = value as { presses?: unknown };
  if (!Array.isArray(presses) || presses.length > MAX_PRESSES) return null;
  const ok = presses.every(
    (p) => p && typeof p === "object" && typeof p.at === "string" && p.at.length < 40 && Number.isInteger(p.afterMessage),
  );
  if (!ok) return null;
  return { count: presses.length, presses: presses.map(({ at, afterMessage }) => ({ at, afterMessage })) };
}

export async function GET(req: Request) {
  const ctx = await loadContext(new URL(req.url).searchParams.get("stepId"));
  if ("error" in ctx) return ctx.error;
  const transcript = ctx.responses[`${ctx.stepId}_chat`] as CdTranscript | undefined;
  const discomfort = (ctx.responses[`${ctx.stepId}_discomfort`] as DiscomfortPresses | undefined) ?? null;
  if (!transcript) return NextResponse.json({ messages: [], ended: false, started: false, discomfort });
  return NextResponse.json({ ...view(transcript), started: true, discomfort });
}

export async function POST(req: Request) {
  let body: { stepId?: unknown; message?: unknown; pasteAttempted?: unknown; action?: unknown; discomfort?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON", 400);
  }
  const ctx = await loadContext(body.stepId);
  if ("error" in ctx) return ctx.error;
  const { session, stepId, kind, responses } = ctx;
  if (session.stage !== stepId) return bad("This conversation isn't the current step", 409);
  const chatKey = `${stepId}_chat`;
  const notCurrent = () => bad("This conversation isn't the current step", 409);

  // --- Discomfort button presses ---
  if (body.action === "discomfort") {
    const discomfort = parseDiscomfort(body.discomfort);
    if (!discomfort) return bad("Invalid discomfort data", 400);
    if (!(await setResponseKey(session, stepId, `${stepId}_discomfort`, discomfort))) return notCurrent();
    return NextResponse.json({ ok: true, count: discomfort.count });
  }

  const now = () => new Date().toISOString();
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const saved = responses[chatKey] as CdTranscript | undefined;

  // --- Start: the AI speaks first (only a system prompt is sent, as in Qualtrics) ---
  if (!saved) {
    const systemPrompt = buildCdSystemPrompt(kind, validateCdDiagnostic(responses.diagnostic));
    if (!systemPrompt) return bad("Please finish the survey first", 400);

    let raw: string;
    try {
      raw = await cdComplete(`opening[${kind}]`, [{ role: "system", content: systemPrompt }]);
    } catch {
      return bad("Something went wrong starting the conversation. Please try again.", 502);
    }
    const reply = processReply(raw);
    const transcript: CdTranscript = {
      chat: kind,
      model: CD_MODEL,
      promptVersion: PROMPT_VERSION,
      systemPrompt,
      messages: [{ role: "assistant", content: reply.text, at: now() }],
      userTurns: 0,
      ended: reply.ended,
      endReason: reply.ended ? "model" : null,
      apiErrors: 0,
      pasteAttempted: false,
      startedAt: now(),
      endedAt: reply.ended ? now() : null,
    };
    if (!(await setResponseKey(session, stepId, chatKey, transcript))) return notCurrent();
    return NextResponse.json(view(transcript));
  }

  const transcript: CdTranscript = { ...saved, messages: [...saved.messages] };
  if (transcript.ended) return bad("The conversation has ended", 409, view(transcript));
  if (body.pasteAttempted === true) transcript.pasteAttempted = true;

  const last = transcript.messages[transcript.messages.length - 1];
  const awaitingReply = last?.role === "user"; // a previous reply failed

  if (message) {
    if (awaitingReply) return bad("Still waiting on a reply. Try again.", 409, view(transcript));
    if (message.length < MIN_CHARS) return bad(`Your response must be at least ${MIN_CHARS} characters.`, 400);
    if (message.length > MAX_CHARS) return bad(`Please keep your response under ${MAX_CHARS} characters.`, 400);
    transcript.messages.push({ role: "user", content: message, at: now() });
    transcript.userTurns += 1;
  } else if (!awaitingReply) {
    // A repeated start (e.g. a remount): nothing to do.
    return NextResponse.json(view(transcript));
  }

  // On the cap turn the closing instruction goes with this one call only, never into the transcript.
  const hitCap = transcript.userTurns >= MAX_TURNS;
  const payload: CdModelMessage[] = [
    { role: "system", content: transcript.systemPrompt },
    ...transcript.messages.map(({ role, content }) => ({ role, content })),
    ...(hitCap ? [{ role: "system" as const, content: CLOSING_INSTRUCTION }] : []),
  ];

  let raw: string;
  try {
    raw = await cdComplete(`reply[${kind}] turn ${transcript.userTurns}`, payload);
  } catch {
    // Keep the participant's message so a retry (POST without a message) can answer it.
    transcript.apiErrors += 1;
    await setResponseKey(session, stepId, chatKey, transcript);
    return bad("Something went wrong reaching the AI. Please try again.", 502, view(transcript));
  }

  const reply = processReply(raw);
  transcript.messages.push({ role: "assistant", content: reply.text, at: now() });
  if (reply.ended || hitCap) {
    transcript.ended = true;
    transcript.endReason = reply.ended ? "model" : "turn_cap";
    transcript.endedAt = now();
  }
  if (!(await setResponseKey(session, stepId, chatKey, transcript))) return notCurrent();
  return NextResponse.json(view(transcript));
}
