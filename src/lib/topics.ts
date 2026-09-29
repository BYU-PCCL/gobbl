export interface Topic {
  id: string;
  title: string;
  description: string;
  category: string;
  prompt: string;
}

export const CATEGORIES = [
  "Economy",
  "Healthcare",
  "Immigration",
  "Climate",
  "Education",
  "Technology",
  "Justice",
  "Civil Rights",
] as const;

export const TOPICS: Topic[] = [
  {
    id: "min-wage",
    title: "Minimum Wage Increase",
    description: "Should the federal minimum wage be raised to $20/hour?",
    category: "Economy",
    prompt:
      "The federal minimum wage should be raised to $20/hour. This would help millions of workers afford basic necessities and reduce income inequality.",
  },
  {
    id: "universal-healthcare",
    title: "Universal Healthcare",
    description: "Should the US adopt a single-payer healthcare system?",
    category: "Healthcare",
    prompt:
      "The United States should adopt a single-payer healthcare system similar to those in Canada or the UK. Everyone deserves access to healthcare regardless of employment status.",
  },
  {
    id: "immigration-policy",
    title: "Immigration Reform",
    description: "How should we reform the immigration system?",
    category: "Immigration",
    prompt:
      "We need comprehensive immigration reform that includes a path to citizenship for undocumented immigrants who have been contributing to our communities for years.",
  },
  {
    id: "climate-action",
    title: "Climate Policy",
    description:
      "How aggressively should we pursue carbon emission reductions?",
    category: "Climate",
    prompt:
      "We should implement aggressive carbon emission targets and transition fully to renewable energy within the next 15 years, even if it means higher energy costs in the short term.",
  },
  {
    id: "school-choice",
    title: "School Choice & Vouchers",
    description: "Should public funding follow students to private schools?",
    category: "Education",
    prompt:
      "Parents should have the right to use public education funding to send their children to the school of their choice, including private and charter schools.",
  },
  {
    id: "ai-regulation",
    title: "AI Regulation",
    description: "How should governments regulate artificial intelligence?",
    category: "Technology",
    prompt:
      "Governments should implement strict regulations on AI development and deployment to prevent job displacement and ensure safety, even if it slows innovation.",
  },
  {
    id: "criminal-justice",
    title: "Criminal Justice Reform",
    description:
      "Should we focus more on rehabilitation or punishment in our justice system?",
    category: "Justice",
    prompt:
      "Our criminal justice system should prioritize rehabilitation over punishment. Reducing mandatory minimums and investing in education programs within prisons would lower recidivism.",
  },
  {
    id: "gun-policy",
    title: "Gun Policy",
    description:
      "What is the right balance between gun rights and public safety?",
    category: "Justice",
    prompt:
      "We need stricter background checks and waiting periods for all firearm purchases to reduce gun violence while still respecting the Second Amendment.",
  },
  {
    id: "housing-crisis",
    title: "Housing Affordability",
    description: "How should we address the housing affordability crisis?",
    category: "Economy",
    prompt:
      "Cities should significantly relax zoning regulations and build more high-density housing to address the affordability crisis, even in traditionally single-family neighborhoods.",
  },
  {
    id: "social-media",
    title: "Social Media Regulation",
    description: "Should the government regulate social media platforms?",
    category: "Technology",
    prompt:
      "Social media companies should be legally required to verify user ages and restrict access for minors under 16 to protect children's mental health.",
  },
  {
    id: "student-debt",
    title: "Student Debt Relief",
    description: "Should the government forgive student loan debt?",
    category: "Education",
    prompt:
      "The federal government should forgive a significant portion of student loan debt to help a generation burdened by education costs they were told were necessary.",
  },
  {
    id: "affirmative-action",
    title: "Affirmative Action in Admissions",
    description: "Should colleges be able to consider race in admissions?",
    category: "Civil Rights",
    prompt:
      "Colleges and universities should be allowed to consider race as one factor in admissions to maintain diverse student bodies and address the lasting effects of historical discrimination.",
  },
  {
    id: "drug-policy",
    title: "Drug Decriminalization",
    description: "Should drug possession be decriminalized?",
    category: "Justice",
    prompt:
      "Personal drug possession should be decriminalized and treated as a public health issue rather than a criminal one. Portugal's model has shown this approach works.",
  },
];

/** Neutral label for storage and AI — not the one-sided `prompt` paragraph. */
export function formatTopicForDebate(t: Topic): string {
  return `${t.title} — ${t.description}`;
}

export function getDailyTopic(): Topic {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return TOPICS[dayOfYear % TOPICS.length];
}

export function getRandomTopic(): Topic {
  return TOPICS[Math.floor(Math.random() * TOPICS.length)];
}

export function getTopicsByCategory(category: string): Topic[] {
  return TOPICS.filter((t) => t.category === category);
}
