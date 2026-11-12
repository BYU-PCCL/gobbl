"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CoopScene } from "@/components/flock/CoopScene";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { useFlock } from "@/components/turkey/useFlock";
import { EGG_SKILLS } from "@/lib/flock/skills";
import type { TurkeyView } from "@/lib/flock/view";

/**
 * The hub: every turkey and egg the user has, in the coop. Tapping a turkey opens its own
 * page; an egg goes to its lesson or to hatching; an empty box leads to the eggs in the Shop.
 */
export default function FlockPage() {
  const router = useRouter();
  const { status } = useSession();
  const { turkeys, firstEggReady, select, reload, loading, error } = useFlock();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  // Nothing in the coop yet: the first egg is picked on the hatch screen.
  const empty = !loading && !error && turkeys.length === 0;
  useEffect(() => {
    if (empty) router.replace("/hatch");
  }, [empty, router]);

  if (status === "unauthenticated") return null;

  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <p className="font-body text-ink-soft">We could not load your flock.</p>
        <Button onClick={() => void reload()}>Try again</Button>
      </div>
    );
  }

  if (loading || status === "loading" || empty) return <LoadingState message="Finding your flock..." />;

  const open = (t: TurkeyView) => {
    select(t.id);
    router.push("/home");
  };

  const hatched = turkeys.filter((t) => t.hatched).length;
  const subtitle =
    hatched === 0
      ? "Your first egg is warming. Give it a lesson and it will hatch."
      : hatched === 1
        ? "Tap your turkey to look after it."
        : "Tap a turkey to look after it.";

  return (
    <PageShell
      width="wide"
      title="Your flock"
      subtitle={subtitle}
      aside={
        <span className="font-mono text-sm font-semibold text-ink-soft num-tabular" aria-label={`${turkeys.length} of ${EGG_SKILLS.length} nests filled`}>
          {turkeys.length} of {EGG_SKILLS.length}
        </span>
      }
    >
      <CoopScene turkeys={turkeys} firstEggReady={firstEggReady} onOpenTurkey={open} />
    </PageShell>
  );
}
