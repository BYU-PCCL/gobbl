import type { ModuleConfig } from "./types";

/**
 * The five skill modules. Each is a short flow of steps (see types.ts): a quick
 * self-check, a page or two of guidance, a practice conversation with an AI
 * partner, and a reflection. Content lives here in code; the practice partner's
 * extra instructions, if any, live in ai-config.ts so they never reach the browser.
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
              body: "The hardest part of a political conversation is often just staying in it. When things get tense, most of us either go quiet or find a reason to leave, and the conversation ends before anyone has understood anyone. Staying in the room, even when it's uncomfortable, is the skill every other skill depends on.",
            },
            {
              heading: "One thing to try",
              body: "When you feel the urge to shut down or bail, slow down and name one thing in what they said that you can honestly agree with, even if it's small. It doesn't mean you've conceded anything. It keeps you engaged long enough to say what you actually think.",
            },
          ],
        },
        {
          id: "practice",
          kind: "practice",
          topic: "Should the federal minimum wage be raised to $20 an hour?",
          difficulty: "Friendly Cluck",
          maxTurns: 8,
        },
        {
          id: "reflection",
          kind: "reflection",
          prompt: "At what point did you most want to drop out of that conversation, and what kept you in it?",
          maxLength: 500,
        },
      ],
    },
  ],
};

/**
 * Listening is trained two ways: watching someone else be listened to well
 * (the "observe" content step), then doing it yourself in the practice chat.
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
              body: "Maya: I just think stricter immigration enforcement is the only way to keep things fair for the people who wait their turn.\nJordan: So for you it's mostly about fairness to the people who went through the process, not about keeping people out?\nMaya: Yeah, exactly. My cousin waited nine years.\nJordan: That's a long time. I think I'd feel the same way in her shoes. Where I land differently is on what enforcement should look like, because some of it hits families who've been here for decades.\nMaya: Okay. That part I can at least talk about.",
            },
            {
              heading: "What to notice",
              body: "Jordan doesn't jump to a counterargument. First he checks that he understood what Maya actually cares about, and she confirms it. Only then does he say where he disagrees. That pause to restate and check is what this module trains: it tells the other person they were heard, and it usually tells you something you would have missed.",
            },
          ],
        },
        {
          id: "practice",
          kind: "practice",
          topic: "Should social media platforms be required to verify users' ages?",
          difficulty: "Friendly Cluck",
          maxTurns: 8,
        },
        {
          id: "reflection",
          kind: "reflection",
          prompt: "Compare that exchange with the conversation you just had. Where did you restate or check what your partner meant before responding, and where did you go straight to your reply?",
          maxLength: 500,
        },
      ],
    },
  ],
};

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
              body: "A conversation where only one person states a view isn't really a conversation; it's a reaction. When all you do is push back on what someone else said, they learn nothing about what you actually think, and neither do you. Putting your own position into plain words gives the other person something real to engage with.",
            },
            {
              heading: "One thing to try",
              body: "Before you respond to anything they said, state your own position on the issue in a single sentence. Then react. Leading with your view instead of a rebuttal changes the whole shape of the exchange.",
            },
          ],
        },
        {
          id: "practice",
          kind: "practice",
          topic: "Should voting be mandatory in national elections?",
          difficulty: "Friendly Cluck",
          maxTurns: 8,
        },
        {
          id: "reflection",
          kind: "reflection",
          prompt: "Where in that conversation did you state your own view most clearly, and where did you mostly just react to your partner?",
          maxLength: 500,
        },
      ],
    },
  ],
};

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
              body: "A claim without a reason is just an opinion said louder. Reasons let someone engage with your thinking instead of only your conclusion, and they're what make it possible to change a mind, including your own. Most of the time the reason is already in your head; you just skipped saying it.",
            },
            {
              heading: "One thing to try",
              body: "After you state a view, add one concrete reason for it: an example, a number you're fairly sure of, or something you've seen happen. One good reason beats three vague ones. If you can't think of one, that's worth noticing too.",
            },
          ],
        },
        {
          id: "practice",
          kind: "practice",
          topic: "Should college tuition at public universities be free?",
          difficulty: "Friendly Cluck",
          maxTurns: 8,
        },
        {
          id: "reflection",
          kind: "reflection",
          prompt: "Which of your points had the strongest reason behind it, and which one was closest to just an opinion?",
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
              prompt: "How do you feel about the issue you just picked?",
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
              heading: "Notice the discomfort",
              body: "During the next conversation, pay attention to your own reactions. Any time you notice even a small moment of tension, unease, irritation, or a sense that something doesn't sit right, make a mental note of it: what your partner said, and what you felt. You'll be asked about those moments afterwards. The point isn't to avoid the feeling; it's to catch it while it's happening.",
            },
          ],
        },
        {
          id: "cd_practice",
          kind: "practice",
          topic: "Should the government do more to reduce income inequality?",
          difficulty: "Friendly Cluck",
          maxTurns: 8,
        },
        {
          id: "cd_reflection",
          kind: "reflection",
          prompt: "What moments in that conversation made you uncomfortable, and what do you think was behind the feeling?",
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
