"use client";

import { ButtonHTMLAttributes, forwardRef, type ComponentProps } from "react";
import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "dark";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants = {
  primary:
    "bg-primary text-white hover:bg-gobbl-600 active:bg-gobbl-700 shadow-soft hover:shadow-lift focus-visible:ring-primary/30",
  secondary:
    "bg-primary-soft text-gobbl-700 hover:bg-gobbl-200 active:bg-gobbl-300 focus-visible:ring-primary/30 dark:bg-gobbl-900 dark:text-gobbl-100 dark:hover:bg-gobbl-800",
  outline:
    "bg-transparent text-ink border border-line hover:border-ink-muted hover:bg-surface-2 active:bg-line focus-visible:ring-primary/30",
  ghost:
    "bg-transparent text-ink-soft hover:bg-surface-2 hover:text-ink active:bg-line focus-visible:ring-primary/30",
  danger:
    "bg-plume-500 text-white hover:bg-plume-600 active:bg-plume-700 focus-visible:ring-plume-500/30",
  dark:
    "bg-ink text-bg hover:bg-roost-800 active:bg-roost-700 focus-visible:ring-ink/30",
};

const sizes = {
  // Drawn 36px tall; the ::after pads the tap area out to 44px without moving anything.
  sm: "relative h-9 px-3.5 text-[13px] rounded-full after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
  md: "h-11 px-5   text-sm    rounded-full",
  lg: "h-12 px-6   text-base  rounded-full",
};

const BASE = `inline-flex items-center justify-center gap-2 font-body font-semibold
  transition-[background-color,color,box-shadow,transform] duration-150
  focus-visible:outline-none focus-visible:ring-4`;

/**
 * A link that looks like a Button. Use this for navigation instead of wrapping a
 * Button in a Link, which nests a button inside an anchor.
 */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link className={`${BASE} active:scale-[0.98] ${variants[variant]} ${sizes[size]} ${className}`} {...props} />
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", className = "", disabled, loading, children, ...props },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`${BASE}
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isDisabled ? "" : "active:scale-[0.98]"}
          ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
