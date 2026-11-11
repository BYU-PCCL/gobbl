"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { TopAppBar } from "./TopAppBar";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import { useUserSummary } from "./useUserSummary";
import { useHotbar } from "./useHotbar";
import { useVisualViewportHeight } from "@/components/chat/useVisualViewportHeight";

/**
 * Responsive app chrome.
 *   phone and tablet (< lg): top bar and bottom tab bar, content in a centered column
 *   desktop (lg+):           persistent sidebar, wide content canvas
 *
 * The debate view owns its own scrolling and header, so it gets a full-height
 * main with no padding, and no top or bottom bars on small screens. Its height
 * follows the visual viewport (--vvh) so the composer stays above the phone keyboard.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const user = useUserSummary();
  const { items: navItems, turkey } = useHotbar();
  const isDebateView = /^\/chat\/[^/]+$/.test(pathname);
  useVisualViewportHeight(isDebateView);

  return (
    <div className="flex h-[var(--vvh,100dvh)] w-full bg-bg">
      <SideNav user={user} items={navItems} turkey={turkey} />
      <div className="flex min-w-0 flex-1 flex-col">
        {!isDebateView && <TopAppBar user={user} turkey={turkey} />}
        <main
          className={isDebateView ? "min-h-0 flex-1 overflow-hidden" : "min-h-0 flex-1 overflow-y-auto"}
        >
          {isDebateView ? (
            children
          ) : (
            <div className="mx-auto w-full max-w-2xl px-5 pb-10 pt-4 sm:px-8 lg:max-w-6xl lg:px-12 lg:pt-12">
              {children}
            </div>
          )}
        </main>
        {!isDebateView && <BottomNav items={navItems} />}
      </div>
    </div>
  );
}
