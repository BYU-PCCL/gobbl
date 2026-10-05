import type { ModuleConfig } from "./types";

/**
 * Placeholder content for validating the harness end-to-end. Not research
 * content — Busby supplies the real diagnostic questions, tips, and prompts
 * per module before this ships to users.
 */
const PARTICIPATION_MODULE: ModuleConfig = {
  key: "participation",
  skill: "participation",
  title: "Participation",
  description: "Practice staying in the conversation, even when it gets uncomfortable.",
  estimatedMinutes: 10,
  variants: [
    {
      key: "standard",
      steps: [
        {
          id: "diagnostic",
          kind: "diagnostic",
          questions: [
            {
              key: "speaks_up_when_disagree",
              type: "single-choice",
              prompt: "How often do you speak up when you disagree with someone?",
              options: [
                { value: "rarely", label: "Rarely — I usually stay quiet" },
                { value: "sometimes", label: "Sometimes, if it feels safe" },
                { value: "often", label: "Often — I say what I think" },
              ],
            },
            {
              key: "leaves_hard_conversations",
              type: "single-choice",
              prompt: "When a political conversation gets tense, what do you usually do?",
              options: [
                { value: "exit", label: "Change the subject or leave" },
                { value: "go_quiet", label: "Stay, but go quiet" },
                { value: "stay_engaged", label: "Stay engaged and keep talking" },
              ],
            },
          ],
        },
        {
          id: "content",
          kind: "content",
          blocks: [
            {
              heading: "Why participation matters",
              body: "Placeholder tip copy — staying in a hard conversation, instead of shutting down or leaving, is the first skill everything else builds on.",
            },
            {
              heading: "One thing to try",
              body: "Placeholder tip copy — before you respond, name one thing you actually agree with, even a small one.",
            },
          ],
        },
        {
          id: "practice",
          kind: "practice",
          topic: "Minimum Wage Increase — Should the federal minimum wage be raised to $20/hour?",
          difficulty: "Friendly Cluck",
          maxTurns: 8,
        },
        {
          id: "reflection",
          kind: "reflection",
          prompt: "Placeholder prompt — what almost made you want to drop out of that conversation, and what kept you in it?",
          maxLength: 500,
        },
      ],
    },
  ],
};

/**
 * Skeleton for the module PS is building on "active listening" content for.
 * Busby's own framing was "training on listening AND observing someone being
 * listened to by others" — so unlike Participation, this adds an extra
 * `content` step used as a placeholder "observed exchange" before the user's
 * own practice conversation, instead of jumping straight to practice. No new
 * step kind needed for that — just a different arrangement of the same four.
 */
const LISTENING_MODULE: ModuleConfig = {
  key: "active-listening",
  skill: "listening",
  title: "Active Listening",
  description: "Notice what good listening looks like, then practice it yourself.",
  estimatedMinutes: 12,
  variants: [
    {
      key: "standard",
      steps: [
        {
          id: "diagnostic",
          kind: "diagnostic",
          questions: [
            {
              key: "interrupts_to_respond",
              type: "single-choice",
              prompt: "While someone's talking, are you usually listening or already forming your reply?",
              options: [
                { value: "listening", label: "Mostly listening" },
                { value: "mixed", label: "A bit of both" },
                { value: "replying", label: "Mostly forming my reply" },
              ],
            },
            {
              key: "restates_others",
              type: "single-choice",
              prompt: "How often do you check that you understood someone correctly before responding?",
              options: [
                { value: "rarely", label: "Rarely" },
                { value: "sometimes", label: "Sometimes" },
                { value: "often", label: "Often" },
              ],
            },
          ],
        },
        {
          id: "observe",
          kind: "content",
          blocks: [
            {
              heading: "Watch this exchange",
              body: "Placeholder transcript — PS is supplying a real observed exchange here. For now: imagine reading a short back-and-forth between two people, where one clearly restates the other's point before responding.",
            },
            {
              heading: "What to notice",
              body: "Placeholder tip copy — the listener asks a clarifying question instead of jumping to a counterargument. That's the behavior this module is training.",
            },
          ],
        },
        {
          id: "practice",
          kind: "practice",
          topic: "Minimum Wage Increase — Should the federal minimum wage be raised to $20/hour?",
          difficulty: "Friendly Cluck",
          maxTurns: 8,
        },
        {
          id: "reflection",
          kind: "reflection",
          prompt: "Placeholder prompt — compare the exchange you watched to your own conversation. Where did you restate or check understanding, and where did you jump straight to a response?",
          maxLength: 500,
        },
      ],
    },
  ],
};

/**
 * Skeleton for the module PS is building on "cognitive dissonance" content
 * for. Follows the same flow as Participation — Busby confirmed the other
 * four skills don't need a different structure — with the practice step
 * framed as the LLM conversation that surfaces the dissonance.
 */


/** this is where the "self-interrogation" used to sit. I built cognitive dissonance out in its own module instead. */




/**
 * Skeleton — Busby confirmed no departure from the Participation flow is
 * needed for this skill yet, so this follows the same standard shape.
 */
const SELF_EXPRESSION_MODULE: ModuleConfig = {
  key: "self-expression",
  skill: "selfExpression",
  title: "Self-Expression",
  description: "Practice putting your own view into words, not just reacting to theirs.",
  estimatedMinutes: 10,
  variants: [
    {
      key: "standard",
      steps: [
        {
          id: "diagnostic",
          kind: "diagnostic",
          questions: [
            {
              key: "shares_own_view",
              type: "single-choice",
              prompt: "In a political discussion, how often do you actually say what you think, versus just reacting to others?",
              options: [
                { value: "rarely", label: "Rarely — I mostly react" },
                { value: "sometimes", label: "Sometimes" },
                { value: "often", label: "Often — I lead with my own view" },
              ],
            },
            {
              key: "explains_why",
              type: "single-choice",
              prompt: "When you do share your view, do you usually explain why you hold it?",
              options: [
                { value: "rarely", label: "Rarely — I just state it" },
                { value: "sometimes", label: "Sometimes" },
                { value: "often", label: "Often — I give my reasons" },
              ],
            },
          ],
        },
        {
          id: "content",
          kind: "content",
          blocks: [
            {
              heading: "Why this matters",
              body: "Placeholder tip copy — a conversation where only one side states a view isn't really a conversation; putting your own thinking into words is what makes the exchange real.",
            },
            {
              heading: "One thing to try",
              body: "Placeholder tip copy — before reacting to what they said, state your own position in one sentence first.",
            },
          ],
        },
        {
          id: "practice",
          kind: "practice",
          topic: "Minimum Wage Increase — Should the federal minimum wage be raised to $20/hour?",
          difficulty: "Friendly Cluck",
          maxTurns: 8,
        },
        {
          id: "reflection",
          kind: "reflection",
          prompt: "Placeholder prompt — where in that conversation did you state your own view most clearly, and where did you mostly just react?",
          maxLength: 500,
        },
      ],
    },
  ],
};

/**
 * Skeleton — Busby confirmed no departure from the Participation flow is
 * needed for this skill yet, so this follows the same standard shape.
 */
const REASON_GIVING_MODULE: ModuleConfig = {
  key: "reason-giving",
  skill: "reasonGiving",
  title: "Reason-Giving",
  description: "Back up what you believe with something more than a gut feeling.",
  estimatedMinutes: 10,
  variants: [
    {
      key: "standard",
      steps: [
        {
          id: "diagnostic",
          kind: "diagnostic",
          questions: [
            {
              key: "uses_evidence",
              type: "single-choice",
              prompt: "When you make a political argument, how often do you back it up with a fact, source, or example?",
              options: [
                { value: "rarely", label: "Rarely" },
                { value: "sometimes", label: "Sometimes" },
                { value: "often", label: "Often" },
              ],
            },
            {
              key: "checks_sources",
              type: "single-choice",
              prompt: "How often do you check where a claim actually came from before repeating it?",
              options: [
                { value: "rarely", label: "Rarely" },
                { value: "sometimes", label: "Sometimes" },
                { value: "often", label: "Often" },
              ],
            },
          ],
        },
        {
          id: "content",
          kind: "content",
          blocks: [
            {
              heading: "Why this matters",
              body: "Placeholder tip copy — a claim without a reason is just an opinion shouted louder; giving reasons is what lets someone actually engage with your thinking instead of just your conclusion.",
            },
            {
              heading: "One thing to try",
              body: "Placeholder tip copy — after stating your view, add one concrete reason, example, or piece of evidence for it.",
            },
          ],
        },
        {
          id: "practice",
          kind: "practice",
          topic: "Minimum Wage Increase — Should the federal minimum wage be raised to $20/hour?",
          difficulty: "Friendly Cluck",
          maxTurns: 8,
        },
        {
          id: "reflection",
          kind: "reflection",
          prompt: "Placeholder prompt — which of your points had the strongest reason behind it, and which was closest to just an opinion?",
          maxLength: 500,
        },
      ],
    },
  ],
};

const COGNITIVE_DISSONANCE_MODULE: ModuleConfig = {
  key: "cognitive-dissonance",
  skill: "cognitiveDissonance",
  title: "Cognitive Dissonance",
  description: "Practice accepting contradictory inner views and confronting nuance.",
  estimatedMinutes: 10,
  variants: [
    {
      key: "standard",
      steps: [
        {
          id: "diagnostic",
          kind: "diagnostic",
          questions: [
            {
              key: "strongest_issue",
              type: "single-choice",
              prompt: "About which of the following issues do you feel the most strongly?",
              options: [
                { value: "taxes", label: "Increasing/decreasing taxation" },
                { value: "abortion", label: "Abortion" },
                { value: "dei", label: "DEI initiatives" },
                { value: "climate", label: "Climate policy" },
                { value: "immigration", label: "Immigration enforcement" },
              ],
            },
            {
              key: "issue_stance",
              type: "single-choice",
              prompt: "In favor or against (I know this doesn't make sense yet I need to pipe in the variable)",
              options: [
                { value: "strong_yes", label: "Strongly in favor" },
                { value: "weak_yes", label: "Somewhat in favor" },
                { value: "weak_no", label: "Somewhat against" },
                { value: "strong_no", label: "Strongly against" },
              ],
            },
          ],
        },
        {
          id: "cd_reframing",
          kind: "content",
          blocks: [
            {
              heading: "Cognitive Dissonance",
              body: "Cognitive dissonance, a concept introduced by psychologist Leon Festinger, describes the tension we feel when we encounter ideas, beliefs, or behaviors that don't quite fit together. While this feeling can be uncomfortable at first, it's actually a sign that your mind is doing something valuable: noticing new information and working to make sense of it. When a political conversation leaves you feeling unsettled, that sensation often means you've been exposed to a perspective you hadn't fully considered before. Rather than something to avoid, dissonance can be a signal of learning and growth, an opportunity to sharpen your own views, better understand people who see things differently, and arrive at beliefs that are more thoughtful and well-reasoned. In this way, the discomfort of disagreement isn't a reason to stop talking about politics; it's part of what makes those conversations worthwhile.",
            },
          ],
        },
        {
          id: "reflection",
          kind: "reflection",
          prompt: "Think of a time you heard a political opinion that was different from your own. In a sentence or two, describe something you learned or understood better because of it.",
          maxLength: 500,
        },
        {
          id: "cd_button",
          kind: "content",
          blocks: [
            {
              heading: "Empty header",
              body: "On your screen there’s a blue button. Press it any time you notice even a small moment of emotional discomfort, whether that’s tension, unease, irritation, or a feeling that something doesn’t sit right. Press it as many times as you like. ",
            },
          ],
        },
        {
          id: "cd_practice",
          kind: "practice",
          topic: "Cognitive dissonance practice",
          difficulty: "Friendly Cluck",
          maxTurns: 8,
          addon: "discomfort-button",
        },
        {
          id: "cd_reflection",
          kind: "reflection",
          prompt: "What were you feeling when you pushed the button? Why were you feeling that way?",
          maxLength: 1000,
        },
      ],
    },
  ],
};

export const MODULES: ModuleConfig[] = [
  PARTICIPATION_MODULE,
  LISTENING_MODULE,
  COGNITIVE_DISSONANCE_MODULE,
  SELF_EXPRESSION_MODULE,
  REASON_GIVING_MODULE,
];

export function getModule(key: string): ModuleConfig | undefined {
  return MODULES.find((m) => m.key === key);
}
