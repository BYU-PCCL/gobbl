"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Icon } from "@/components/ui/Icon";
import { MyTurkey } from "@/components/turkey/MyTurkey";
import type { TurkeyView } from "@/lib/flock/view";
import type { UserSummary } from "./useUserSummary";

/**
 * Top app bar for phones and tablets: avatar and greeting on the left, feather
 * balance on the right. The sidebar carries both at lg, so this hides there.
 */
export function TopAppBar({ user, turkey }: { user: UserSummary | null; turkey: TurkeyView | null }) {
  const { data: session } = useSession();
  const name = user?.username ?? session?.user?.name ?? "";

  return (
    <header className="sticky top-0 z-40 bg-bg lg:hidden">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3 sm:px-8">
        <Link href="/profile" className="group flex items-center gap-2.5 rounded-full">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft shadow-soft transition-transform group-active:scale-95">
            <MyTurkey turkey={turkey} size={28} crop="head" decorative />
          </div>
          <div className="leading-tight">
            <div className="max-w-[11rem] truncate font-body text-sm font-semibold text-ink">Hey, {name || "friend"}</div>
            {/* Fixed height so the bar does not shift when the level arrives. */}
            <div className="h-4 font-body text-xs text-ink-muted">{user && `Level ${user.level}`}</div>
          </div>
        </Link>

        <Link
          href="/shop"
          aria-label={user ? `${user.featherBalance.toLocaleString()} feathers. Open the shop` : "Open the shop"}
          className="relative flex min-w-[3.5rem] items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 transition-colors after:absolute after:inset-x-0 after:-inset-y-2 after:content-[''] hover:border-ink-muted"
        >
          <Icon name="feather" size={14} />
          <span className="font-mono text-[13px] font-semibold text-ink num-tabular">
            {user ? user.featherBalance.toLocaleString() : <span className="inline-block w-3" />}
          </span>
        </Link>
      </div>
    </header>
  );
}
