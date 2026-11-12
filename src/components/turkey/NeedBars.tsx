import Link from "next/link";
import { NEED_LOW } from "@/lib/flock/config";
import type { NeedKey } from "@/lib/flock/needs";

const ROWS: { key: NeedKey; label: string; action: string }[] = [
  { key: "hunger", label: "Food", action: "Feed" },
  { key: "sadness", label: "Learning", action: "School" },
  { key: "loneliness", label: "Company", action: "Park" },
];

/**
 * Three fullness bars; a full bar is a need that is met. A low bar changes colour, says
 * "Low" in words, and links to the activity that fills it (when `hrefs` has one for it).
 */
export function NeedBars({
  needs,
  hrefs,
}: {
  needs: Record<NeedKey, number>;
  /** Where each need is filled; null or missing when that activity is not open. */
  hrefs?: Partial<Record<NeedKey, string | null>>;
}) {
  return (
    <div className="space-y-3">
      {ROWS.map(({ key, label, action }) => {
        const value = Math.round(needs[key]);
        const low = needs[key] < NEED_LOW;
        const href = hrefs?.[key];
        return (
          <div key={key}>
            <div className="mb-1 flex items-baseline justify-between gap-2 font-body text-xs">
              <span className="font-semibold text-ink">
                {label}
                {low && <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-primary">Low</span>}
              </span>
              {low && href ? (
                <Link href={href} className="font-semibold text-primary underline-offset-2 hover:underline">
                  {action}
                </Link>
              ) : (
                <span className="text-ink-soft num-tabular">{value}%</span>
              )}
            </div>
            <div
              role="progressbar"
              aria-label={`${label}${low ? ", low" : ""}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={value}
              className="h-2.5 overflow-hidden rounded-full bg-line"
            >
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${low ? "bg-primary" : "bg-forest-fg"}`}
                style={{ width: `${Math.max(value, 3)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
