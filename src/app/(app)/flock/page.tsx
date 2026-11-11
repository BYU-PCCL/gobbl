"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { MyTurkey } from "@/components/turkey/MyTurkey";
import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";
import { useFlock } from "@/components/turkey/useFlock";
import { moodLine } from "@/lib/flock/home";
import { nextStep } from "@/lib/flock/progress";
import type { TurkeyView } from "@/lib/flock/view";

function FlockCard({ turkey: t, selected, onOpen }: { turkey: TurkeyView; selected: boolean; onOpen: () => void }) {
  const step = nextStep(t.hatched, t.done);
  const title = t.hatched ? (t.name ?? "Your turkey") : `${t.skillLabel} egg`;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={selected ? "true" : undefined}
      className={`relative flex w-full flex-col items-center gap-1 rounded-2xl border bg-surface p-4 text-center transition-colors hover:border-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        selected ? "border-primary ring-2 ring-primary/30" : "border-line"
      }`}
    >
      {selected && (
        <span className="absolute right-3 top-3 rounded-full bg-primary-soft px-2 py-0.5 font-body text-[11px] font-semibold text-primary">
          Selected
        </span>
      )}
      <MyTurkey turkey={t} size={120} animate={false} />
      <span className="font-display text-lg font-bold text-ink">{title}</span>
      <span className="font-body text-sm text-ink-soft">
        {t.stageName} · {t.skillLabel}
      </span>
      {t.hatched && <span className="font-body text-sm text-ink">{moodLine(t.mood, t.name)}</span>}
      {step && (
        <span className="font-body text-xs font-semibold text-primary">
          Next: {!t.hatched ? "Hatch" : step === "feed" ? "Feed" : "School"}
        </span>
      )}
    </button>
  );
}

export default function FlockPage() {
  const router = useRouter();
  const { status } = useSession();
  const { turkeys, current, select, reload, loading, error } = useFlock();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  const empty = !loading && !error && turkeys.length === 0;
  useEffect(() => {
    if (empty) router.replace("/hatch");
  }, [empty, router]);

  if (status === "unauthenticated") return null;

  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <p className="font-body text-ink-soft">We could not load your flock: {error}</p>
        <Button onClick={() => void reload()}>Try again</Button>
      </div>
    );
  }

  if (loading || status === "loading" || empty) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 font-body text-ink-soft">
        <TurkeyCharacter stage={1} size={96} decorative />
        Finding your flock...
      </div>
    );
  }

  const open = (t: TurkeyView) => {
    if (t.hatched) {
      select(t.id);
      router.push("/home");
    } else if (turkeys.length === 1) {
      router.push("/home");
    } else {
      router.push("/hatch");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div>
        <h1 className="font-display text-display-lg text-ink">Your flock</h1>
        <p className="font-body text-sm text-ink-soft">Pick a turkey to look after.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {turkeys.map((t) => (
          <FlockCard key={t.id} turkey={t} selected={t.hatched && t.id === current?.id} onOpen={() => open(t)} />
        ))}
      </div>

      {turkeys.some((t) => t.hatched) && (
        <div className="text-center">
          <Link
            href="/shop"
            className="font-body text-sm font-semibold text-primary underline-offset-2 hover:underline"
          >
            Get another egg
          </Link>
        </div>
      )}
    </div>
  );
}
