import type { IconName } from "@/components/ui/Icon";
import type { HomeActivity } from "@/lib/flock/home";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Set for School/Park/Feed: the real link depends on the turkey. */
  activity?: HomeActivity;
  matches: (pathname: string) => boolean;
}

const under = (p: string, root: string) => p === root || p.startsWith(`${root}/`);

/**
 * The hotbar, shared by the mobile bottom nav and the desktop sidebar.
 * Flock is the hub: the coop, plus a turkey's own page (/home) and hatching, which open from it.
 */
export const PRIMARY_NAV: NavItem[] = [
  {
    href: "/flock",
    label: "Flock",
    icon: "flock",
    matches: (p) => ["/flock", "/home", "/hatch"].some((r) => under(p, r)),
  },
  { href: "/flock", label: "Feed", icon: "feed", activity: "feed", matches: (p) => under(p, "/skills") },
  { href: "/flock", label: "School", icon: "school", activity: "school", matches: (p) => under(p, "/school") },
  { href: "/flock", label: "Park", icon: "park", activity: "park", matches: (p) => under(p, "/chat") },
  { href: "/shop", label: "Shop", icon: "shop", matches: (p) => under(p, "/shop") },
];

/** A nav item resolved against the flock. */
export interface ResolvedNavItem extends NavItem {
  /** A turkey's need for this activity is low, or it is the next step. */
  needsAttention: boolean;
  /**
   * link:    goes to `href`.
   * choose:  several turkeys could do this; the hotbar asks which one.
   * locked:  not open yet; the hotbar explains why and offers the step that opens it.
   * pending: the flock has not loaded; drawn quietly and does nothing yet.
   */
  mode: "link" | "choose" | "locked" | "pending";
  lockedTitle?: string;
  lockedReason?: string;
  /** The step that opens it, when there is one to offer. */
  lockedCta?: { label: string; href: string } | null;
}
