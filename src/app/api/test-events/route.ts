import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isTestMode, parseTesterId } from "@/lib/testMode";

const EVENT_TYPES = new Set(["session_start", "page_view", "tap"]);
const MAX_EVENTS_PER_REQUEST = 100;

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length > 0 ? value.slice(0, max) : null;
}

/** Keeps only flat string/number fields, so nothing unexpected can ride along in `detail`. */
function cleanDetail(value: unknown): Prisma.InputJsonValue | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Record<string, string | number> = {};
  for (const [key, v] of Object.entries(value).slice(0, 8)) {
    if (typeof v === "number" && Number.isFinite(v)) out[key.slice(0, 24)] = v;
    else if (typeof v === "string") out[key.slice(0, 24)] = v.slice(0, 40);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Receives batches of page-view and tap events from TestTracker. Exists only in test mode.
 * The tester ID comes from the signed-in account, never from the request, and a failure
 * here must never reach the tester, so every outcome is an empty 204.
 */
export async function POST(req: Request) {
  if (!isTestMode()) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    // sendBeacon posts a Blob, so read text rather than relying on the content type.
    const body = JSON.parse(await req.text()) as { sessionId?: unknown; events?: unknown };
    const sessionId = text(body.sessionId, 64);
    if (!sessionId || !Array.isArray(body.events)) {
      return new NextResponse(null, { status: 204 });
    }

    const session = await getServerSession(authOptions);
    const testerId = parseTesterId(session?.user?.name);
    const now = Date.now();

    const rows = body.events.slice(0, MAX_EVENTS_PER_REQUEST).flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const e = raw as Record<string, unknown>;
      const event = text(e.event, 20);
      const route = text(e.route, 200);
      if (!event || !EVENT_TYPES.has(event) || !route) return [];
      const parsedTime = typeof e.clientTime === "string" ? Date.parse(e.clientTime) : NaN;
      return [{
        testerId,
        sessionId,
        event,
        route,
        target: text(e.target, 120),
        detail: cleanDetail(e.detail),
        clientTime: new Date(Number.isFinite(parsedTime) ? parsedTime : now),
      }];
    });

    if (rows.length > 0) {
      await prisma.testEvent.createMany({ data: rows });
    }
    if (testerId) {
      // Landing and sign-up events were logged before the ID was known; stamp them now.
      await prisma.testEvent.updateMany({
        where: { sessionId, testerId: null },
        data: { testerId },
      });
    }
  } catch (err) {
    console.error("[test-events] dropped a batch", err);
  }

  return new NextResponse(null, { status: 204 });
}
