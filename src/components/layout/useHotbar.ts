"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useFlock } from "@/components/turkey/useFlock";
import { activityHref, emphasizedActivity, lockedReason } from "@/lib/flock/home";
import { nextStep } from "@/lib/flock/progress";
import { PRIMARY_NAV, type ResolvedNavItem } from "./navItems";
import type { TurkeyView } from "@/lib/flock/view";

/**
 * Resolves School/Park/Feed for the hotbar and flags the one whose need is low.
 * Refreshes on navigation so the dot clears after an activity.
 *
 * Which turkey an activity tab acts on:
 *   - from a turkey's own page (or anywhere but the coop): the selected turkey;
 *   - from the coop with two or more hatched turkeys: nobody yet, so the tab asks ("choose").
 * A tab that is shut explains itself in a sheet instead of going somewhere unexpected.
 */
export function useHotbar(): {
  items: ResolvedNavItem[];
  /** The turkey (or first egg) shown in the user bubble. */
  turkey: TurkeyView | null;
  hatched: TurkeyView[];
  select: (id: string) => void;
} {
  const pathname = usePathname();
  const { status } = useSession();
  const { turkeys, current, egg, loading, reload, select } = useFlock();

  // useFlock loads once on mount; reload on later navigations only.
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (status === "authenticated") void reload();
  }, [pathname, status, reload]);

  const hatched = useMemo(() => turkeys.filter((t) => t.hatched), [turkeys]);
  const asking = pathname === "/flock" && hatched.length >= 2;

  const items = useMemo(() => {
    return PRIMARY_NAV.map((item): ResolvedNavItem => {
      const base = { ...item, needsAttention: false, mode: "link" as const };
      const activity = item.activity;
      if (!activity) return base;

      // Until the flock is known, say nothing about locks or needs: it would only flicker.
      if (loading) return { ...base, mode: "pending" };

      // No egg picked yet: the hatch screen is where that happens.
      if (!current && !egg) {
        return { ...base, mode: "locked", lockedTitle: `${item.label} opens later`, lockedReason: "Pick your first egg to begin.", lockedCta: null };
      }

      // The first egg can only be fed: its lesson quiz is what hatches it.
      if (!current && egg) {
        if (activity === "feed") return { ...base, href: activityHref("feed", egg), needsAttention: true };
        return {
          ...base,
          mode: "locked",
          lockedTitle: `${item.label} opens after hatching`,
          lockedReason: "Your egg has to hatch first. Its first lesson does that.",
          lockedCta: { label: "Start its first lesson", href: activityHref("feed", egg) },
        };
      }
      if (!current) return base;

      if (asking) {
        const openFor = hatched.filter((t) => lockedReason(activity, t) === null);
        const wanted = hatched.some((t) => (nextStep(t.hatched, t.done) ?? emphasizedActivity(t.needs)) === activity);
        if (openFor.length > 0) return { ...base, mode: "choose", needsAttention: wanted };
        return {
          ...base,
          mode: "locked",
          lockedTitle: `${item.label} is not open yet`,
          lockedReason:
            activity === "school"
              ? "None of your turkeys has had a lesson yet. Feed one first."
              : "None of your turkeys has been to School yet. Feed, then School, then the Park.",
          lockedCta: null,
        };
      }

      const step = nextStep(current.hatched, current.done);
      const low = emphasizedActivity(current.needs);
      const needsAttention = step ? step === activity : low === activity;
      const shut = lockedReason(activity, current);
      if (shut) {
        const name = current.name?.trim() || "your turkey";
        return {
          ...base,
          needsAttention: false,
          mode: "locked",
          lockedTitle: `${item.label} is not open yet`,
          lockedReason: shut.reason,
          lockedCta: {
            label: shut.step === "feed" ? `Feed ${name}` : `Take ${name} to School`,
            href: activityHref(shut.step, current),
          },
        };
      }
      return { ...base, href: activityHref(activity, current), needsAttention };
    });
  }, [current, egg, loading, asking, hatched]);

  return { items, turkey: current ?? egg, hatched, select };
}
