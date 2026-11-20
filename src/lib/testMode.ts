/**
 * Test mode: the tester deployment used in focus groups. When on, the app logs page views
 * and taps per tester ID (see src/components/testing/TestTracker.tsx) and only accepts
 * tester IDs as usernames.
 *
 * It is on only where NEXT_PUBLIC_TEST_MODE=1 is set, which is the `tester` branch's
 * preview deployment. The VERCEL_ENV check is a second lock: even if the variable were
 * set on the production deployment by mistake, the public app would still not log.
 */
export function isTestMode(): boolean {
  if (process.env.NEXT_PUBLIC_TEST_MODE !== "1") return false;
  return process.env.VERCEL_ENV !== "production" && process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";
}

const TESTER_ID_PATTERN = /^p(\d{1,4})$/i;

/**
 * "p14", "P014" → "P014". Anything else → null. Only P plus a number is accepted, so a
 * tester ID can never hold a name.
 */
export function parseTesterId(value: string | null | undefined): string | null {
  const match = TESTER_ID_PATTERN.exec((value ?? "").trim());
  if (!match) return null;
  return `P${String(Number(match[1])).padStart(3, "0")}`;
}

export const TESTER_ID_HELP = "Use the ID on your sheet, like P014";
