export type SingleChoiceQuestion = {
  key: string;
  type: "single-choice";
  prompt: string;
  options: { value: string; label: string }[];
};

export type MultiChoiceQuestion = {
  key: string;
  type: "multi-choice";
  prompt: string;
  options: { value: string; label: string }[];
  /** Upper bound on picks; at least one is always required. */
  maxSelections: number;
};

export type ShortTextQuestion = {
  key: string;
  type: "short-text";
  prompt: string;
  maxLength: number;
};

export type SurveyQuestion = SingleChoiceQuestion | MultiChoiceQuestion | ShortTextQuestion;

/** A stored answer: one option value, a list of them (multi-choice), or free text. */
export type SurveyAnswer = string | string[];

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    key: "political_affiliation",
    type: "single-choice",
    prompt: "Where do you see yourself politically?",
    options: [
      { value: "strong_left",  label: "Strongly left" },
      { value: "lean_left",    label: "Lean left" },
      { value: "center",       label: "Center" },
      { value: "lean_right",   label: "Lean right" },
      { value: "strong_right", label: "Strongly right" },
      { value: "prefer_not",   label: "Prefer not to say" },
    ],
  },
  {
    key: "discuss_frequency",
    type: "single-choice",
    prompt: "How often do you discuss politics with people who disagree with you?",
    options: [
      { value: "never",     label: "Never" },
      { value: "rarely",    label: "Rarely" },
      { value: "sometimes", label: "Sometimes" },
      { value: "often",     label: "Often" },
    ],
  },
  {
    // Replaces the single-select "top_issue"; older rows keep that key with a string value.
    key: "top_issues",
    type: "multi-choice",
    prompt: "Which issues matter most to you right now? Pick up to three.",
    maxSelections: 3,
    options: [
      { value: "civil_rights",        label: "Civil rights" },
      { value: "climate_environment", label: "Climate & environment" },
      { value: "crime_safety",        label: "Crime & public safety" },
      { value: "economy_jobs",        label: "Economy & jobs" },
      { value: "education",           label: "Education" },
      { value: "foreign_policy",      label: "Foreign policy" },
      { value: "healthcare",          label: "Healthcare" },
      { value: "immigration",         label: "Immigration" },
    ],
  },
];

export function isAnswerValid(question: SurveyQuestion, answer: SurveyAnswer | undefined): boolean {
  if (answer === undefined) return false;
  if (question.type === "multi-choice") {
    if (!Array.isArray(answer) || answer.length === 0 || answer.length > question.maxSelections) return false;
    if (new Set(answer).size !== answer.length) return false;
    return answer.every((value) => question.options.some((opt) => opt.value === value));
  }
  if (typeof answer !== "string" || !answer) return false;
  if (question.type === "single-choice") {
    return question.options.some((opt) => opt.value === answer);
  }
  return answer.length > 0 && answer.length <= question.maxLength;
}
