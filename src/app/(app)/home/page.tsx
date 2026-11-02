"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TurkeyCharacter, type TurkeyReaction } from "@/components/turkey/TurkeyCharacter";
import { FlockSwitcher } from "@/components/turkey/FlockSwitcher";
import { NeedBars } from "@/components/turkey/NeedBars";
import { SkillTrend } from "@/components/turkey/SkillTrend";
import { useFlock } from "@/components/turkey/useFlock";
import { fetchJson } from "@/lib/fetchJson";
import { activityHref, emphasizedActivity, moodLine, type HomeActivity } from "@/lib/flock/home";
import type { TurkeyView } from "@/lib/flock/view";
import type { EquippedCosmetics } from "@/lib/shop";

type TrendData = { points: number[]; delta: number | null };

const ACTIVITIES: { key: HomeActivity; label: string }[] = [
  { key: "school", label: "School" },
  { key: "park", label: "Park" },
  { key: "feed", label: "Feed" },
];

export default function HomePage() {
  const router = useRouter();
  const { status } = useSession();
  const { turkeys, current, select, reload, loading, error } = useFlock();

  const [trend, setTrend] = useState<TrendData | null>(null);
  const [equipped, setEquipped] = useState<EquippedCosmetics | undefined>(undefined);
  const [reaction, setReaction] = useState<TurkeyReaction>("none");

  const needsHatch = !loading && !error && (turkeys.length === 0 || turkeys.some((t) => !t.hatched));

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    if (needsHatch) router.replace("/hatch");
  }, [needsHatch, router]);

  // Equipped cosmetics come from the existing shop endpoint; decoration is optional.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetchJson<{ equipped: EquippedCosmetics }>("/api/shop")
      .then((d) => {
        if (!cancelled) setEquipped(d.equipped);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status]);

  const currentId = current?.id ?? null;
  useEffect(() => {
    if (!currentId) return;
    let cancelled = false;
    setTrend(null);
    fetchJson<{ turkey: TurkeyView; trend: TrendData }>(`/api/turkeys/${currentId}`)
      .then((d) => {
        if (!cancelled) setTrend(d.trend);
      })
      .catch(() => {
        if (!cancelled) setTrend({ points: [], delta: null });
      });
    return () => {
      cancelled = true;
    };
  }, [currentId]);

  if (status === "unauthenticated") return null;

  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <p className="font-body text-ink-soft">We could not load your flock: {error}</p>
        <Button onClick={() => void reload()}>Try again</Button>
      </div>
    );
  }

  if (loading || status === "loading" || needsHatch || !current) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center font-body text-ink-soft">
        Finding your turkey...
      </div>
    );
  }

  const emphasis = emphasizedActivity(current.needs);
  const name = current.name ?? "Your turkey";

  return (
    <div className="mx-auto max-w-md space-y-5 px-4 py-6">
      <FlockSwitcher turkeys={turkeys} currentId={current.id} onSelect={select} />

      <div className="flex flex-col items-center text-center">
        <TurkeyCharacter
          stage={current.stage}
          mood={current.mood}
          skill={current.skill}
          equipped={equipped}
          reaction={reaction}
          onReactionEnd={() => setReaction("none")}
          onTap={() => setReaction("pet")}
          size={240}
          label={name}
        />
        <h1 className="mt-2 font-display text-display-lg text-ink">{name}</h1>
        <p className="font-body text-sm text-ink-soft">
          {current.stageName} · {current.skillLabel}
        </p>
      </div>

      <Card className="space-y-4 p-4">
        <NeedBars needs={current.needs} />
        <p className="text-center font-body text-sm font-semibold text-ink" aria-live="polite">
          {moodLine(current.mood, current.name)}
        </p>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {ACTIVITIES.map(({ key, label }) => (
          <Button
            key={key}
            variant={emphasis === key ? "primary" : "secondary"}
            className="w-full"
            onClick={() => router.push(activityHref(key, current))}
          >
            {label}
          </Button>
        ))}
      </div>

      <Card className="p-4">
        <h2 className="mb-2 font-display text-base font-bold text-ink">{current.skillLabel} trend</h2>
        {trend ? (
          <SkillTrend points={trend.points} delta={trend.delta} />
        ) : (
          <p className="font-body text-sm text-ink-soft">Loading...</p>
        )}
      </Card>
    </div>
  );
}
