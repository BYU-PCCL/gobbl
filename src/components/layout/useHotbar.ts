"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useFlock } from "@/components/turkey/useFlock";
import { activityNavHref, emphasizedActivity } from "@/lib/flock/home";
import { nextStep } from "@/lib/flock/progress";
import { PRIMARY_NAV, type ResolvedNavItem } from "./navItems";
import type { TurkeyView } from "@/lib/flock/view";

/**
 * Resolves School/Park/Feed to the selected turkey's activity and flags the one
 * whose need is low. Refreshes on navigation so the dot clears after an activity.
 * Also returns the turkey (or first egg) shown in the user bubble.
 */
export function useHotbar(): { items: ResolvedNavItem[]; turkey: TurkeyView | null } {
  const pathname = usePathname();
  const { status } = useSession();
  const { current, egg, reload } = useFlock();

  // useFlock loads once on mount; reload on later navigations only.
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (status === "authenticated") void reload();
  }, [pathname, status, reload]);

  const items = useMemo(() => {
    const low = current ? emphasizedActivity(current.needs) : null;
    const step = current ? nextStep(current.hatched, current.done) : null;
    const name = current?.name?.trim() || "your turkey";
    return PRIMARY_NAV.map((item): ResolvedNavItem => {
      if (!item.activity) return { ...item, needsAttention: false, locked: false };
      // An egg can only be fed: its lesson quiz is what hatches it.
      if (!current && egg) {
        return item.activity === "feed"
          ? { ...item, href: activityNavHref("feed", egg), needsAttention: true, locked: false }
          : { ...item, href: "/home", needsAttention: false, locked: true, lockedReason: "Hatch your egg first" };
      }
      const needsAttention = step ? step === item.activity : low === item.activity;
      if (current && item.activity === "school" && !current.unlocked.school) {
        return { ...item, href: "/home", needsAttention, locked: true, lockedReason: `Feed ${name} first` };
      }
      if (current && item.activity === "park" && !current.unlocked.park) {
        return { ...item, href: "/home", needsAttention, locked: true, lockedReason: `Take ${name} to School first` };
      }
      return { ...item, href: activityNavHref(item.activity, current), needsAttention, locked: false };
    });
  }, [current, egg]);

  return { items, turkey: current ?? egg };
}
