import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

/** Module Studio chrome: a slim top bar and a wide workspace. */
export function StudioShell({ username, children }: { username: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-surface px-4 lg:px-6">
        <Link href="/studio" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-bg">
            <Icon name="sparkle" size={16} />
          </span>
          <span className="font-display text-lg font-bold tracking-[-0.03em]">Module Studio</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden font-body text-sm text-ink-muted sm:inline">{username}</span>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 font-body text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
          >
            <Icon name="arrow-left" size={16} />
            Back to Gobbl
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-6 lg:py-8">{children}</main>
    </div>
  );
}
