"use client";

import { civilityLabel } from "@/lib/civility";

function Meter({ label, value, caption, tone }: { label: string; value: number; caption: string; tone: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex-1 rounded-2xl border border-line bg-surface p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="eyebrow text-ink-muted">{label}</span>
        <span className="font-mono text-xs font-semibold text-ink num-tabular">{value > 0 ? pct : "--"}</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-bg"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 font-body text-xs text-ink-soft">{caption}</div>
    </div>
  );
}

/** Warmth (time since last activity) and Mood (rolling civility). `civilityScore` is 0-10; 0 means none yet. */
export function NestMeters({ warmth, civilityScore }: { warmth: number; civilityScore: number }) {
  const hasMood = civilityScore > 0;
  const mood = Math.round(civilityScore * 10);
  return (
    <div className="flex gap-2.5">
      <Meter label="Warmth" value={warmth} caption={warmth >= 80 ? "Toasty" : warmth >= 40 ? "Cooling" : "Chilly"} tone="bg-ochre" />
      <Meter
        label="Mood"
        value={hasMood ? mood : 0}
        caption={hasMood ? civilityLabel(civilityScore) : "No conversations yet"}
        tone="bg-forest-500"
      />
    </div>
  );
}
