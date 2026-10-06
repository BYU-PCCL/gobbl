import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getStudioAccess, studioDenied } from "@/lib/studio/access";
import { validateStudioDoc } from "@/lib/studio/components";
import {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  parseStudioDoc,
  type StudioModuleDetail,
  type StudioModuleSummary,
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

function toSummary(m: DetailRow): StudioModuleSummary {
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    createdBy: m.createdBy.username,
    updatedAt: m.updatedAt.toISOString(),
  };
}

/** Null when the stored document isn't a valid StudioDoc. */
function toDetail(m: DetailRow): StudioModuleDetail | null {
  const doc = parseStudioDoc(m.doc);
  return doc ? { ...toSummary(m), doc } : null;
}

const notFound = () => NextResponse.json({ error: "Module not found" }, { status: 404 });

const conflict = () =>
  NextResponse.json(
    { error: "This draft was changed by someone else since you opened it. Reload to see their changes." },
    { status: 409 },
  );

// Never present an unreadable document as an empty one: the next save would overwrite
// the real data with nothing. The row is left untouched so it can still be recovered.
const unreadable = (id: string) => {
  console.error(`Studio draft ${id} has a saved document that is not a valid StudioDoc`);
  return NextResponse.json(
    { error: "This draft's saved data is in a format Studio can't read. Nothing has been changed, so it can still be recovered." },
    { status: 500 },
  );
};

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await getStudioAccess();
  if (access.status !== "ok") return studioDenied(access);

  const found = await prisma.studioModule.findUnique({ where: { id: params.id }, select: DETAIL_SELECT });
  if (!found) return notFound();
  const detail = toDetail(found);
  if (!detail) return unreadable(found.id);
  return NextResponse.json(detail);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const access = await getStudioAccess();
  if (access.status !== "ok") return studioDenied(access);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const data: Prisma.StudioModuleUpdateManyMutationInput = {};

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
    // Strict on write, lenient on read: a draft can't be saved with settings its component
    // doesn't accept, but one saved before a component changed can still be opened and fixed.
    const docError = validateStudioDoc(doc);
    if (docError) return NextResponse.json({ error: docError }, { status: 400 });
    data.doc = doc as unknown as Prisma.InputJsonValue;
  }

  // Optional: the `updatedAt` the client last saw. When sent, the save only goes through if
  // nobody else has saved since; without it the save behaves as it always has (last write wins).
  let expectedUpdatedAt: Date | undefined;
  if (body.expectedUpdatedAt !== undefined) {
    expectedUpdatedAt =
      typeof body.expectedUpdatedAt === "string" ? new Date(body.expectedUpdatedAt) : undefined;
    if (!expectedUpdatedAt || Number.isNaN(expectedUpdatedAt.getTime())) {
      return NextResponse.json({ error: "expectedUpdatedAt must be an ISO date string" }, { status: 400 });
    }
  }

  const { count } = await prisma.studioModule.updateMany({
    where: expectedUpdatedAt ? { id: params.id, updatedAt: expectedUpdatedAt } : { id: params.id },
    data,
  });
  if (count === 0) {
    const exists = await prisma.studioModule.findUnique({ where: { id: params.id }, select: { id: true } });
    return exists ? conflict() : notFound();
  }

  const updated = await prisma.studioModule.findUnique({ where: { id: params.id }, select: DETAIL_SELECT });
  if (!updated) return notFound();
  // A rename must still work on a draft whose document can't be read, so fall back to the
  // summary (which has no document) rather than failing after the save already happened.
  return NextResponse.json(toDetail(updated) ?? toSummary(updated));
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const access = await getStudioAccess();
  if (access.status !== "ok") return studioDenied(access);

  const { count } = await prisma.studioModule.deleteMany({ where: { id: params.id } });
  if (count === 0) return notFound();
  return NextResponse.json({ ok: true });
}
