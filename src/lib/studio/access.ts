import "server-only";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export interface StudioUser {
  id: string;
  username: string;
}

export type StudioAccess =
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "ok"; user: StudioUser };

/**
 * Who is asking, and may they use Module Studio?
 *
 * Reads `studioAccess` from the database on every call instead of the session
 * token, so flipping the flag takes effect without the user signing in again.
 */
export async function getStudioAccess(): Promise<StudioAccess> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { status: "unauthenticated" };

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, studioAccess: true },
  });
  if (!user) return { status: "unauthenticated" };
  if (!user.studioAccess) return { status: "forbidden" };

  return { status: "ok", user: { id: user.id, username: user.username } };
}

/** The JSON error response for a Studio API route when access is not "ok". */
export function studioDenied(access: Exclude<StudioAccess, { status: "ok" }>): NextResponse {
  return access.status === "unauthenticated"
    ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    : NextResponse.json({ error: "Module Studio access required" }, { status: 403 });
}
