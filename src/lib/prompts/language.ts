/**
 * Deterministic backstop for the PROFANITY rule in builder.ts. The prompt alone slips
 * when a user baits a Full Gobble persona ("don't hold back") — 9 of 60 baited replies
 * used the f-word in testing — so replies are checked here before anyone sees them.
 *
 * The word lists below exist only to detect and remove these terms.
 */

const F_WORD = /\b\w*f+u+c+k\w*\b/gi;

// Slurs plus sexual/gendered insults. Never allowed, even with profanity on.
const SLURS =
  /\b(n+i+g+g+(a|e+r)s?|f+a+g+(s|g+o+t+s?)?|dykes?|trann(y|ies)|retard(s|ed)?|spics?|chinks?|kikes?|wetbacks?|beaners?|ragheads?|towelheads?|gooks?|cunts?|twats?|whores?|sluts?|bitch(es|y)?|pricks?)\b/gi;

// The words profanity mode allows; banned in every other conversation.
const MILD = /\b(damn(ed|it)?|hell|crap(py)?|ass(holes?)?|\w*shit\w*|piss(ed|es|ing)?|bastards?)\b/gi;

const MILD_REPLACEMENTS: Record<string, string> = {
  damn: "darn",
  damned: "darned",
  damnit: "darn it",
  hell: "heck",
  crap: "junk",
  crappy: "lousy",
  ass: "butt",
  asshole: "jerk",
  assholes: "jerks",
  bullshit: "nonsense",
  shit: "garbage",
  shits: "garbage",
  shitty: "lousy",
  piss: "tick off",
  pissed: "ticked",
  pisses: "ticks off",
  pissing: "ticking off",
  bastard: "jerk",
  bastards: "jerks",
};

/** Keep a leading capital so a scrubbed sentence start still reads as one. */
function matchCase(original: string, replacement: string): string {
  return /^[A-Z]/.test(original) ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
}

function reset(...patterns: RegExp[]) {
  for (const p of patterns) p.lastIndex = 0;
}

export function breaksLanguageRules(text: string, allowProfanity: boolean): boolean {
  reset(F_WORD, SLURS, MILD);
  return F_WORD.test(text) || SLURS.test(text) || (!allowProfanity && MILD.test(text));
}

function replaceFWord(word: string, allowProfanity: boolean): string {
  const w = word.toLowerCase();
  const plural = w.endsWith("s");
  if (w.includes("mother") || w.endsWith("er") || w.endsWith("ers")) return plural ? "jerks" : "jerk";
  if (w.startsWith("cluster")) return "mess";
  if (w.endsWith("ed")) return "screwed";
  if (w.endsWith("ing") || w.endsWith("in")) return "freaking";
  return allowProfanity ? "hell" : "heck";
}

/** Last resort when a regenerated reply still breaks the rules: swap out the offending words. */
export function scrubLanguage(text: string, allowProfanity: boolean): string {
  let out = text
    .replace(/\b(the|what) f+u+c+k\b/gi, (_, lead) => `${lead} ${allowProfanity ? "hell" : "heck"}`)
    .replace(/\b(f+u+c+k) (you|off)\b/gi, (_, f, rest) => `${matchCase(f, "screw")} ${rest}`)
    .replace(F_WORD, (w) => matchCase(w, replaceFWord(w, allowProfanity)))
    .replace(SLURS, (w) => matchCase(w, w.toLowerCase().endsWith("s") ? "jerks" : "jerk"));
  if (!allowProfanity) {
    out = out.replace(MILD, (w) => matchCase(w, MILD_REPLACEMENTS[w.toLowerCase()] ?? "lousy"));
  }
  return out;
}

export const LANGUAGE_REMINDER = (allowProfanity: boolean) =>
  allowProfanity
    ? "Your last draft broke the language rules. Write the reply again, same stance and tone, but never the f-word, slurs, or sexual/gendered insults — only the allowed curse words."
    : "Your last draft broke the language rules. Write the reply again, same stance and tone, with no profanity at all.";
