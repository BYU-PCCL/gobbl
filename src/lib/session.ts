import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { verifyMobileToken } from "./mobileToken";

export type SessionUser = { id: string; source: "bearer" | "cookie" };

/**
 * Resolves the signed-in user for an API route from either client:
 *   - iOS sends `Authorization: Bearer <token>` (see mobileToken.ts)
 *   - the web sends the NextAuth session cookie
 *
 * A present-but-invalid bearer token is rejected outright rather than falling
 * back to the cookie, so a stale mobile token can never ride on a browser session.
 */
export async function getSessionUser(req?: Request): Promise<SessionUser | null> {
  const header = req?.headers.get("authorization");
  if (header) {
    const [scheme, token] = header.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) return null;
    const jwt = await verifyMobileToken(token);
    const id = jwt?.id;
    return typeof id === "string" && id ? { id, source: "bearer" } : null;
  }

  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  return id ? { id, source: "cookie" } : null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
