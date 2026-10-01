/**
 * fetch() + JSON parse that treats non-2xx responses as errors.
 *
 * Plain fetch() only rejects when the request never gets a response (offline, DNS);
 * a 401/404/500 resolves normally, and calling .json() on an empty error body throws
 * a misleading "Unexpected end of JSON input". This throws a readable Error instead,
 * preferring the `{ error }` message our API routes return.
 */
export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
