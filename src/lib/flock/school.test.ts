import { describe, it, expect } from "vitest";
import { buildSchoolPrompt, parseSchoolHistory, schoolPhase, type SchoolTurn } from "./school";
import { SCHOOL_ROUNDS } from "./config";

const ask = (content: string): SchoolTurn => ({ role: "turkey", content });
const answer = (content: string): SchoolTurn => ({ role: "teacher", content });
const goodAnswer = "Listening means paying attention to what they mean.";

describe("parseSchoolHistory", () => {
  it("accepts an empty history (the lesson is starting)", () => {
    expect(parseSchoolHistory([])).toEqual([]);
  });
  it("accepts alternating turkey/teacher turns ending on a teacher answer", () => {
    const h = [ask("What is listening?"), answer(goodAnswer)];
    expect(parseSchoolHistory(h)).toEqual(h);
  });
  it("trims message text", () => {
    expect(parseSchoolHistory([ask("  Hi?  "), answer(`  ${goodAnswer}  `)])).toEqual([
      ask("Hi?"),
      answer(goodAnswer),
    ]);
  });
  it("rejects non-arrays and malformed turns", () => {
    expect(parseSchoolHistory(null)).toBeNull();
    expect(parseSchoolHistory("hi")).toBeNull();
    expect(parseSchoolHistory([{ role: "turkey" }])).toBeNull();
    expect(parseSchoolHistory([{ role: "system", content: "x" }])).toBeNull();
  });
  it("rejects histories that don't alternate starting with the turkey", () => {
    expect(parseSchoolHistory([answer(goodAnswer)])).toBeNull();
    expect(parseSchoolHistory([ask("Q?"), ask("Q2?")])).toBeNull();
  });
  it("rejects a history that ends on the turkey (nothing to respond to)", () => {
    expect(parseSchoolHistory([ask("Q?")])).toBeNull();
  });
  it("rejects answers shorter than the minimum", () => {
    expect(parseSchoolHistory([ask("Q?"), answer("too short")])).toBeNull();
  });
  it("rejects more answers than a lesson has rounds", () => {
    const h: SchoolTurn[] = [];
    for (let i = 0; i <= SCHOOL_ROUNDS; i++) h.push(ask(`Q${i}?`), answer(goodAnswer));
    expect(parseSchoolHistory(h)).toBeNull();
  });
  it("rejects overly long messages", () => {
    expect(parseSchoolHistory([ask("Q?"), answer("a".repeat(1001))])).toBeNull();
  });
});

describe("schoolPhase", () => {
  it("is 'asking' until the last round has been answered, then 'closing'", () => {
    expect(schoolPhase([])).toBe("asking");
    const h: SchoolTurn[] = [];
    for (let i = 0; i < SCHOOL_ROUNDS - 1; i++) h.push(ask("Q?"), answer(goodAnswer));
    expect(schoolPhase(h)).toBe("asking");
    h.push(ask("Q?"), answer(goodAnswer));
    expect(schoolPhase(h)).toBe("closing");
  });
});

describe("buildSchoolPrompt", () => {
  const base = { turkeyName: "Pip", skillLabel: "Listening", skillBlurb: "Hear what someone means." };

  it("casts the turkey as a curious student and the user as the teacher, about its skill", () => {
    const [system] = buildSchoolPrompt({ ...base, history: [] });
    expect(system.role).toBe("system");
    expect(system.content).toContain("Pip");
    expect(system.content).toContain("Listening");
    expect(system.content.toLowerCase()).toContain("student");
    expect(system.content.toLowerCase()).toContain("teacher");
    expect(system.content.toLowerCase()).toContain("follow-up");
  });
  it("maps turkey turns to assistant and teacher turns to user", () => {
    const msgs = buildSchoolPrompt({ ...base, history: [ask("What is listening?"), answer(goodAnswer)] });
    expect(msgs.slice(1, 3)).toEqual([
      { role: "assistant", content: "What is listening?" },
      { role: "user", content: goodAnswer },
    ]);
  });
  it("ends with an instruction for the current phase", () => {
    const opening = buildSchoolPrompt({ ...base, history: [] });
    expect(opening[opening.length - 1].content.toLowerCase()).toContain("first question");

    const full: SchoolTurn[] = [];
    for (let i = 0; i < SCHOOL_ROUNDS; i++) full.push(ask("Q?"), answer(goodAnswer));
    const closing = buildSchoolPrompt({ ...base, history: full });
    const last = closing[closing.length - 1].content.toLowerCase();
    expect(last).toContain("thank");
    expect(last).toContain("do not ask");
  });
});
