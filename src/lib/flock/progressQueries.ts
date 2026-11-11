import { prisma } from "@/lib/db";
import { NOTHING_DONE, type ActivityDone } from "./progress";

/** Which of Feed and School each turkey has completed at least once. */
export async function activityDoneFor(turkeyIds: string[]): Promise<Map<string, ActivityDone>> {
  const out = new Map<string, ActivityDone>();
  if (turkeyIds.length === 0) return out;
  const rows = await prisma.turkeyActivity.groupBy({
    by: ["turkeyId", "kind"],
    where: { turkeyId: { in: turkeyIds }, kind: { in: ["feed", "school"] }, completedAt: { not: null } },
    _count: { _all: true },
  });
  for (const r of rows) {
    const cur = out.get(r.turkeyId) ?? { ...NOTHING_DONE };
    if (r.kind === "feed") cur.feed = true;
    if (r.kind === "school") cur.school = true;
    out.set(r.turkeyId, cur);
  }
  return out;
}

export async function activityDone(turkeyId: string): Promise<ActivityDone> {
  return (await activityDoneFor([turkeyId])).get(turkeyId) ?? { ...NOTHING_DONE };
}
