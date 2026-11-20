"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { parseTesterId } from "@/lib/testMode";

interface QueuedEvent {
  event: "session_start" | "page_view" | "tap";
  route: string;
  target?: string;
  detail?: Record<string, string | number>;
  clientTime: string;
}

const ENDPOINT = "/api/test-events";
const SESSION_KEY = "gobbl-test-session";
const STARTED_KEY = "gobbl-test-session-started";
const FLUSH_MS = 2000;
const MAX_LABEL = 80;
const INTERACTIVE = "[data-track], button, a, [role='button'], [role='switch'], summary, label";

function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    // Private mode or blocked storage: a per-page-load ID still groups this visit's events.
    return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function deviceKind(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  return "desktop";
}

/**
 * What a tap is called in the log: an explicit data-track name, else the control's
 * aria-label, else its visible text. Never the value of a text field.
 */
function describe(el: Element): string {
  const named = el.getAttribute("data-track") ?? el.getAttribute("aria-label");
  if (named) return named.slice(0, MAX_LABEL);
  const visible = (el as HTMLElement).innerText ?? "";
  return visible.replace(/\s+/g, " ").trim().slice(0, MAX_LABEL) || `(${el.tagName.toLowerCase()})`;
}

/**
 * Test-mode only (mounted from the root layout when isTestMode()). Logs each page view and
 * each tap with a timestamp so a tester's session can be replayed as a timeline. Batches
 * events and sends them in the background; any failure is swallowed so the app is unaffected.
 */
export function TestTracker() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const testerId = parseTesterId(session?.user?.name);

  const queue = useRef<QueuedEvent[]>([]);
  const sessionId = useRef<string | null>(null);
  const route = useRef(pathname);
  route.current = pathname;
  const exposed = useRef<{ push: (e: Omit<QueuedEvent, "clientTime" | "route">) => void; flush: () => void } | null>(null);

  useEffect(() => {
    const id = getSessionId();
    sessionId.current = id;

    const push = (e: Omit<QueuedEvent, "clientTime" | "route">) => {
      queue.current.push({ ...e, route: route.current, clientTime: new Date().toISOString() });
    };

    const flush = () => {
      if (queue.current.length === 0) return;
      const events = queue.current;
      queue.current = [];
      try {
        const payload = JSON.stringify({ sessionId: id, events });
        const sent = navigator.sendBeacon?.(ENDPOINT, new Blob([payload], { type: "application/json" }));
        if (!sent) {
          void fetch(ENDPOINT, { method: "POST", body: payload, keepalive: true }).catch(() => {});
        }
      } catch {
        // Logging must never break the app.
      }
    };

    // Once per visit, not once per page load: a reload keeps the same session.
    let alreadyStarted = false;
    try {
      alreadyStarted = sessionStorage.getItem(STARTED_KEY) === id;
      sessionStorage.setItem(STARTED_KEY, id);
    } catch {
      // storage unavailable; a repeated session_start is harmless
    }
    if (!alreadyStarted) {
      push({
        event: "session_start",
        detail: { device: deviceKind(), screenW: window.screen.width, screenH: window.screen.height },
      });
    }

    const onClick = (ev: MouseEvent) => {
      try {
        const origin = ev.target instanceof Element ? ev.target : null;
        if (!origin) return;
        // Taps inside a text field are typing, not navigation; skip them entirely.
        if (origin.closest("input, textarea, select, [contenteditable='true']")) return;
        const control = origin.closest(INTERACTIVE);
        if (control) {
          push({ event: "tap", target: describe(control), detail: { kind: control.tagName.toLowerCase() } });
        } else {
          // A tap on nothing interactive. No text is read, so message content can't leak in.
          push({ event: "tap", target: "(none)", detail: { kind: origin.tagName.toLowerCase() } });
        }
      } catch {
        // ignore
      }
    };

    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    const timer = window.setInterval(flush, FLUSH_MS);
    exposed.current = { push, flush };

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      window.clearInterval(timer);
      flush();
    };
  }, []);

  // React's development mode runs effects twice; the ref keeps that from doubling page views.
  const lastViewed = useRef<string | null>(null);
  useEffect(() => {
    if (lastViewed.current === pathname) return;
    lastViewed.current = pathname;
    exposed.current?.push({ event: "page_view" });
  }, [pathname]);

  // Signing in is what lets the server stamp this visit's earlier events with the tester ID,
  // so send straight away rather than waiting for the next tap.
  useEffect(() => {
    if (!testerId || !sessionId.current) return;
    exposed.current?.flush();
    try {
      void fetch(ENDPOINT, {
        method: "POST",
        body: JSON.stringify({ sessionId: sessionId.current, events: [] }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignore
    }
  }, [testerId]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-1/2 top-1 z-[100] -translate-x-1/2 rounded-full bg-ink/80 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-bg"
    >
      Test mode{testerId ? ` · ${testerId}` : ""}
    </div>
  );
}
