import "server-only";
import { prisma } from "@/lib/db";

const asObject = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/** True once the user has passed any module's Teach quiz (stored per step in SkillSession.stepResponses). */
export async function hasPassedQuiz(userId: string): Promise<boolean> {
  const sessions = await prisma.skillSession.findMany({
    where: { userId },
    select: { stepResponses: true },
  });
  return sessions.some((s) =>
    Object.values(asObject(s.stepResponses)).some((step) => asObject(step).passed === true),
  );
}

/**
 * The first egg hatches by passing a quiz; eggs bought later hatch by tapping.
 * So hatching is allowed once the user either owns a hatched turkey or has passed a quiz.
 */
export async function canHatch(userId: string): Promise<boolean> {
  const hatched = await prisma.turkey.count({ where: { userId, hatchedAt: { not: null } } });
  if (hatched > 0) return true;
  return hasPassedQuiz(userId);
}
