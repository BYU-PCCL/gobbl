"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Icon } from "@/components/ui/Icon";
import type { UserSummary } from "./useUserSummary";

/**
 * Top app bar for phones and tablets: avatar and greeting on the left, feather
 * balance on the right. The sidebar carries both at lg, so this hides there.
 */
export function TopAppBar({ user }: { user: UserSummary | null }) {
  const { data: session } = useSession();
  const name = user?.username ?? session?.user?.name ?? "";
  const initial = (name[0] ?? "G").toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-bg lg:hidden">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3 sm:px-8">
        <Link href="/profile" className="group flex items-center gap-2.5 rounded-full">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-display text-base font-bold text-white shadow-soft transition-transform group-active:scale-95">
            {initial}
          </div>
          <div className="leading-tight">
            <div className="font-body text-sm font-semibold text-ink">Hey, {name || "friend"}</div>
            {user?.levelName && (
              <div className="font-body text-xs text-ink-muted">
                Level {user.level}, {user.levelName}
              </div>
            )}
          </div>
        </Link>

        <Link
          href="/shop"
          aria-label={`${(user?.featherBalance ?? 0).toLocaleString()} feathers. Open the shop`}
          className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 transition-colors hover:border-ink-muted"
        >
          <Icon name="feather" size={14} />
          <span className="font-mono text-[13px] font-semibold text-ink num-tabular">
            {(user?.featherBalance ?? 0).toLocaleString()}
          </span>
        </Link>
      </div>
    </header>
  );
}
