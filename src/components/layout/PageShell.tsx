import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

const WIDTHS = {
  /** One focused column: a single turkey, a form, a lesson step. */
  narrow: "max-w-xl",
  /** Reading width: lists and results. */
  default: "max-w-3xl",
  /** Grids and two-column layouts. */
  wide: "max-w-6xl",
} as const;

export interface PageShellProps {
  width?: keyof typeof WIDTHS;
  /** The page's h1. Leave out for pages whose scene is the heading (a turkey's own page). */
  title?: ReactNode;
  /** Small line above the title, e.g. the section name. */
  eyebrow?: ReactNode;
  /** One line under the title. */
  subtitle?: ReactNode;
  /** Where the page sits in the app: a link back to its parent. */
  back?: { href: string; label: string };
  /** Sits to the right of the title, e.g. a count. */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * The shared page container. AppShell owns the side padding and the space around the
 * page, so pages set only their width here and never add their own horizontal padding.
 */
export function PageShell({
  width = "default",
  title,
  eyebrow,
  subtitle,
  back,
  aside,
  className = "",
  children,
}: PageShellProps) {
  const hasHeader = Boolean(title || back);
  return (
    <div className={`mx-auto w-full ${WIDTHS[width]} ${className}`}>
      {hasHeader && (
        <header className="mb-6">
          {back && (
            <Link
              href={back.href}
              className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 font-body text-sm font-semibold text-ink-soft hover:text-ink"
            >
              <Icon name="arrow-left" size={16} />
              {back.label}
            </Link>
          )}
          {title && (
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                {eyebrow && <p className="eyebrow mb-2 text-primary">{eyebrow}</p>}
                <h1 className="break-words font-display text-display-md text-ink lg:text-display-lg">{title}</h1>
                {subtitle && <p className="mt-1.5 font-body text-sm text-ink-soft">{subtitle}</p>}
              </div>
              {aside && <div className="shrink-0">{aside}</div>}
            </div>
          )}
        </header>
      )}
      {children}
    </div>
  );
}
