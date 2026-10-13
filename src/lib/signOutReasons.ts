/**
 * Why the app signed someone out on its own. Passed to the landing page as
 * `/?reason=...` so it can explain what happened instead of showing a blank
 * login form.
 */
export const SIGN_OUT_REASON_PARAM = "reason";

/** The session cookie was valid but its user no longer exists (e.g. after a database move). */
export const ACCOUNT_MISSING_REASON = "account-missing";

/** Where an automatic sign-out for a missing account should land. */
export const ACCOUNT_MISSING_CALLBACK_URL = `/?${SIGN_OUT_REASON_PARAM}=${ACCOUNT_MISSING_REASON}`;
