import { NEED_LOW } from "@/lib/flock/config";
import type { NeedKey } from "@/lib/flock/needs";

const ROWS: { key: NeedKey; label: string; action: string }[] = [
  { key: "hunger", label: "Fed", action: "Feed" },
  { key: "loneliness", label: "Company", action: "Park" },
  { key: "sadness", label: "Cheer", action: "School" },
];

/** Three fullness bars; a full bar is a happy need. */
export function NeedBars({ needs }: { needs: Record<NeedKey, number> }) {
  return (
    <div className="space-y-3">
      {ROWS.map(({ key, label, action }) => {
        const value = Math.round(needs[key]);
        const low = needs[key] < NEED_LOW;
        return (
          <div key={key}>
            <div className="mb-1 flex items-baseline justify-between font-body text-xs">
              <span className="font-semibold text-ink">
                {label} <span className="font-normal text-ink-muted">· {action}</span>
              </span>
              <span className="text-ink-soft">{value}%</span>
            </div>
            <div
              role="progressbar"
              aria-label={`${label} fullness`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={value}
              className="h-2.5 overflow-hidden rounded-full bg-line"
            >
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${low ? "bg-plume-500" : "bg-primary"}`}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
