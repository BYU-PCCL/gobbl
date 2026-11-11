import "server-only";
import { prisma } from "@/lib/db";

/**
 * Link a park debate or feed module run to a turkey the user owns. Park needs a hatched
 * turkey; feed also accepts an egg, because the first egg hatches by passing a module quiz.
 * Silently does nothing if `turkeyId` isn't one (the debate/module still works without a turkey).
 */
export async function startActivity(args: {
  userId: string;
  turkeyId: unknown;
  kind: "park" | "feed";
  refId: string;
}): Promise<void> {
  const { userId, turkeyId, kind, refId } = args;
  if (typeof turkeyId !== "string" || turkeyId.length === 0) return;
  const turkey = await prisma.turkey.findFirst({
    where: { id: turkeyId, userId, ...(kind === "feed" ? {} : { hatchedAt: { not: null } }) },
    select: { id: true },
  });
  if (!turkey) return;
  await prisma.turkeyActivity.upsert({
    where: { refId },
    create: { turkeyId: turkey.id, kind, refId },
    update: { turkeyId: turkey.id },
  });
}

/** Finish a linked activity. No-op if there is no link or it was already completed. */
export async function completeActivity(args: {
  refId: string;
  score: number | null;
  feathers: number;
  counts: boolean;
}): Promise<void> {
  const { refId, score, feathers, counts } = args;
  await prisma.$transaction(async (tx) => {
    const now = new Date();
    const claimed = await tx.turkeyActivity.updateMany({
      where: { refId, completedAt: null },
      data: { completedAt: now, score, feathers, counted: counts },
    });
    if (claimed.count === 0 || !counts) return;
    const activity = await tx.turkeyActivity.findUnique({
      where: { refId },
      select: { turkeyId: true, kind: true },
    });
    if (!activity) return;
    await tx.turkey.update({
      where: { id: activity.turkeyId },
      data: {
        activityCount: { increment: 1 },
        ...(activity.kind === "park" ? { lastSocialAt: now } : { lastFedAt: now }),
      },
    });
  });
}
