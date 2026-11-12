"use client";

interface XPBarProps {
  current: number;
  max: number;
  level: number;
  /** Show label row above the bar. Default true. */
  showLabel?: boolean;
}

/**
 * XP bar — Harvest direction. Solid primary fill, near-level-up (≥90%)
 * gradient primary → ochre. Tabular numerals in the label row.
 */
export function XPBar({ current, max, level, showLabel = true }: XPBarProps) {
  const percent = max > 0 ? Math.min(100, (current / max) * 100) : 100;
  const nearLevel = percent >= 90;

  return (
    <div className="space-y-1.5">
      {showLabel && (
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-xs uppercase tracking-[0.08em] text-ink-muted">
            Level {level}
          </span>
          <span className="font-mono text-xs text-ink-muted num-tabular">
            {max > 0 ? `${current} / ${max} XP` : "MAX"}
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-label={`Level ${level} progress`}
        aria-valuemin={0}
        aria-valuemax={max > 0 ? max : 100}
        aria-valuenow={max > 0 ? current : 100}
        className="relative h-2 overflow-hidden rounded-full bg-primary-soft"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            nearLevel ? "bg-gradient-to-r from-primary to-ochre" : "bg-primary"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
