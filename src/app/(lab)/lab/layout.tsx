import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { getStudioAccess } from "@/lib/studio/access";

export const metadata = { title: "Gobbl Lab" };

/**
 * Prototypes the team is trying out before they become part of Gobbl. Same gate as Module
 * Studio (signed in, with studio access), and its own route group so it renders outside the
 * Gobbl app shell. Nothing here is saved or counted toward anyone's XP.
 */
export default async function LabLayout({ children }: { children: React.ReactNode }) {
  const access = await getStudioAccess();
  if (access.status === "unauthenticated") redirect("/");
  if (access.status === "forbidden") redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-surface px-4 lg:px-6">
        <Link href="/lab/knowledge" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-bg">
            <Icon name="feather" size={16} />
          </span>
          <span className="font-display text-lg font-bold tracking-[-0.03em]">Gobbl Lab</span>
          <span className="rounded-full bg-golden-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-golden-700">
            Prototype
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden font-body text-sm text-ink-muted sm:inline">{access.user.username}</span>
          <Link
            href="/studio"
            className="flex items-center gap-1.5 font-body text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
          >
            <Icon name="arrow-left" size={16} />
            Studio
          </Link>
        </div>
      </header>
      <main className="flex-1 px-4 py-8 lg:px-6 lg:py-10">{children}</main>
    </div>
  );
}
