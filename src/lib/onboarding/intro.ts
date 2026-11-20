/**
 * The three things a new person needs to know about Gobbl. Shown on the landing page
 * and again as the first screens of onboarding, so someone who skipped the landing
 * page still learns what the app is for.
 */
export interface IntroPoint {
  title: string;
  body: string;
}

export const INTRO_POINTS: IntroPoint[] = [
  {
    title: "Talk with someone who disagrees",
    body: "Your AI partner holds the opposite view on the topic you pick, and pushes back as hard as you choose.",
  },
  {
    title: "Get scored on civility, not winning",
    body: "Every message is scored on staying engaged, giving your reasons, listening to the other side, and questioning your own view.",
  },
  {
    title: "Grow your turkey",
    body: "XP from good conversations evolves your turkey through eight stages. Feathers buy it an outfit.",
  },
];
