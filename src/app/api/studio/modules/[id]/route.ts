import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getStudioAccess, studioDenied } from "@/lib/studio/access";
import {
  DESCRIPTION_MAX_LENGTH,
  EMPTY_DOC,
  TITLE_MAX_LENGTH,
  parseStudioDoc,
  type StudioModuleDetail,
} from "@/lib/studio/types";

const DETAIL_SELECT = {
  id: true,
  title: true,
  description: true,
  doc: true,
  updatedAt: true,
  createdBy: { select: { username: true } },
} satisfies Prisma.StudioModuleSelect;

type DetailRow = Prisma.StudioModuleGetPayload<{ select: typeof DETAIL_SELECT }>;

function toDetail(m: DetailRow): StudioModuleDetail {
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    createdBy: m.createdBy.username,
    updatedAt: m.updatedAt.toISOString(),
    doc: parseStudioDoc(m.doc) ?? EMPTY_DOC,
  };
}

const notFound = () => NextResponse.json({ error: "Module not found" }, { status: 404 });

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await getStudioAccess();
  if (access.status !== "ok") return studioDenied(access);

  const found = await prisma.studioModule.findUnique({ where: { id: params.id }, select: DETAIL_SELECT });
  if (!found) return notFound();
  return NextResponse.json(toDetail(found));
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const access = await getStudioAccess();
  if (access.status !== "ok") return studioDenied(access);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const data: Prisma.StudioModuleUpdateInput = {};

  if (body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > TITLE_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Title is required (up to ${TITLE_MAX_LENGTH} characters)` },
        { status: 400 },
      );
    }
    data.title = title;
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string" || body.description.length > DESCRIPTION_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Description can be up to ${DESCRIPTION_MAX_LENGTH} characters` },
        { status: 400 },
      );
    }
    data.description = body.description.trim();
  }

  if (body.doc !== undefined) {
    const doc = parseStudioDoc(body.doc);
    if (!doc) return NextResponse.json({ error: "Invalid module document" }, { status: 400 });
    data.doc = doc as unknown as Prisma.InputJsonValue;
  }

  const existing = await prisma.studioModule.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!existing) return notFound();

  const updated = await prisma.studioModule.update({
    where: { id: params.id },
    data,
    select: DETAIL_SELECT,
  });
  return NextResponse.json(toDetail(updated));
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const access = await getStudioAccess();
  if (access.status !== "ok") return studioDenied(access);

  const { count } = await prisma.studioModule.deleteMany({ where: { id: params.id } });
  if (count === 0) return notFound();
  return NextResponse.json({ ok: true });
}
