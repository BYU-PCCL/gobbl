import { NextResponse } from "next/server";
import { createAccount, UsernameTakenError, validateRegistration } from "@/lib/credentials";
import { issueMobileToken } from "@/lib/mobileToken";

/**
 * POST /api/mobile/auth/register  { username, password }
 *   200 { accessToken, expiresAt, user }   (same shape as login — the account is signed in)
 *   400 { error }  validation
 *   409 { error }  username taken
 *
 * Same rules as /api/register, but returns a token so the client skips a second call.
 */
export async function POST(req: Request) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const problem = validateRegistration(body);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    const user = await createAccount(body.username as string, body.password as string);
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
  } catch (e) {
    if (e instanceof UsernameTakenError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
