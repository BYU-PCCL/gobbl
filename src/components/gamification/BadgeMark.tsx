import type { ReactNode } from "react";

/**
 * BadgeMark — the drawn emblem for each badge, replacing the old emoji icons.
 *
 * Each mark is a line drawing on a filled disc. Earned badges use their own
 * tone; unearned ones fall back to the neutral line color so the grid still
 * shows what is possible without competing with what's been won.
 */

type Tone = "primary" | "forest" | "ochre" | "rust";

const MARKS: Record<string, { tone: Tone; glyph: ReactNode }> = {
  // Turkey head in profile, the first word of the conversation
  "first-gobble": {
    tone: "primary",
    glyph: (
      <>
        <path d="M8 17c-1.5-4 .5-9 5-9 3 0 4.5 2 4.5 4.5" />
        <path d="M17.5 12.5l2.5 1-2.5 1" />
        <path d="M15.5 14.5c.4 1.6-.3 3-1.5 3.5" />
        <circle cx="14.5" cy="11" r="0.5" fill="currentColor" />
      </>
    ),
  },
  // Wheat stalk
  "free-range": {
    tone: "forest",
    glyph: (
      <>
        <path d="M12 21V8" />
        <path d="M12 12c-2.5 0-3.5-2-3.5-3.5 2 0 3.5 1.5 3.5 3.5zM12 12c2.5 0 3.5-2 3.5-3.5-2 0-3.5 1.5-3.5 3.5z" />
        <path d="M12 16c-2.5 0-3.5-2-3.5-3.5 2 0 3.5 1.5 3.5 3.5zM12 16c2.5 0 3.5-2 3.5-3.5-2 0-3.5 1.5-3.5 3.5z" />
        <path d="M12 8c-1-1-1-3 0-4.5 1 1.5 1 3.5 0 4.5z" />
      </>
    ),
  },
  // Nest with two eggs
  "warm-nest": {
    tone: "ochre",
    glyph: (
      <>
        <path d="M4.5 13h15c-.5 4-3.5 6-7.5 6s-7-2-7.5-6z" />
        <path d="M6.5 16h11" />
        <ellipse cx="10" cy="10.5" rx="2" ry="2.5" />
        <ellipse cx="14.2" cy="10.8" rx="1.8" ry="2.2" />
      </>
    ),
  },
  // Flight path over a horizon
  "migration-streak": {
    tone: "primary",
    glyph: (
      <>
        <path d="M4 17c3-5 7-8 12-9" strokeDasharray="1.5 2.5" />
        <path d="M14.5 5.5L18 8l-3 3" />
        <path d="M3 20h18" />
      </>
    ),
  },
  // Crown
  "flock-leader": {
    tone: "ochre",
    glyph: (
      <>
        <path d="M4 8l4 4 4-6 4 6 4-4-1.5 10h-13L4 8z" />
        <path d="M6 20h12" />
      </>
    ),
  },
  // Drumstick
  "golden-drumstick": {
    tone: "ochre",
    glyph: (
      <>
        <path d="M14.5 4.5a5 5 0 014.9 6.1c-.6 2.7-3.4 4.3-6 3.4l-3.6 3.6" />
        <path d="M14.5 4.5a5 5 0 00-5 5.6l.8 3.6" />
        <circle cx="7.5" cy="18.5" r="1.6" />
        <circle cx="5.5" cy="16.5" r="1.6" />
      </>
    ),
  },
  // Beak point, precise reasoning
  "sharp-beak": {
    tone: "rust",
    glyph: (
      <>
        <path d="M5 12c0-3 3-6 7-6l8 6-8 6c-4 0-7-3-7-6z" />
        <path d="M12 12h8" />
        <circle cx="9" cy="10" r="0.6" fill="currentColor" />
      </>
    ),
  },
  // Crescent moon over a perch
  "roosting-ritual": {
    tone: "forest",
    glyph: (
      <>
        <path d="M15 4a6.5 6.5 0 106 8.5A5.5 5.5 0 0115 4z" />
        <path d="M4 20h10M8 20v-2" />
      </>
    ),
  },
};

const TONE_CLASSES: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary",
  forest: "bg-forest-100 text-forest-600",
  ochre: "bg-ochre-soft text-golden-700",
  rust: "bg-plume-100 text-plume-500",
};

interface BadgeMarkProps {
  badgeKey: string;
  earned?: boolean;
  size?: number;
  className?: string;
}

export function BadgeMark({ badgeKey, earned = true, size = 40, className = "" }: BadgeMarkProps) {
  const mark = MARKS[badgeKey];
  const tone = earned && mark ? TONE_CLASSES[mark.tone] : "bg-surface-2 text-ink-muted";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${tone} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {mark?.glyph ?? <circle cx="12" cy="12" r="5" />}
      </svg>
    </span>
  );
}
