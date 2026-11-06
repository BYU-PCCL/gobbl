"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useFlock } from "@/components/turkey/useFlock";
import { activityNavHref, emphasizedActivity } from "@/lib/flock/home";
import { PRIMARY_NAV, type ResolvedNavItem } from "./navItems";

/**
 * Resolves School/Park/Feed to the selected turkey's activity and flags the one
 * whose need is low. Refreshes on navigation so the dot clears after an activity.
 */
export function useHotbar(): ResolvedNavItem[] {
  const pathname = usePathname();
  const { status } = useSession();
  const { current, reload } = useFlock();

  // useFlock loads once on mount; reload on later navigations only.
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (status === "authenticated") void reload();
  }, [pathname, status, reload]);

  return useMemo(() => {
    const low = current ? emphasizedActivity(current.needs) : null;
    return PRIMARY_NAV.map((item) =>
      item.activity
        ? { ...item, href: activityNavHref(item.activity, current), needsAttention: low === item.activity }
        : { ...item, needsAttention: false },
    );
  }, [current]);
}
