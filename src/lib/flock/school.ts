import { SCHOOL_MAX_MESSAGE_LENGTH, SCHOOL_MIN_ANSWER_LENGTH, SCHOOL_ROUNDS } from "./config";

/** One line of a School lesson: the turkey (student) asks, the user (teacher) answers. */
export interface SchoolTurn {
  role: "turkey" | "teacher";
  content: string;
}

export type SchoolPhase = "asking" | "closing";

interface PromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Validates the lesson so far, as sent by the client before asking for the
 * turkey's next line. It must alternate turkey/teacher starting with the
 * turkey, end on a teacher answer (or be empty, to start the lesson), keep
 * answers at least SCHOOL_MIN_ANSWER_LENGTH long, and hold at most
 * SCHOOL_ROUNDS answers. Returns the trimmed history, or null when invalid.
 */
export function parseSchoolHistory(raw: unknown): SchoolTurn[] | null {
  if (!Array.isArray(raw)) return null;
  const turns: SchoolTurn[] = [];
  for (let i = 0; i < raw.length; i++) {
    const t = raw[i] as { role?: unknown; content?: unknown } | null;
    const expected = i % 2 === 0 ? "turkey" : "teacher";
    if (!t || t.role !== expected || typeof t.content !== "string") return null;
    const content = t.content.trim();
    if (content.length === 0 || content.length > SCHOOL_MAX_MESSAGE_LENGTH) return null;
    if (expected === "teacher" && content.length < SCHOOL_MIN_ANSWER_LENGTH) return null;
    turns.push({ role: expected, content });
  }
  if (turns.length > 0 && turns[turns.length - 1].role !== "teacher") return null;
  if (turns.length / 2 > SCHOOL_ROUNDS) return null;
  return turns;
}

/** "closing" once every round has been answered; the turkey then says what it learned. */
export function schoolPhase(history: SchoolTurn[]): SchoolPhase {
  const answers = history.filter((t) => t.role === "teacher").length;
  return answers >= SCHOOL_ROUNDS ? "closing" : "asking";
}

/** The chat messages for the turkey's next line in the lesson. */
export function buildSchoolPrompt(args: {
  turkeyName: string;
  skillLabel: string;
  skillBlurb: string;
  history: SchoolTurn[];
}): PromptMessage[] {
  const { turkeyName, skillLabel, skillBlurb, history } = args;
  const system = [
    `You are ${turkeyName}, a young turkey who is a curious student.`,
    `The person you're talking to is your teacher. They are teaching you about "${skillLabel}" — ${skillBlurb}`,
    "Ask simple, friendly questions about it, one at a time, the way a curious kid would.",
    "Use short, simple sentences (one to three). Be warm and a little playful. Never lecture or explain the skill yourself — you are the one learning.",
    "If the teacher's answer is clear, say briefly what you understood, then ask your next simple question.",
    "If the answer is vague or a bit off, don't correct them. Ask a follow-up question that helps you understand better.",
    "Stay on the topic of the lesson. If the teacher goes off topic, gently bring it back with a question about the lesson.",
    "Don't use emoji.",
  ].join(" ");

  const messages: PromptMessage[] = [{ role: "system", content: system }];
  for (const t of history) {
    messages.push({ role: t.role === "turkey" ? "assistant" : "user", content: t.content });
  }

  const answered = history.filter((t) => t.role === "teacher").length;
  let instruction: string;
  if (answered === 0) {
    instruction = `Start the lesson: greet your teacher in a few words and ask your first question about ${skillLabel}.`;
  } else if (schoolPhase(history) === "closing") {
    instruction =
      "The lesson is over. Thank your teacher and say in one or two sentences what you learned from them, in your own words. Do not ask another question.";
  } else {
    instruction = `This is question ${answered + 1} of ${SCHOOL_ROUNDS}. Respond to the teacher's last answer and ask one question.`;
  }
  messages.push({ role: "system", content: instruction });
  return messages;
}
