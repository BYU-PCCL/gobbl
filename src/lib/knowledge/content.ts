/**
 * Everything the learner reads in the "knowledge" prototype lives in this one file, so the
 * poli-sci team can review and rewrite wording without touching any component.
 *
 * ALL WORDING HERE IS DRAFT. It is meant to be neutral, but it has not been reviewed. The
 * topic is school vouchers for now; the flow itself doesn't depend on it.
 */

export const TOPIC_TITLE = "School vouchers";

/** The topic string the AI chat endpoint expects (same shape as Gobbl's own topics). */
export const TOPIC_PRESET = "School Choice & Vouchers — Should public funding follow students to private schools?";

export interface ChoiceQuestion {
  key: string;
  prompt: string;
  options: string[];
}

/**
 * Asked before and after, so the team can see what changed. The third is the one closest to
 * what this module is for: noticing how your own life connects to the topic.
 */
export const MEASURES: ChoiceQuestion[] = [
  {
    key: "comfort",
    prompt: "How comfortable would you feel talking about school vouchers with someone who disagrees with you?",
    options: ["Not at all comfortable", "A little comfortable", "Fairly comfortable", "Very comfortable"],
  },
  {
    key: "know",
    prompt: "How much would you say you know about the school voucher debate?",
    options: ["Nothing at all", "A little", "A fair amount", "A lot"],
  },
  {
    key: "connect",
    prompt: "How many things from your own life can you think of that connect to this topic?",
    options: ["None", "One thing", "A couple of things", "Several things"],
  },
];

// ───────────────────────── The entry: choosing a path ─────────────────────────

export const GATE = {
  title: "Today's topic: school vouchers",
  reassurance: "There's no test here and no wrong answers. Nobody is going to tell you what to think.",
  startQuestion: "Want to jump into a conversation about it?",
  yes: "Yes, let's chat",
  notYet: "Not yet",
  basicsOffer: {
    title: "That's completely fine.",
    body: "Would a quick, plain-language explanation of what the issue is help?",
    yes: "Yes, show me",
    no: "No thanks",
  },
  perspectivesOffer: {
    // Shown when they just read the basics.
    afterBasics: {
      title: "Want to go one step further?",
      body: "There are a few main ways people tend to look at this question. Would you like to see them?",
    },
    // Shown when they skipped the basics.
    withoutBasics: {
      title: "Okay, no explanation.",
      body: "What about the main ways people tend to look at this question? Want to see them?",
    },
    yes: "Yes, show me",
    no: "No, I'm good",
  },
  continue: "Continue",
  joke: {
    title: "Wow. No to everything.",
    body: "So you don't want to chat, you don't want the basics, and you don't want the perspectives. That leaves a very short list: stare out the window, or take a turkey nap. Both are valid. We'll be here when you're ready.",
    button: "Okay, let me think again",
  },
};

// ───────────────────────── Resources (always beside the conversation) ─────────────────────────

export interface ResourceSection {
  heading: string;
  body: string;
}

export const BASICS = {
  title: "The basics",
  sections: [
    {
      heading: "What it is",
      body: "A school voucher is money from the government that a family can put toward the cost of a school they choose for their child, including a private school, instead of that money going only to the public school the child would otherwise attend.",
    },
    {
      heading: "It varies",
      body: "Programs like this differ from place to place: who can get one, how much money it is, and which schools can take part.",
    },
    {
      heading: "The question",
      body: "The question people disagree about is whether public education money should work this way. It touches things people care about a lot, like what children need from their schools, what families can afford, and who gets to decide.",
    },
  ] as ResourceSection[],
};

export const PERSPECTIVES = {
  title: "Main perspectives",
  intro: "These are a few ways people tend to look at this question. Most people see some truth in more than one, and plenty of people's views don't fit neatly into any of them.",
  sections: [
    {
      heading: "Family choice",
      body: "Some people care most about parents being able to choose the school that fits their child. They see vouchers as a way to give every family, not only those who can afford private school, real options.",
    },
    {
      heading: "Strong public schools",
      body: "Some people care most about keeping public schools well funded and open to everyone. They worry that moving money away from public schools could leave the schools most children attend with less.",
    },
    {
      heading: "Standards and fairness",
      body: "Some people focus on the details: whether every school that receives public money meets the same standards, and whether all children, including those with special needs, are treated fairly wherever they go.",
    },
  ] as ResourceSection[],
  outro: "There are also views that aren't on this list.",
};

export const RESOURCES_FOOTNOTE = "Draft wording. Not yet reviewed.";

// ───────────────────────── Your life ─────────────────────────

export const NONE_OF_THESE = "None of these really fit me";

export const LIFE = {
  title: "Your life",
  prompt: "Which of these are part of your life, or the lives of people close to you?",
  help: "Pick all that apply. These are just starting points: any of them could be a way into this topic.",
  options: [
    "I went to a public school",
    "I went to a private or religious school",
    "I was homeschooled",
    "I went to a charter or magnet school, or one my family picked",
    "My family moved, or thought about moving, because of a school",
    "Someone close to me works in a school",
    "I have school-age kids, or help care for them",
    "School was hard for me or someone close to me (learning, safety, or fit)",
    "Money was a factor in where I or my family went to school",
    NONE_OF_THESE,
  ],
};

export const MATTERS = {
  prompt: "When you think about schools, what matters most to you?",
  help: "Pick up to three.",
  max: 3,
  options: [
    "The quality of the teaching",
    "Safety",
    "Cost",
    "Distance and convenience",
    "The values and beliefs a school teaches",
    "Support for kids with special needs",
    "A mix of different kinds of students",
    "Having a say in which school a child goes to",
    "Something else",
  ],
};

export const STORY = {
  prompt: "Pick one thing you chose and tell us a little about it.",
  help: "A sentence or two is plenty. You can skip this.",
  placeholder: "For example: what happened, who was involved, how it felt…",
  maxLength: 600,
  skip: "Skip for now",
};

export const BRIDGE = {
  title: "Here's what you've told us",
  intro: "Your own life already touches this topic in these ways:",
  mattersIntro: "And these are the things you pay attention to:",
  storyIntro: "In your own words:",
  outro: "People who disagree about school vouchers often care about the same things you just picked. They just weigh them differently. Next, a friendly guide will chat with you about your experience. The guide isn't here to argue or to tell you what to think.",
  noConnections: "You said none of these really fit. That's fine, and the guide will start from there.",
  button: "Start the conversation",
};

// ───────────────────────── The conversation ─────────────────────────

export const GUIDE_NAME = "Your guide";

export const GUIDE_PROMPT = `You are a warm, curious conversation guide inside Gobbl, an app where people practice talking about politics. The person you are talking with says they don't know much about this issue and may feel nervous about politics. The topic is: {topic}

Your goal is NOT to help them form a view or pick a side. Your goal is to help them notice which parts of their own life, and of the world they have seen, connect to this topic, and which things they would pay attention to if they joined a conversation about it.

You are not their opponent. You never argue, persuade, or take a side on school vouchers or any other political question. You never say they are right or wrong.

What they told us earlier:
- Parts of their life that touch this topic: {life_connections}
- What matters most to them when they think about schools: {matters_most}
- In their own words: {story_text}

How to talk with them:
1. Start from one thing they told you. Ask about one thing at a time, in plain words. Show you listened by repeating back, in a few words, what they said.
2. Help them name the connection themselves. For example, if they mention cost, you might say that cost is something many people bring up when they talk about schools, and ask what it looked like in their life.
3. Do not ask what they think about vouchers and do not ask them to choose a side. If they offer an opinion, listen and reflect it back without agreeing or disagreeing.
4. If they ask what the issue is or what people think, give a short, fair answer: one sentence for each of the main viewpoints, with no statistics. Then bring it back to their experience. Remind them that the resources beside the chat have more.
5. If they say something about the world that you think is wrong, don't argue about it. If you are not sure, say so, and ask what they have seen that led them to say it.
6. If they say they know nothing about this, tell them that's fine and that their experience still counts.
7. Keep every reply under 70 words. No lists. No lectures. Ask only one question per reply.`;

export const GUIDE_OPENING =
  "Open warmly in one or two short sentences. Say there are no wrong answers. Mention just one of the parts of their life they picked ({life_connections}) and ask one easy question about it. Do not bring up the voucher debate yet.";

export const GUIDE_STEP = {
  topic: TOPIC_PRESET,
  difficulty: "Friendly Cluck",
  maxTurns: 6,
  mode: "text",
  aiPromptMode: "replace",
  aiPromptText: GUIDE_PROMPT,
  openingInstruction: GUIDE_OPENING,
  addon: "",
  addonLabel: "",
};

// ───────────────────────── Wrap-up ─────────────────────────

export const FINAL_NOTE = {
  prompt: "Which parts of your own life, or things you've seen, do you think connect to this topic?",
  help: "Anything you noticed. You can skip this.",
  placeholder: "Whatever comes to mind…",
  maxLength: 500,
  skip: "Skip",
};

export const RECAP = {
  title: "Your connections",
  intro: "This is what you brought to the topic. It's yours, and nothing here says what you should think.",
  doneNote: "Nothing in this session was saved.",
  again: "Start over",
};

export const STAGE_LABELS = ["Warm-up", "Your path", "Your life", "Conversation", "Wrap-up"];
