import { TOPICS, type Topic } from "./topics";

/**
 * The Daily Gobble is anchored to the UTC calendar day on the server, so every
 * client (web, iOS) sees the same topic and the once-per-day rule is enforced in
 * one place. `/api/config` publishes today's topic; `/api/debates` overrides any
 * client-sent topic for `isDaily` debates with this one.
 */

/** Day-of-year (UTC) → topic, same rotation the web used to compute locally. */
export function getDailyTopicForDate(date: Date): Topic {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - startOfYear) / 86_400_000);
  return TOPICS[dayOfYear % TOPICS.length];
}

/** [start, end) of the UTC day containing `date`. */
export function utcDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start.getTime() + 86_400_000);
  return { start, end };
}

/** "YYYY-MM-DD" in UTC; the day the daily topic belongs to. */
export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
