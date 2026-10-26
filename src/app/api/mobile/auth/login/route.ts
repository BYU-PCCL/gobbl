import { NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/credentials";
import { issueMobileToken } from "@/lib/mobileToken";

/**
 * POST /api/mobile/auth/login  { username, password }
 *   200 { accessToken, expiresAt, user: { id, username, onboardingCompletedAt } }
 *   401 { error }
 *
 * Bearer-token login for native clients. The web keeps using the NextAuth cookie flow.
 */
export async function POST(req: Request) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { username, password } = body;
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  const user = await verifyCredentials(username, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const { accessToken, expiresAt } = await issueMobileToken(user);
  return NextResponse.json({
    accessToken,
    expiresAt,
    user: {
      id: user.id,
      username: user.username,
      onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
    },
  });
}
