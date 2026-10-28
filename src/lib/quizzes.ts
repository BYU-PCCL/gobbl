/**
 * "Teach" quizzes: three multiple-choice questions per module, asked by the turkey.
 * Passing (>= QUIZ_PASS correct) hatches the egg the first time and teaches the module's move.
 * Content is ported verbatim from the Gobbl Hatch prototype.
 */
export interface QuizQuestion {
  /** The turkey's question, phrased as it asking the user to explain the lesson. */
  q: string;
  options: [string, string, string, string];
  /** Index of the correct option. */
  answer: 0 | 1 | 2 | 3;
  /** Shown after answering, right or wrong. */
  why: string;
}

export const QUIZ_PASS = 2;

/** Keyed by ModuleConfig.key. Ported verbatim from the prototype. */
export const QUIZZES: Record<string, QuizQuestion[]> = {
    'participation': [
      {
        q: "So when I feel like bailing on a tense talk, what do I do?",
        options: [
          "Name one thing they said that I can honestly agree with, even a small one.",
          "State my own position in a single sentence and then react.",
          "Add one concrete reason with a number I trust.",
          "Say back what they care about and check I got it right."
        ],
        answer: 0,
        why: "Naming one honest point of agreement keeps you in the room long enough to say what you actually think."
      },
      {
        q: "If I agree with one small thing, have I given in?",
        options: [
          "Yes, now they have the upper hand.",
          "No, it doesn't concede anything. It keeps me engaged.",
          "Yes, but only if I say it out loud.",
          "No, because it makes them go quiet."
        ],
        answer: 1,
        why: "Agreeing with a small piece is not conceding. It just keeps you in the conversation."
      },
      {
        q: "What's the hardest part of a political conversation, really?",
        options: [
          "Finding the perfect statistic.",
          "Getting the last word.",
          "Just staying in it when it gets tense.",
          "Knowing every fact before you start."
        ],
        answer: 2,
        why: "Most of us go quiet or find a reason to leave, so staying in the room is the skill everything else depends on."
      }
    ],
    'active-listening': [
      {
        q: "What did Jordan do before he said where he disagreed with Maya?",
        options: [
          "He gave his counterargument right away.",
          "He changed the subject to something easier.",
          "He told her what enforcement should look like.",
          "He checked he understood what she cared about, and she confirmed it."
        ],
        answer: 3,
        why: "Jordan restated Maya's point about fairness and let her confirm it before he shared his own view."
      },
      {
        q: "What does restating and checking tell the other person?",
        options: [
          "That they were heard, and it often shows me something I'd have missed.",
          "That I've already decided they're wrong.",
          "That I'm out of things to say.",
          "That I agree with everything they said."
        ],
        answer: 0,
        why: "The pause to restate and check tells someone they were heard, and it usually teaches you something."
      },
      {
        q: "When is the right moment to say where I disagree?",
        options: [
          "The second I spot a flaw.",
          "After I've checked I understood them and they've confirmed it.",
          "After I've given three reasons of my own.",
          "Only once I've found something to agree with."
        ],
        answer: 1,
        why: "In the exchange, the disagreement came only after the check. That order is what the module trains."
      }
    ],
    'self-expression': [
      {
        q: "What should I do before I respond to anything they said?",
        options: [
          "Name something I agree with.",
          "Look for the weak spot in their argument.",
          "State my own position on the issue in a single sentence.",
          "Ask them three questions."
        ],
        answer: 2,
        why: "Lead with your view in one sentence, then react. It changes the whole shape of the exchange."
      },
      {
        q: "Why isn't it enough to just push back on what they said?",
        options: [
          "It makes them angry.",
          "It takes too long.",
          "It sounds too confident.",
          "They learn nothing about what I think, and neither do I."
        ],
        answer: 3,
        why: "A conversation where you only react isn't really a conversation. Your own position gives them something real to engage with."
      },
      {
        q: "What does stating my view in plain words give the other person?",
        options: [
          "A list of facts to check.",
          "Something real to engage with.",
          "A reason to stop talking.",
          "A way to guess what I'll say next."
        ],
        answer: 1,
        why: "Plain words about your own position give the other person something real to respond to."
      }
    ],
    'reason-giving': [
      {
        q: "After I state a view, what should I add?",
        options: [
          "One concrete reason: an example, a number I'm fairly sure of, or something I've seen.",
          "A louder version of the same claim.",
          "A question about their sources.",
          "A sentence saying I could be wrong."
        ],
        answer: 0,
        why: "One concrete reason lets someone engage with your thinking and not only your conclusion."
      },
      {
        q: "Wouldn't three reasons beat one?",
        options: [
          "Yes, always bring a big list.",
          "Only if they come from a news source.",
          "No, one good reason beats three vague ones.",
          "Yes, as long as I say them quickly."
        ],
        answer: 2,
        why: "One good reason beats three vague ones."
      },
      {
        q: "What if I can't think of a single reason for my view?",
        options: [
          "Say it again with more confidence.",
          "Change the subject.",
          "Quote someone else's opinion.",
          "That's worth noticing too. The reason may be in my head already, just unsaid."
        ],
        answer: 3,
        why: "If you can't find a reason, that is worth noticing. Most of the time the reason is there and you skipped saying it."
      }
    ],
    'cognitive-dissonance': [
      {
        q: "A chat leaves me feeling unsettled. What might that mean?",
        options: [
          "I should leave and not come back.",
          "My mind is noticing new information and working to make sense of it.",
          "The other person was being unfair.",
          "I need to state my view more firmly."
        ],
        answer: 1,
        why: "Dissonance is a sign your mind is taking in something new. It can be a signal of learning, not a reason to stop."
      },
      {
        q: "What do I do with the discomfort in my next conversation?",
        options: [
          "Push it away so I can keep talking.",
          "Wait until it's over and forget about it.",
          "Notice it as it happens and note what they said and what I felt.",
          "Tell them they made me uncomfortable."
        ],
        answer: 2,
        why: "The point isn't to avoid the feeling. It's to catch it while it's happening and remember what triggered it."
      },
      {
        q: "So what exactly is cognitive dissonance?",
        options: [
          "Being unable to make up my mind.",
          "Forgetting what I believed yesterday.",
          "Losing an argument badly.",
          "The tension I feel when ideas, beliefs, or behaviors don't quite fit together."
        ],
        answer: 3,
        why: "Leon Festinger described it as the tension we feel when things don't fit together, and it can sharpen our views."
      }
    ]
};

export function quizFor(moduleKey: string): QuizQuestion[] {
  return QUIZZES[moduleKey] ?? [];
}
