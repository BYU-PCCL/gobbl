"use client";

import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";
import type { TurkeyView } from "@/lib/flock/view";

export function FlockSwitcher({
  turkeys,
  currentId,
  onSelect,
}: {
  turkeys: TurkeyView[];
  currentId: string | null;
  onSelect: (id: string) => void;
}) {
  const hatched = turkeys.filter((t) => t.hatched);
  if (hatched.length < 2) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Your flock">
      {hatched.map((t) => {
        const active = t.id === currentId;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(t.id)}
            className={`flex shrink-0 flex-col items-center rounded-2xl border px-2 pb-1.5 pt-1 font-body text-xs transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30
              ${active ? "border-primary bg-primary-soft text-gobbl-700 dark:bg-gobbl-900 dark:text-gobbl-100" : "border-line bg-surface text-ink-soft hover:border-ink-muted dark:bg-roost-800"}`}
          >
            <TurkeyCharacter stage={t.stage} mood={t.mood} skill={t.skill} size={56} label={t.name ?? undefined} />
            <span className="max-w-[72px] truncate font-semibold">{t.name}</span>
          </button>
        );
      })}
    </div>
  );
}
