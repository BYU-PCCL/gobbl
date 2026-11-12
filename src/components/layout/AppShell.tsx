"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { TopAppBar } from "./TopAppBar";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import { useUserSummary } from "./useUserSummary";
import { useHotbar } from "./useHotbar";
import { HotbarSheet } from "./HotbarSheet";
import type { ResolvedNavItem } from "./navItems";
import { useVisualViewportHeight } from "@/components/chat/useVisualViewportHeight";

/**
 * Responsive app chrome.
 *   phone and tablet (< lg): top bar and bottom tab bar, content in a centered column
 *   desktop (lg+):           persistent sidebar, wide content canvas
 *
 * A conversation (the Park at /chat/[id], School at /school/[id]) is a focus view: it owns
 * its scrolling and header, so it gets a full-height main with no padding, and no top or
 * bottom bars on small screens. Leaving goes through the view's own Leave button, which can
 * warn when progress would be lost. Its height follows the visual viewport (--vvh) so the
 * composer stays above the phone keyboard.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const user = useUserSummary();
  const { items: navItems, turkey, hatched, select } = useHotbar();
  // A locked tab, or one that has to ask which turkey, opens a sheet instead of navigating.
  const [sheetItem, setSheetItem] = useState<ResolvedNavItem | null>(null);
  useEffect(() => setSheetItem(null), [pathname]);
  const isFocusView = /^\/(chat|school)\/[^/]+$/.test(pathname);
  useVisualViewportHeight(isFocusView);

  return (
    <div className="flex h-[var(--vvh,100dvh)] w-full bg-bg">
      <SideNav user={user} items={navItems} turkey={turkey} onOpenSheet={setSheetItem} />
      <div className="flex min-w-0 flex-1 flex-col">
        {!isFocusView && <TopAppBar user={user} turkey={turkey} />}
        <main
          className={isFocusView ? "min-h-0 flex-1 overflow-hidden" : "min-h-0 flex-1 overflow-y-auto"}
        >
          {isFocusView ? (
            children
          ) : (
            <div className="mx-auto w-full max-w-6xl px-5 pb-10 pt-4 sm:px-8 lg:px-12 lg:pt-12">
              {children}
            </div>
          )}
        </main>
        {!isFocusView && <BottomNav items={navItems} onOpenSheet={setSheetItem} />}
      </div>
      <HotbarSheet item={sheetItem} hatched={hatched} select={select} onClose={() => setSheetItem(null)} />
    </div>
  );
}
