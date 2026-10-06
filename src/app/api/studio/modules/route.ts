import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getStudioAccess, studioDenied } from "@/lib/studio/access";
import { EMPTY_DOC, TITLE_MAX_LENGTH, type StudioModuleSummary } from "@/lib/studio/types";

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
    },
  });

  const body: StudioModuleSummary[] = modules.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    createdBy: m.createdBy.username,
    updatedAt: m.updatedAt.toISOString(),
  }));
  return NextResponse.json(body);
}

export async function POST(req: Request) {
  const access = await getStudioAccess();
  if (access.status !== "ok") return studioDenied(access);

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title || title.length > TITLE_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Title is required (up to ${TITLE_MAX_LENGTH} characters)` },
      { status: 400 },
    );
  }

  const created = await prisma.studioModule.create({
    data: {
      title,
      doc: EMPTY_DOC as unknown as Prisma.InputJsonValue,
      createdById: access.user.id,
    },
    select: { id: true },
  });
  return NextResponse.json(created, { status: 201 });
}
