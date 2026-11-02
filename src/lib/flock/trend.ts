import { TREND_WINDOW } from "./config";

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** `scores` is oldest to newest. */
export function skillTrend(scores: number[]) {
  const points = scores.slice(-TREND_WINDOW);
  const half = Math.floor(points.length / 2);
  const earlierAvg = avg(points.slice(0, half));
  const recentAvg = avg(points.slice(half));
  const delta = earlierAvg === null || recentAvg === null ? null : recentAvg - earlierAvg;
  return { points, earlierAvg, recentAvg, delta };
}
