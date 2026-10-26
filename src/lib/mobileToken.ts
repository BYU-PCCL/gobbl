import { encode, decode, type JWT } from "next-auth/jwt";
import type { AuthenticatedUser } from "./credentials";

/**
 * Bearer tokens for native clients (iOS). They are NextAuth session JWTs — same
 * `NEXTAUTH_SECRET`, same encryption, same claims (`id`, `name`,
 * `onboardingCompletedAt`) as the web's session cookie — just delivered in an
 * `Authorization` header instead of a cookie. Lifetime matches the web's 30 days.
 */

export const MOBILE_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is not set");
  return s;
}

export async function issueMobileToken(
  user: AuthenticatedUser
): Promise<{ accessToken: string; expiresAt: string }> {
  const accessToken = await encode({
    token: {
      id: user.id,
      name: user.username,
      onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
    },
    secret: secret(),
    maxAge: MOBILE_TOKEN_MAX_AGE_SECONDS,
  });
  const expiresAt = new Date(Date.now() + MOBILE_TOKEN_MAX_AGE_SECONDS * 1000).toISOString();
  return { accessToken, expiresAt };
}

/** Null on a malformed, tampered or expired token. */
export async function verifyMobileToken(raw: string): Promise<JWT | null> {
  try {
    return await decode({ token: raw, secret: secret() });
  } catch {
    return null;
  }
}
