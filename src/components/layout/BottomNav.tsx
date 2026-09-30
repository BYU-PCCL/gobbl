"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PRIMARY_NAV } from "./navItems";

/**
 * Bottom navigation for phones and tablets. Replaced by the sidebar at lg.
 * Active tab pill = primary-soft bg + primary fg.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-40 border-t border-line bg-bg pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-2.5 lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between gap-1 px-4">
        {PRIMARY_NAV.map((tab) => {
          const active = tab.matches(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors ${
                active ? "text-primary" : "text-ink-muted hover:text-ink-soft"
              }`}
            >
              <span
                className={`flex h-7 items-center justify-center rounded-full px-3 transition-colors ${
                  active ? "bg-primary-soft" : ""
                }`}
              >
                <Icon name={tab.icon} />
              </span>
              <span className="font-body text-[11px] font-semibold">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
