"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import type { ResolvedNavItem } from "./navItems";

/**
 * Bottom hotbar for phones and tablets. Replaced by the sidebar at lg.
 * Active tab pill = primary-soft bg + primary fg. A dot marks the activity that is
 * next or running low. A locked tab, or one that has to ask which turkey, is a button
 * that opens a sheet (onOpenSheet) instead of a link.
 */
export function BottomNav({
  items,
  onOpenSheet,
}: {
  items: ResolvedNavItem[];
  onOpenSheet: (item: ResolvedNavItem) => void;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-40 border-t border-line bg-bg pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between gap-0.5 px-2">
        {items.map((tab) => {
          const active = tab.matches(pathname);
          const locked = tab.mode === "locked";
          const tone = active
            ? "text-primary"
            : locked || tab.mode === "pending"
              ? "text-ink-muted"
              : "text-ink-soft hover:text-ink";
          const className = `flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1.5 transition-colors ${tone}`;
          const body = (
            <>
              <span
                className={`relative flex h-7 items-center justify-center rounded-full px-3 transition-colors ${
                  active ? "bg-primary-soft" : ""
                }`}
              >
                <Icon name={tab.icon} />
                {tab.needsAttention && !locked && <AttentionDot />}
                {locked && <LockGlyph className="absolute -right-1.5 -top-1" />}
              </span>
              <span className="font-body text-xs font-semibold">
                {tab.label}
                {tab.needsAttention && !locked && <span className="sr-only"> (needed)</span>}
                {locked && <span className="sr-only"> (locked)</span>}
              </span>
            </>
          );
          if (tab.mode === "link") {
            return (
              <Link key={tab.label} href={tab.href} aria-current={active ? "page" : undefined} className={className}>
                {body}
              </Link>
            );
          }
          return (
            <button
              key={tab.label}
              type="button"
              disabled={tab.mode === "pending"}
              aria-haspopup="dialog"
              onClick={() => onOpenSheet(tab)}
              className={className}
            >
              {body}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function AttentionDot({ className = "right-1.5 top-0" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`absolute h-2.5 w-2.5 rounded-full border-2 border-bg bg-primary ${className}`}
    />
  );
}

export function LockGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  );
}
