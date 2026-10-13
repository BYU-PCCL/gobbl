import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getStudioAccess, studioDenied } from "@/lib/studio/access";
import { recordVersion } from "@/lib/studio/versions";
import { TITLE_MAX_LENGTH, emptyDoc, parseStudioDoc, type StudioModuleSummary } from "@/lib/studio/types";

export async function GET() {
  const access = await getStudioAccess();
  if (access.status !== "ok") return studioDenied(access);

  // Drafts are shared: every Studio user sees every draft.
  const modules = await prisma.studioModule.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      updatedAt: true,
      createdBy: { select: { username: true } },
      lastEditedBy: { select: { username: true } },
    },
  });

  const body: StudioModuleSummary[] = modules.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    createdBy: m.createdBy.username,
    lastEditedBy: m.lastEditedBy?.username ?? null,
    updatedAt: m.updatedAt.toISOString(),
  }));
  return NextResponse.json(body);
}

/**
 * Creates a draft: an empty one titled `title`, or, with `duplicateOf`, a copy of that draft
 * (its current content, not its history) titled `title` or "Copy of …".
 */
export async function POST(req: Request) {
  const access = await getStudioAccess();
  if (access.status !== "ok") return studioDenied(access);

  const body = await req.json().catch(() => null);
  let title = typeof body?.title === "string" ? body.title.trim() : "";
  let description = "";
  let doc: Prisma.InputJsonValue = emptyDoc() as unknown as Prisma.InputJsonValue;

  if (body?.duplicateOf !== undefined) {
    const source =
      typeof body.duplicateOf === "string"
        ? await prisma.studioModule.findUnique({
            where: { id: body.duplicateOf },
            select: { title: true, description: true, doc: true },
          })
        : null;
    if (!source) return NextResponse.json({ error: "Module not found" }, { status: 404 });
    const sourceDoc = parseStudioDoc(source.doc);
    if (!sourceDoc) return NextResponse.json({ error: "That draft can't be read, so it can't be copied" }, { status: 500 });
    title = title || `Copy of ${source.title}`.slice(0, TITLE_MAX_LENGTH);
    description = source.description;
    doc = sourceDoc as unknown as Prisma.InputJsonValue;
  }

  if (!title || title.length > TITLE_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Title is required (up to ${TITLE_MAX_LENGTH} characters)` },
      { status: 400 },
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.studioModule.create({
      data: { title, description, doc, createdById: access.user.id, lastEditedById: access.user.id },
      select: { id: true, title: true, description: true, doc: true },
    });
    await recordVersion(tx, row, access.user.id);
    return row;
  });
  return NextResponse.json({ id: created.id }, { status: 201 });
}
