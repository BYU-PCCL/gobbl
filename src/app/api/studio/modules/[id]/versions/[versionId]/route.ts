import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudioAccess, studioDenied } from "@/lib/studio/access";
import { VERSION_NAME_MAX_LENGTH, parseStudioDoc, type StudioVersionDetail } from "@/lib/studio/types";
import { VERSION_SUMMARY_SELECT, toVersionSummary } from "@/lib/studio/versions";

type Params = { params: { id: string; versionId: string } };

const notFound = () => NextResponse.json({ error: "Version not found" }, { status: 404 });

/** One version in full, for previewing or restoring it. */
export async function GET(_req: Request, { params }: Params) {
  const access = await getStudioAccess();
  if (access.status !== "ok") return studioDenied(access);

  const version = await prisma.studioModuleVersion.findFirst({
    where: { id: params.versionId, moduleId: params.id },
    select: { ...VERSION_SUMMARY_SELECT, description: true },
  });
  if (!version) return notFound();
  const doc = parseStudioDoc(version.doc);
  if (!doc) {
    return NextResponse.json({ error: "This version's saved data is in a format Studio can't read." }, { status: 500 });
  }
  const detail: StudioVersionDetail = { ...toVersionSummary(version), description: version.description, doc };
  return NextResponse.json(detail);
}

/** Renames a version, or with an empty name, un-names it. Its content never changes here. */
export async function PATCH(req: Request, { params }: Params) {
  const access = await getStudioAccess();
  if (access.status !== "ok") return studioDenied(access);

  const body = await req.json().catch(() => null);
  if (typeof body?.name !== "string" || body.name.trim().length > VERSION_NAME_MAX_LENGTH) {
    return NextResponse.json({ error: `Name can be up to ${VERSION_NAME_MAX_LENGTH} characters` }, { status: 400 });
  }
  const name = body.name.trim() || null;

  const { count } = await prisma.studioModuleVersion.updateMany({
    where: { id: params.versionId, moduleId: params.id },
    data: { name },
  });
  if (count === 0) return notFound();
  const version = await prisma.studioModuleVersion.findUniqueOrThrow({
    where: { id: params.versionId },
    select: VERSION_SUMMARY_SELECT,
  });
  return NextResponse.json(toVersionSummary(version));
}
