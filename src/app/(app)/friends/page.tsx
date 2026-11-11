"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FriendsList, type FriendEntry } from "@/components/friends/FriendsList";
import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";

export default function FriendsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<FriendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      setLoading(true);
      setLoadError(false);
      fetch("/api/friends")
        .then((r) => {
          if (!r.ok) throw new Error("load failed");
          return r.json();
        })
        .then(setData)
        .catch(() => setLoadError(true))
        .finally(() => setLoading(false));
    }
  }, [status, router, attempt]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 lg:gap-8">
      <div>
        <Link href="/profile" className="font-body text-sm font-semibold text-primary underline-offset-2 hover:underline">
          Back to profile
        </Link>
        <h1 className="mt-1 font-display text-[32px] font-bold leading-none tracking-[-0.03em] lg:text-[56px]">
          Friends
        </h1>
        <p className="mt-2 font-body text-sm text-ink-soft lg:text-base">
          Other people practicing here, and how their turkeys are getting on.
        </p>
      </div>

      {loading || status === "loading" ? (
        <div className="flex items-center justify-center py-16">
          <TurkeyCharacter stage={1} size={96} decorative />
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-body text-sm text-ink-soft">Couldn&apos;t load your friends.</p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="font-body text-sm font-semibold text-primary underline-offset-2 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <FriendsList data={data} />
      )}
    </div>
  );
}
