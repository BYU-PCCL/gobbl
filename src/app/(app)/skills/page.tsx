"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { FlatTurkey } from "@/components/gamification/FlatTurkey";
import { MODULES } from "@/lib/modules/registry";

interface ModuleListItem {
  key: string;
  skill: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  timesCompleted: number;
  progress: { sessionId: string; stage: string; variant: "standard" | "advanced"; inProgress: boolean } | null;
}

// Cosmetic only — 5 skills cycling through the 4 tones the design system has.
const TONES = ["forest", "primary", "ochre", "rust"] as const;

const TONE_BG: Record<string, string> = {
  forest:  "bg-forest-100 text-forest-700",
  primary: "bg-primary-soft text-gobbl-700",
  ochre:   "bg-ochre-soft text-golden-700",
  rust:    "bg-plume-100 text-plume-700",
};
const TONE_BAR: Record<string, string> = {
  forest:  "bg-forest-500",
  primary: "bg-primary",
  ochre:   "bg-ochre",
  rust:    "bg-plume-500",
};
const TONE_FG: Record<string, string> = {
  forest:  "text-forest-600",
  primary: "text-primary",
  ochre:   "text-golden-700",
  rust:    "text-plume-500",
};

function percentComplete(module: ModuleListItem): number {
  if (!module.progress) return 0;
  if (module.progress.stage === "complete") return 100;

  const config = MODULES.find((m) => m.key === module.key);
  const variant = config?.variants.find((v) => v.key === module.progress?.variant);
  if (!variant) return 0;

  const stepIndex = variant.steps.findIndex((s) => s.id === module.progress?.stage);
  if (stepIndex < 0) return 0;
  return Math.round((stepIndex / variant.steps.length) * 100);
}

function levelLabel(module: ModuleListItem): string {
  if (!module.progress) return "Not started";
  if (module.progress.inProgress) return `${percentComplete(module)}%`;
  return module.timesCompleted > 1 ? `Completed ×${module.timesCompleted}` : "Completed";
}

export default function SkillsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [modules, setModules] = useState<ModuleListItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/modules")
        .then((r) => {
          if (!r.ok) throw new Error("load failed");
          return r.json();
        })
        .then(setModules)
        .catch(() => setLoadError(true));
    }
  }, [status, router]);

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="font-body text-sm text-ink-soft">Couldn&apos;t load your skills.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="font-body text-sm font-semibold text-primary underline-offset-2 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!modules) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <FlatTurkey stage={1} size="md" animate />
      </div>
    );
  }

  const active = modules.find((m) => m.progress?.inProgress);
  const activePercent = active ? percentComplete(active) : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
            Skill paths
          </div>
          <h1 className="mt-1.5 font-display text-[32px] font-bold leading-none tracking-[-0.03em]">
            Sharpen
            <br />
            your gobble.
          </h1>
        </div>
        <FlatTurkey stage={4} size={60} />
      </div>

      {/* Active module, if any */}
      {active && (
        <Link
          href={`/skills/${active.key}`}
          className="relative block overflow-hidden rounded-3xl bg-ink p-5 text-bg"
        >
          <div className="pointer-events-none absolute -bottom-7 -right-7 opacity-15">
            <FlatTurkey stage={6} size={160} />
          </div>
          <div className="relative">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ochre">
              Currently learning
            </div>
            <div className="mt-1.5 font-display text-[22px] font-bold tracking-[-0.02em]">
              {active.title}
            </div>
            <div className="mt-1 font-body text-[13px] text-bg/70">{active.description}</div>
            <div className="mt-3.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-ochre transition-[width] duration-700"
                  style={{ width: `${activePercent}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between">
                <span className="font-mono text-[10px] text-bg/55">{activePercent}% complete</span>
                <span className="font-mono text-[10px] text-ochre">Continue →</span>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* All paths */}
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
        All paths
      </div>
      <div className="flex flex-col gap-2.5">
        {modules.map((m, i) => {
          const tone = TONES[i % TONES.length];
          const percent = m.progress ? (m.progress.inProgress ? percentComplete(m) : 100) : 0;
          return (
            <Link
              key={m.key}
              href={`/skills/${m.key}`}
              className="rounded-2xl border border-line bg-surface p-4"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl font-display text-lg font-bold tracking-[-0.02em] ${TONE_BG[tone]}`}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-base font-bold tracking-[-0.02em]">{m.title}</div>
                  <div className="mt-0.5 font-body text-xs text-ink-soft">{m.description}</div>
                </div>
                <div
                  className={`whitespace-nowrap font-mono text-[10px] font-semibold uppercase tracking-[0.06em] ${TONE_FG[tone]}`}
                >
                  {levelLabel(m)}
                </div>
              </div>
              <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-bg">
                <div
                  className={`h-full rounded-full ${TONE_BAR[tone]} transition-[width] duration-700`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
