import type { ReactNode } from "react";

/**
 * Gobbl glyph set — the single source for interface icons.
 *
 * Every glyph is a 24×24 line drawing at a 1.8 stroke, matching the nav icons,
 * so icons read as one family. The feather is the one filled mark: it is the
 * currency symbol and always renders in ochre. Emoji are intentionally not used
 * anywhere in the UI; add a path here instead.
 */

export type IconName =
  | "home"
  | "debate"
  | "skills"
  | "shop"
  | "profile"
  | "flock"
  | "feather"
  | "xp"
  | "check"
  | "arrow-right"
  | "arrow-left"
  | "chevron-right"
  | "chevron-down"
  | "close"
  | "sign-out"
  | "rank"
  | "streak"
  | "target"
  | "sparkle";

const PATHS: Record<Exclude<IconName, "feather">, ReactNode> = {
  home: <path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-7h-6v7H5a1 1 0 01-1-1v-9z" />,
  debate: <path d="M4 6a3 3 0 013-3h10a3 3 0 013 3v7a3 3 0 01-3 3h-3l-4 4v-4H7a3 3 0 01-3-3V6z" />,
  skills: <path d="M12 3l9 4-9 4-9-4 9-4zM3 12l9 4 9-4M3 17l9 4 9-4" />,
  shop: (
    <>
      <path d="M5 8h14l-1.2 12a2 2 0 01-2 1.8H8.2a2 2 0 01-2-1.8L5 8z" />
      <path d="M9 8V6a3 3 0 016 0v2" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </>
  ),
  flock: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M15.5 5.2a3.2 3.2 0 010 5.6M17.5 14.4c2 .8 3.5 2.9 3.5 5.6" />
    </>
  ),
  xp: <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7L12 3z" />,
  check: <path d="M5 13l4 4 10-10" />,
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
  "arrow-left": <path d="M19 12H5M11 6l-6 6 6 6" />,
  "chevron-right": <path d="M9 6l6 6-6 6" />,
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  "sign-out": (
    <>
      <path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4" />
      <path d="M10 16l-4-4 4-4M6 12h10" />
    </>
  ),
  rank: (
    <>
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4h10v5a5 5 0 01-10 0V4z" />
      <path d="M7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3" />
    </>
  ),
  streak: <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 01-10 0c0-2 1-3.5 2-4.5.3 1.8 1.2 2.8 2.2 3.2C10.6 8.5 11 5.5 12 3z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </>
  ),
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />,
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  /** Stroke weight; defaults to the family's 1.8. */
  strokeWidth?: number;
  /** Accessible label. Without one the glyph is decorative and hidden from screen readers. */
  label?: string;
}

export function Icon({ name, size = 20, className = "", strokeWidth = 1.8, label }: IconProps) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true as const };

  if (name === "feather") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...a11y}>
        <path d="M21 3c-7 0-11 5-12 9-1 4 0 8 0 9h2c0-3 1-7 3-10s5-5 7-8z" fill="rgb(228 165 71)" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...a11y}
    >
      {PATHS[name]}
    </svg>
  );
}
