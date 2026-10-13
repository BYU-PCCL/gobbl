import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudioAccess, studioDenied } from "@/lib/studio/access";
import { VERSION_NAME_MAX_LENGTH } from "@/lib/studio/types";
import { VERSION_SUMMARY_SELECT, toVersionSummary } from "@/lib/studio/versions";

const HISTORY_LIMIT = 100;

/** A draft's version history, newest first. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await getStudioAccess();
  if (access.status !== "ok") return studioDenied(access);

  const exists = await prisma.studioModule.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  const versions = await prisma.studioModuleVersion.findMany({
    where: { moduleId: params.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: VERSION_SUMMARY_SELECT,
  });
  return NextResponse.json(versions.map(toVersionSummary));
}

/**
 * Names the draft's current saved state, e.g. "Sent to Busby for review". Named versions are
 * kept as they are: later saves start a new version instead of updating them.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const access = await getStudioAccess();
  if (access.status !== "ok") return studioDenied(access);

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > VERSION_NAME_MAX_LENGTH) {
    return NextResponse.json({ error: `Name is required (up to ${VERSION_NAME_MAX_LENGTH} characters)` }, { status: 400 });
  }

  const version = await prisma.$transaction(async (tx) => {
    const draft = await tx.studioModule.findUnique({
      where: { id: params.id },
      select: { title: true, description: true, doc: true },
    });
    if (!draft) return null;
    const latest = await tx.studioModuleVersion.findFirst({
      where: { moduleId: params.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, description: true, doc: true },
    });
    // The newest version normally is the current state already; name it rather than copying it.
    const isCurrent =
      latest &&
      latest.title === draft.title &&
      latest.description === draft.description &&
      JSON.stringify(latest.doc) === JSON.stringify(draft.doc);
    return isCurrent
      ? tx.studioModuleVersion.update({ where: { id: latest.id }, data: { name }, select: VERSION_SUMMARY_SELECT })
      : tx.studioModuleVersion.create({
          data: {
            moduleId: params.id,
            title: draft.title,
            description: draft.description,
            doc: draft.doc ?? {},
            name,
            savedById: access.user.id,
          },
          select: VERSION_SUMMARY_SELECT,
        });
  });

  if (!version) return NextResponse.json({ error: "Module not found" }, { status: 404 });
  return NextResponse.json(toVersionSummary(version), { status: 201 });
}
