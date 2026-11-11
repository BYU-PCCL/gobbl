"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import type { ResolvedNavItem } from "./navItems";

/**
 * Bottom hotbar for phones and tablets. Replaced by the sidebar at lg.
 * Active tab pill = primary-soft bg + primary fg. A dot marks the activity
 * whose need is running low for the selected turkey.
 */
export function BottomNav({ items }: { items: ResolvedNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-40 border-t border-line bg-bg pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-2.5 lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between gap-0.5 px-2">
        {items.map((tab) => {
          const active = tab.matches(pathname);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              aria-disabled={tab.locked ? "true" : undefined}
              title={tab.locked ? tab.lockedReason : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors ${
                active ? "text-primary" : "text-ink-muted hover:text-ink-soft"
              } ${tab.locked ? "opacity-40" : ""}`}
            >
              <span
                className={`relative flex h-7 items-center justify-center rounded-full px-3 transition-colors ${
                  active ? "bg-primary-soft" : ""
                }`}
              >
                <Icon name={tab.icon} />
                {tab.needsAttention && !tab.locked && <AttentionDot />}
                {tab.locked && <LockGlyph className="absolute -right-0.5 -top-0.5" />}
              </span>
              <span className="font-body text-[11px] font-semibold">
                {tab.label}
                {tab.needsAttention && <span className="sr-only"> (needed)</span>}
                {tab.locked && <span className="sr-only"> (locked: {tab.lockedReason})</span>}
              </span>
            </Link>
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
