"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export interface UserSummary {
  username: string;
  level: number;
  levelName: string;
  featherBalance: number;
}

/**
 * The signed-in user's name, level and feather balance for the app chrome.
 * Refetches on navigation so the balance reflects purchases and finished debates.
 */
export function useUserSummary(): UserSummary | null {
  const { status } = useSession();
  const pathname = usePathname();
  const [user, setUser] = useState<UserSummary | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/user")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setUser({
          username: data.username,
          level: data.level,
          levelName: data.levelInfo?.name ?? "",
          featherBalance: data.featherBalance,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [status, pathname]);

  return user;
}
