import "server-only";

import type { Prisma } from "@prisma/client";
import { parseStudioDoc, type StudioVersionSummary, type StudioVariantKey } from "./types";

/**
 * Saves by the same person less than this long after their last version started update that
 * version instead of adding one, so history reads as editing sessions rather than keystrokes.
 */
const SESSION_MS = 10 * 60 * 1000;

interface Snapshot {
  id: string;
  title: string;
  description: string;
  doc: Prisma.JsonValue;
}

/**
 * Records `draft`'s current state in its history. Call inside the transaction that saved it,
 * so the newest version always matches the draft.
 *
 * `forceNew` starts a new version even mid-session, e.g. right after restoring an old one, so
 * the state before the restore stays in history.
 */
export async function recordVersion(
  tx: Prisma.TransactionClient,
  draft: Snapshot,
  userId: string,
  { forceNew = false }: { forceNew?: boolean } = {},
): Promise<void> {
  const content = {
    title: draft.title,
    description: draft.description,
    doc: draft.doc as Prisma.InputJsonValue,
  };
  const latest = await tx.studioModuleVersion.findFirst({
    where: { moduleId: draft.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, savedById: true, createdAt: true },
  });
  const sameSession =
    !forceNew &&
    latest !== null &&
    latest.name === null &&
    latest.savedById === userId &&
    Date.now() - latest.createdAt.getTime() < SESSION_MS;

  if (sameSession) {
    await tx.studioModuleVersion.update({ where: { id: latest.id }, data: content });
  } else {
    await tx.studioModuleVersion.create({ data: { ...content, moduleId: draft.id, savedById: userId } });
  }
}

export const VERSION_SUMMARY_SELECT = {
  id: true,
  name: true,
  title: true,
  doc: true,
  createdAt: true,
  updatedAt: true,
  savedBy: { select: { username: true } },
} satisfies Prisma.StudioModuleVersionSelect;

type VersionRow = Prisma.StudioModuleVersionGetPayload<{ select: typeof VERSION_SUMMARY_SELECT }>;

export function toVersionSummary(v: VersionRow): StudioVersionSummary {
  const doc = parseStudioDoc(v.doc);
  const stepCounts: Partial<Record<StudioVariantKey, number>> = {};
  for (const variant of doc?.variants ?? []) stepCounts[variant.key] = variant.steps.length;
  return {
    id: v.id,
    name: v.name,
    title: v.title,
    savedBy: v.savedBy.username,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
    stepCounts,
  };
}
