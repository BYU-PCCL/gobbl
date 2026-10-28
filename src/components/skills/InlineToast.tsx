"use client";

import { useEffect } from "react";

/** Small status banner that hides itself after ~3 s. A new message restarts the timer. */
export function InlineToast({ message, onHide }: { message: string | null; onHide: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onHide, 3000);
    return () => clearTimeout(t);
  }, [message, onHide]);

  if (!message) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-4 top-[max(env(safe-area-inset-top),1rem)] z-[70] mx-auto max-w-md rounded-2xl bg-ink px-4 py-3 text-center font-body text-sm font-semibold text-bg shadow-lg"
    >
      {message}
    </div>
  );
}
