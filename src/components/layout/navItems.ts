import type { IconName } from "@/components/ui/Icon";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  matches: (pathname: string) => boolean;
}

/** Primary destinations, shared by the mobile bottom nav and the desktop sidebar. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home", matches: (p) => p === "/" || p.startsWith("/dashboard") },
  { href: "/chat", label: "Debate", icon: "debate", matches: (p) => p.startsWith("/chat") },
  { href: "/skills", label: "Skills", icon: "skills", matches: (p) => p.startsWith("/skills") },
  { href: "/shop", label: "Shop", icon: "shop", matches: (p) => p.startsWith("/shop") },
  { href: "/profile", label: "You", icon: "profile", matches: (p) => p.startsWith("/profile") },
];

/** Desktop has room for the leaderboard; on mobile it's reached from the profile page. */
export const SECONDARY_NAV: NavItem[] = [
  { href: "/leaderboard", label: "The Flock", icon: "flock", matches: (p) => p.startsWith("/leaderboard") },
];
