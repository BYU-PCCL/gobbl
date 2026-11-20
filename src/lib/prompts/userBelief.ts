import { BeliefKey } from "./beliefs";

// TODO(schema): the handoff assumes `User.beliefKey: BeliefKey` exists as a
// column. Today the user's political position is stored inside the JSON
// `User.surveyResponses` under key `political_affiliation` with values from
// the onboarding survey (`strong_left`, `lean_left`, `center`, `lean_right`,
// `strong_right`, `prefer_not`). When the User model gets a typed `beliefKey`
// column, replace this helper with a direct read.

const SURVEY_TO_BELIEF: Record<string, BeliefKey> = {
  strong_left:  "left",
  lean_left:    "lean-left",
  center:       "center",
  lean_right:   "lean-right",
  strong_right: "right",
};

/** Extract the user's belief from the survey JSON. Returns null if missing/opted-out. */
export function getUserBelief(surveyResponses: unknown): BeliefKey | null {
  if (!surveyResponses || typeof surveyResponses !== "object") return null;
  const raw = (surveyResponses as Record<string, unknown>).political_affiliation;
  if (typeof raw !== "string") return null;
  return SURVEY_TO_BELIEF[raw] ?? null;
}

/**
 * The issues the user said matter most. Reads the multi-select `top_issues` answer and
 * falls back to the older single-select `top_issue` so earlier accounts still get a result.
 */
export function getUserTopIssues(surveyResponses: unknown): string[] {
  if (!surveyResponses || typeof surveyResponses !== "object") return [];
  const responses = surveyResponses as Record<string, unknown>;
  if (Array.isArray(responses.top_issues)) {
    return responses.top_issues.filter((v): v is string => typeof v === "string");
  }
  return typeof responses.top_issue === "string" ? [responses.top_issue] : [];
}
