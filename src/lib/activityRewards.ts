import { prisma } from "@/lib/db";
import { toTurkeyView, type TurkeyView } from "@/lib/flock/view";
import { stageForActivityCount } from "@/lib/flock/growth";
import { activityDone } from "@/lib/flock/progressQueries";

/** The turkey linked to a Feed or Park activity (by the debate / lesson id), as it is right now. */
export async function linkedTurkeyStage(refId: string): Promise<number | null> {
  const link = await prisma.turkeyActivity.findUnique({
    where: { refId },
    select: { turkey: { select: { activityCount: true, hatchedAt: true } } },
  });
  if (!link) return null;
  return stageForActivityCount(link.turkey.activityCount, link.turkey.hatchedAt !== null);
}

/** The linked turkey after the activity was completed, drawn as the client sees it. */
export async function linkedTurkeyView(refId: string): Promise<TurkeyView | null> {
  const link = await prisma.turkeyActivity.findUnique({ where: { refId }, select: { turkey: true } });
  if (!link) return null;
  try {
    return toTurkeyView(link.turkey, new Date(), await activityDone(link.turkey.id));
  } catch (e) {
    console.error("linkedTurkeyView failed", e);
    return null;
  }
}
