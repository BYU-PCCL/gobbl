import type { TurkeySkillKey } from "./skills";

export type SchoolStep = { ask: string; chips: string[]; reply: string };

/** Scripted School lessons: the turkey asks, you teach, it replies. Three steps per skill. */
export const SCHOOL_SCRIPTS: Record<TurkeySkillKey, SchoolStep[]> = {
  participation: [
    {
      ask: "Gobble! My teacher says I should join the conversation. Why does that matter?",
      chips: ["Every voice adds something new", "Quiet groups miss good ideas"],
      reply: "So my voice could help the whole flock? I never thought of it that way!",
    },
    {
      ask: "But I get nervous. How do I start talking?",
      chips: ["Start small with a short comment", "Ask a question about what was said"],
      reply: "A small peep first. I can do a small peep!",
    },
    {
      ask: "What if I say something and nobody answers?",
      chips: ["Try again with a follow-up thought", "Give it a moment, then ask them"],
      reply: "Don't give up, got it. I feel braver already!",
    },
  ],
  listening: [
    {
      ask: "Gobble! My teacher said I need to learn active listening. What is that?",
      chips: ["Really paying attention to someone", "Listening with your whole body and mind"],
      reply: "So it's more than just hearing the words? I think I get it!",
    },
    {
      ask: "How can my friends tell I'm actually listening?",
      chips: ["Look at them and nod along", "Repeat back what they said in your own words"],
      reply: "Nodding and looking at them. I can do that with my big turkey eyes!",
    },
    {
      ask: "What should I do if I don't understand what my friend means?",
      chips: ["Ask a question to clarify", "Say: Do you mean this or that?"],
      reply: "Ask instead of guessing! Now I feel so much smarter.",
    },
  ],
  selfExpression: [
    {
      ask: "Gobble! How do I say what I really think without upsetting anyone?",
      chips: ["Be honest and stay kind", "Use I statements about your own view"],
      reply: "Honest and kind, both at once. That sounds tricky but good!",
    },
    {
      ask: "What is an I statement? It sounds important.",
      chips: ["Saying I think or I feel first", "Talking about your view, not blaming"],
      reply: "I feel happy when I get corn. Is that one? I think it is!",
    },
    {
      ask: "What if my friend disagrees with me?",
      chips: ["Stay calm and explain more", "Say it's okay to see it differently"],
      reply: "We can disagree and still be friends. I like that a lot.",
    },
  ],
  reasonGiving: [
    {
      ask: "Gobble! My friend said I should give reasons. What is a reason?",
      chips: ["The why behind what you believe", "Something that supports your point"],
      reply: "So it's the because part! I like corn because it's yummy!",
    },
    {
      ask: "What makes a reason a good one?",
      chips: ["Others can understand and weigh it", "It is true and relates to the topic"],
      reply: "Yummy might not be enough for the whole flock. I'll think harder!",
    },
    {
      ask: "Should I give lots of reasons or just one?",
      chips: ["One strong reason beats many weak ones", "A few clear reasons are enough"],
      reply: "Strong and clear. Quality over quantity. Got it!",
    },
  ],
  cognitiveDissonance: [
    {
      ask: "Gobble! Sometimes an idea makes my feathers feel prickly. Why is that?",
      chips: ["It challenges something you believe", "Your mind dislikes being in conflict"],
      reply: "Oh! So the prickly feeling is my mind stretching. Interesting!",
    },
    {
      ask: "What should I do when I feel that prickly feeling?",
      chips: ["Pause and stay curious", "Ask why the idea feels uncomfortable"],
      reply: "Pause and wonder instead of getting defensive. I'll try that!",
    },
    {
      ask: "Does changing my mind mean I lost?",
      chips: ["No, learning something is a win", "It shows you are open and honest"],
      reply: "Changing my mind means I grew! That feels pretty good.",
    },
  ],
  selfInterrogation: [
    {
      ask: "Gobble! My teacher says to question my own beliefs. Isn't that strange?",
      chips: ["It helps you understand yourself", "It makes your beliefs stronger"],
      reply: "So asking myself questions makes me wiser? Neat!",
    },
    {
      ask: "What kind of question should I ask myself?",
      chips: ["Why do I believe this", "What would change my mind"],
      reply: "Why and what-if. Those are good ones to keep in my pocket!",
    },
    {
      ask: "How do I know if my belief is really mine?",
      chips: ["Check if I can explain it myself", "Notice where the idea came from"],
      reply: "I'll remember to check where my ideas come from. Thank you, teacher!",
    },
  ],
};
