import type { IconName } from "@/components/ui/Icon";
import type { HomeActivity } from "@/lib/flock/home";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Set for School/Park/Feed: the real link depends on the selected turkey. */
  activity?: HomeActivity;
  matches: (pathname: string) => boolean;
}

const under = (p: string, root: string) => p === root || p.startsWith(`${root}/`);

/** The hotbar, shared by the mobile bottom nav and the desktop sidebar. */
export const PRIMARY_NAV: NavItem[] = [
  {
    href: "/home",
    label: "Home",
    icon: "home",
    matches: (p) => p === "/" || ["/home", "/hatch", "/profile"].some((r) => under(p, r)),
  },
  { href: "/hatch", label: "School", icon: "school", activity: "school", matches: (p) => under(p, "/school") },
  { href: "/hatch", label: "Park", icon: "park", activity: "park", matches: (p) => under(p, "/chat") },
  { href: "/hatch", label: "Feed", icon: "feed", activity: "feed", matches: (p) => under(p, "/skills") },
  { href: "/shop", label: "Shop", icon: "shop", matches: (p) => under(p, "/shop") },
];

/** A nav item with its link resolved for the selected turkey. */
export interface ResolvedNavItem extends NavItem {
  /** The selected turkey's need for this activity is low. */
  needsAttention: boolean;
}
