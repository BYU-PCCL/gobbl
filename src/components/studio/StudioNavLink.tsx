"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

/**
 * The sidebar entry point to Module Studio. Self-contained on purpose: it asks
 * the Studio API whether to show itself, so the Gobbl shell needs to know
 * nothing about Studio access. Renders nothing unless the user has the flag.
 */
export function StudioNavLink() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/studio/access")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.access === true) setAllowed(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!allowed) return null;

  return (
    <Link
      href="/studio"
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-body text-[15px] font-semibold text-ink-soft transition-colors hover:bg-surface hover:text-ink"
    >
      <Icon name="sparkle" />
      Module Studio
    </Link>
  );
}
