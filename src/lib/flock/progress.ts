/**
 * The order a turkey's activities open in: Feed first, then School, then Park.
 * School and Park are no help before the lesson has been learned, so each opens once the one
 * before it has been done once. After that all three stay open.
 */
export type ActivityDone = { feed: boolean; school: boolean };
export type Unlocked = { school: boolean; park: boolean };

export const NOTHING_DONE: ActivityDone = { feed: false, school: false };

export function unlockedFor(hatched: boolean, done: ActivityDone): Unlocked {
  const school = hatched && done.feed;
  return { school, park: school && done.school };
}

/** What to do next on the way to Park, or null once everything is open. */
export function nextStep(hatched: boolean, done: ActivityDone): "feed" | "school" | null {
  if (!hatched || !done.feed) return "feed";
  if (!done.school) return "school";
  return null;
}

/**
 * What an activity's end screen should offer next. Finishing Feed opens School and finishing
 * School opens the Park, so those lead on; after the Park the next thing is another chat.
 */
export function followUp(finished: "feed" | "school" | "park"): "school" | "park" {
  return finished === "feed" ? "school" : "park";
}
