import type { IconName } from "@/components/ui/Icon";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  matches: (pathname: string) => boolean;
}

/** Primary destinations, shared by the mobile bottom nav and the desktop sidebar. */
export const PRIMARY_NAV: NavItem[] = [
  {
    href: "/home",
    label: "Home",
    icon: "home",
    matches: (p) =>
      p === "/" ||
      ["/home", "/hatch", "/school", "/chat", "/skills"].some((r) => p === r || p.startsWith(`${r}/`)),
  },
  { href: "/shop", label: "Shop", icon: "shop", matches: (p) => p.startsWith("/shop") },
  { href: "/profile", label: "You", icon: "profile", matches: (p) => p.startsWith("/profile") },
];
