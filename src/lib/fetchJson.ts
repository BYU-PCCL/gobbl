/** Thrown by fetchJson when `timeoutMs` passes with no response. */
export class TimeoutError extends Error {
  constructor() {
    super("That took too long. Please try again.");
    this.name = "TimeoutError";
  }
}

/**
 * fetch() + JSON parse that treats non-2xx responses as errors.
 *
 * Plain fetch() only rejects when the request never gets a response (offline, DNS);
 * a 401/404/500 resolves normally, and calling .json() on an empty error body throws
 * a misleading "Unexpected end of JSON input". This throws a readable Error instead,
 * preferring the `{ error }` message our API routes return.
 *
 * `timeoutMs` gives up on a request that hangs (a slow model reply) and throws a
 * TimeoutError, so a screen waiting on it can offer a retry instead of spinning forever.
 */
export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const { timeoutMs, ...rest } = init ?? {};
  if (!timeoutMs) return parse<T>(await fetch(input, rest));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await parse<T>(await fetch(input, { ...rest, signal: controller.signal }));
  } catch (e) {
    if (controller.signal.aborted) throw new TimeoutError();
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
