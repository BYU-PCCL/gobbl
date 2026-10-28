"use client";

import type { Move } from "@/lib/moves";

/**
 * Optional coaching moves. Tapping a chip selects it and reveals its hint; tapping again clears.
 * The selected id is sent with the next message. Never shows anything about performance.
 */
export interface MoveChipsProps {
  moves: Move[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export function MoveChips({ moves, selectedId, onSelect, disabled, className = "" }: MoveChipsProps) {
  if (moves.length === 0) return null;
  return (
    <div className={`flex min-w-0 gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`} role="group" aria-label="Optional moves">
      {moves.map((m) => {
        const selected = m.id === selectedId;
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onSelect(selected ? null : m.id)}
            className={`h-8 shrink-0 rounded-full border px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors disabled:opacity-50 ${
              selected ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-soft hover:border-ink-muted hover:text-ink"
            }`}
          >
            {m.name}
          </button>
        );
      })}
    </div>
  );
}
