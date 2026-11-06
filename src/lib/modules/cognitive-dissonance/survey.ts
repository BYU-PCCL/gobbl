/**
 * Diagnostic survey for the Cognitive Dissonance module, copied from the SAIL Cognitive
 * Dissonance Qualtrics survey (QID19 + the four "Political Preferences" blocks).
 *
 * Plain data only: imported by the survey component in the browser and by the chat route on
 * the server (which re-validates answers and builds the AI's participant profile from them).
 *
 * Each question is stored under the same `prefN` key Qualtrics saves it as (embedded data
 * pref1..pref8), so app data lines up with the study export. Questions are listed in the
 * order the Qualtrics block shows them, which is not always pref order (see guns).
 * Answers are stored as the choice labels, which is what Qualtrics pipes
 * (ChoiceGroup/SelectedChoices); slider answers are numbers 0-100.
 */

export type CdIssueKey = "immigration" | "transgender" | "guns" | "abortion";

export type CdQuestion =
  | { key: string; kind: "choice"; prompt: string; options: string[] }
  | {
      key: string;
      kind: "slider";
      prompt: string;
      /** Short labels for the two ends of the 0-100 scale. */
      minLabel: string;
      maxLabel: string;
    };

export interface CdIssue {
  key: CdIssueKey;
  /** Label shown in the issue question and given to the AI as {{issue}}. */
  label: string;
  questions: CdQuestion[];
}

export interface CdDiagnosticAnswer {
  issue: CdIssueKey;
  prefs: Record<string, string | number>;
}

export const CD_ISSUE_QUESTION =
  "Of the political issues on this list, which do you have the strongest opinions about?";

const AGREE_7 = [
  "Strongly agree",
  "Agree",
  "Somewhat agree",
  "Neither agree nor disagree",
  "Somewhat disagree",
  "Disagree",
  "Strongly disagree",
];

const CONFIDENCE_5 = [
  "Not confident at all",
  "Only slightly confident",
  "Moderately confident",
  "Highly confident",
  "Extremely confident",
];

// QID60 (immigration) also has a sixth option, "A moderate amoun", which looks like a leftover
// and is left out here.
const MORAL_5 = ["Not at all", "Slightly", "Moderately", "Very much", "Completely"];

const CLOSER = "Which comes closer to your view, even if neither is right?";

const agree = (key: string, prompt: string): CdQuestion => ({ key, kind: "choice", prompt, options: AGREE_7 });

export const CD_ISSUES: CdIssue[] = [
  {
    key: "immigration",
    label: "Immigration",
    questions: [
      agree("pref1", "The U.S. should increase the deportation of immigrants who are living in the country illegally."),
      agree("pref2", "Undocumented immigrants who were brought to the U.S. as children should be given a path to citizenship."),
      agree("pref3", "Immigration enforcement agencies like ICE should receive more funding and authority."),
      agree("pref4", "Overall, immigrants make the U.S. stronger."),
      {
        key: "pref5",
        kind: "choice",
        prompt: CLOSER,
        options: [
          "Securing the border and enforcing immigration law should be a greater priority for politicians than creating legal pathways to citizenship and protecting immigrants already in the U.S.",
          "Creating legal pathways to citizenship and protecting immigrants already in the U.S. should be a greater priority for politicians than securing the border and enforcing immigration law.",
        ],
      },
      {
        key: "pref6",
        kind: "slider",
        prompt:
          "Should the U.S. welcome more immigrants and reduce enforcement, or limit immigration and increase enforcement? Move the slider to indicate your opinion, with 0 meaning that the U.S. should reduce immigration and increase immigration enforcement and 100 meaning that the U.S. should welcome many more immigrants and reduce law enforcement.",
        minLabel: "Reduce immigration, increase enforcement",
        maxLabel: "Welcome many more immigrants, reduce enforcement",
      },
      { key: "pref7", kind: "choice", prompt: "How confident are you about your views on immigration?", options: CONFIDENCE_5 },
      {
        key: "pref8",
        kind: "choice",
        prompt: "How much is your view on immigration connected to your core moral beliefs or convictions?",
        options: MORAL_5,
      },
    ],
  },
  {
    key: "transgender",
    label: "Transgender policy",
    questions: [
      agree("pref1", "Transgender girls and women should be allowed to compete on female sports teams."),
      agree("pref2", "Medical treatments such as puberty blockers and hormones should be banned for people under age 18."),
      agree("pref3", "Transgender people should be able to use public restrooms that match their gender identity."),
      agree("pref4", "Schools should be required to tell parents if a student asks to use a different name or pronouns."),
      {
        key: "pref5",
        kind: "choice",
        prompt: CLOSER,
        options: [
          "Protecting transgender people from discrimination should be a greater priority for politicians than protecting women's spaces, children, and parents' rights.",
          "Protecting women's spaces, children, and parents' rights should be a greater priority for politicians than protecting transgender people from discrimination.",
        ],
      },
      {
        key: "pref6",
        kind: "slider",
        prompt:
          "Should laws do more to limit or protect transgender people's access to sports, facilities, and medical care? Move the slider to indicate your opinion, with 0 meaning that laws should do more to limit transgender people's access to sports, facilities, and medical care, and 100 meaning that laws should do more to protect transgender people's access to sports, facilities, and medical care.",
        minLabel: "Do more to limit access",
        maxLabel: "Do more to protect access",
      },
      { key: "pref7", kind: "choice", prompt: "How confident are you about your views on transgender policy?", options: CONFIDENCE_5 },
      {
        key: "pref8",
        kind: "choice",
        prompt: "How much is your view on transgender policy connected to your core moral beliefs or convictions?",
        options: MORAL_5,
      },
    ],
  },
  {
    key: "guns",
    label: "Gun policy",
    // Qualtrics block order (QID35, 33, 34, 37, 20, 36, 62, 63), which differs from pref order.
    questions: [
      agree("pref4", "More guns in the hands of responsible citizens make communities safer."),
      agree("pref2", "Law-abiding adults should be able to carry a concealed handgun without a permit."),
      agree("pref3", "Semi-automatic rifles such as the AR-15 should be banned."),
      {
        key: "pref6",
        kind: "choice",
        prompt: CLOSER,
        options: [
          "Reducing gun violence should be a greater priority for politicians than protecting the right to own guns.",
          "Protecting the right to own guns should be a greater priority for politicians than reducing gun violence.",
        ],
      },
      agree("pref1", "All gun sales, including private sales between individuals, should require a background check."),
      {
        key: "pref5",
        kind: "slider",
        prompt:
          "How strict should gun control laws be? Move the slider to indicate your opinion, with 0 meaning that gun laws should be much less strict and 100 meaning that gun laws should be stricter.",
        minLabel: "Much less strict",
        maxLabel: "Stricter",
      },
      { key: "pref7", kind: "choice", prompt: "How confident are you about your views on gun control?", options: CONFIDENCE_5 },
      {
        key: "pref8",
        kind: "choice",
        prompt: "How much is your view on gun control connected to your core moral beliefs or convictions?",
        options: MORAL_5,
      },
    ],
  },
  {
    key: "abortion",
    label: "Abortion",
    questions: [
      agree("pref1", "Abortion should be legal in all or most cases."),
      agree("pref2", "Abortion should be banned after about six weeks of pregnancy, when cardiac activity can usually be detected."),
      agree("pref3", "A woman should be able to receive a legal abortion for any reason during the first three months of pregnancy."),
      agree("pref4", "Human life begins at conception, and should be protected by law from that point on."),
      {
        key: "pref5",
        kind: "choice",
        prompt: CLOSER,
        options: [
          "Protecting a woman's right to choose should be a greater priority for politicians than protecting unborn life.",
          "Protecting unborn life should be a greater priority for politicians than protecting a woman's right to choose.",
        ],
      },
      {
        key: "pref6",
        kind: "slider",
        prompt:
          "Should abortion be legal or illegal? Move the slider to indicate your opinion, with 0 meaning that abortion should be illegal in all cases, and 100 meaning that abortion should be legal in all cases.",
        minLabel: "Illegal in all cases",
        maxLabel: "Legal in all cases",
      },
      { key: "pref7", kind: "choice", prompt: "How confident are you about your views on abortion?", options: CONFIDENCE_5 },
      {
        key: "pref8",
        kind: "choice",
        prompt: "How much is your view on abortion connected to your core moral beliefs or convictions?",
        options: MORAL_5,
      },
    ],
  },
];

export function getCdIssue(key: unknown): CdIssue | undefined {
  return CD_ISSUES.find((i) => i.key === key);
}

function isValidAnswer(q: CdQuestion, value: unknown): boolean {
  if (q.kind === "slider") {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
  }
  return typeof value === "string" && q.options.includes(value);
}

/**
 * Checks a survey answer ({ issue, prefs }) and returns a cleaned copy, or null if an issue
 * wasn't picked or any of its questions is unanswered or invalid. Used by the survey step
 * (to enable Continue) and by the chat route (which can't trust what the browser saved).
 */
export function validateCdDiagnostic(value: unknown): CdDiagnosticAnswer | null {
  if (!value || typeof value !== "object") return null;
  const { issue: issueKey, prefs } = value as { issue?: unknown; prefs?: unknown };
  const issue = getCdIssue(issueKey);
  if (!issue || !prefs || typeof prefs !== "object") return null;
  const given = prefs as Record<string, unknown>;
  const cleaned: Record<string, string | number> = {};
  for (const q of issue.questions) {
    if (!isValidAnswer(q, given[q.key])) return null;
    cleaned[q.key] = given[q.key] as string | number;
  }
  return { issue: issue.key, prefs: cleaned };
}

/**
 * The {{participant_profile}} text for the AI: each question followed by the participant's
 * answer, in the order they were asked.
 */
export function buildParticipantProfile(answer: CdDiagnosticAnswer): string {
  const issue = getCdIssue(answer.issue);
  if (!issue) return "";
  return issue.questions
    .map((q) => {
      const a = answer.prefs[q.key];
      const shown = q.kind === "slider" ? `${a} (on a 0-100 scale: 0 = ${q.minLabel}, 100 = ${q.maxLabel})` : String(a);
      return `${q.prompt}\nAnswer: ${shown}`;
    })
    .join("\n\n");
}
