"use client";

import { useEffect, useState } from "react";
import type { PracticeAddonProps } from "./practice-addons";

export interface DiscomfortPress {
  /** ISO timestamp of the press. */
  at: string;
  /** Index of the last chat message on screen when pressed (-1 if there were none yet). */
  afterMessage: number;
}

export interface DiscomfortButtonValue {
  count: number;
  presses: DiscomfortPress[];
}

const CONFIRM_MS = 1200;

/**
 * Cognitive dissonance practice addon: the user presses it whenever they feel discomfort,
 * as many times as they like. Each press records when it happened and which message
 * was on screen, so the reflection step afterwards can refer back to it.
 *
 * addonProps: { label?: string }
 */
export function DiscomfortButton({ props, messages, value, onChange }: PracticeAddonProps) {
  const label = typeof props.label === "string" ? props.label : "I feel discomfort";
  const current = (value as DiscomfortButtonValue | null) ?? { count: 0, presses: [] };
  const [confirming, setConfirming] = useState(false);

  // Brief "Noted" so the user knows the press registered, without showing a running count.
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  function press() {
    const next: DiscomfortButtonValue = {
      count: current.count + 1,
      presses: [...current.presses, { at: new Date().toISOString(), afterMessage: messages.length - 1 }],
    };
    onChange(next);
    setConfirming(true);
  }

  return (
    <button
      type="button"
      onClick={press}
      className="w-full rounded-xl bg-blue-600 px-4 py-2.5 font-body text-sm font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
    >
      {confirming ? "Noted ✓" : label}
    </button>
  );
}
