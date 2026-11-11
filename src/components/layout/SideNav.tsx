"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { MyTurkey } from "@/components/turkey/MyTurkey";
import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";
import type { ResolvedNavItem } from "./navItems";
import { AttentionDot, LockGlyph } from "./BottomNav";
import type { TurkeyView } from "@/lib/flock/view";
import type { UserSummary } from "./useUserSummary";

/**
 * Desktop sidebar (lg and up). Deliberately quiet: wordmark, destinations,
 * and the user's feathers and profile bubble pinned to the bottom.
 */
export function SideNav({
  user,
  items,
  turkey,
}: {
  user: UserSummary | null;
  items: ResolvedNavItem[];
  turkey: TurkeyView | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface-2/40 px-4 py-6 lg:flex">
      <Link href="/home" className="mb-8 flex items-center gap-2 rounded-xl px-3">
        <TurkeyCharacter stage={5} size={30} crop="head" decorative />
        <span className="font-display text-[26px] font-bold tracking-[-0.04em] text-ink">Gobbl</span>
      </Link>

      <nav aria-label="Primary" className="flex flex-col gap-1">
        {items.map((item) => (
          <SideNavLink key={item.label} item={item} active={item.matches(pathname)} />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <Link
          href="/shop"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface"
        >
          <Icon name="feather" size={18} />
          <span className="font-mono text-sm font-semibold text-ink num-tabular">
            {(user?.featherBalance ?? 0).toLocaleString()}
          </span>
          <span className="font-body text-sm text-ink-muted">feathers</span>
        </Link>
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5 transition-colors hover:border-ink-muted"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft">
            <MyTurkey turkey={turkey} size={26} crop="head" decorative />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate font-body text-sm font-semibold text-ink">{user?.username ?? " "}</div>
            {user && <div className="truncate font-body text-xs text-ink-muted">Level {user.level}</div>}
          </div>
        </Link>
      </div>
    </aside>
  );
}

function SideNavLink({ item, active }: { item: ResolvedNavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-disabled={item.locked ? "true" : undefined}
      title={item.locked ? item.lockedReason : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-body text-[15px] font-semibold transition-colors ${
        active ? "bg-primary-soft text-primary" : "text-ink-soft hover:bg-surface hover:text-ink"
      } ${item.locked ? "opacity-40" : ""}`}
    >
      <span className="relative flex">
        <Icon name={item.icon} />
        {item.needsAttention && !item.locked && <AttentionDot className="-right-1 -top-1" />}
      </span>
      {item.label}
      {item.needsAttention && <span className="sr-only"> (needed)</span>}
      {item.locked && (
        <>
          <LockGlyph className="ml-auto" />
          <span className="sr-only"> (locked: {item.lockedReason})</span>
        </>
      )}
    </Link>
  );
}
