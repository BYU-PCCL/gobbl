"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ACCOUNT_MISSING_CALLBACK_URL } from "@/lib/signOutReasons";

export interface UserSummary {
  username: string;
  level: number;
  levelName: string;
  featherBalance: number;
}

/**
 * The signed-in user's name, level and feather balance for the app chrome.
 * Refetches on navigation so the balance reflects purchases and finished debates.
 *
 * Also the one place that notices a dead session. With the JWT strategy a signed
 * cookie can outlive its account (database move, deleted user) and the server has
 * no way to revoke it, so when /api/user says the user is gone (404) or the token
 * is rejected (401), clear the cookie here and send them to the landing page.
 * Every page under (app) renders this hook, so no page has to handle it itself.
 */
export function useUserSummary(): UserSummary | null {
  const { status } = useSession();
  const pathname = usePathname();
  const [user, setUser] = useState<UserSummary | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/user")
      .then((r) => {
        if (r.status === 401 || r.status === 404) {
          if (!cancelled) void signOut({ callbackUrl: ACCOUNT_MISSING_CALLBACK_URL });
          return null;
        }
        return r.ok ? r.json() : null;
      })
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
