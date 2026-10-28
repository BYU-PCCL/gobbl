"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { FlatTurkey, FlatTurkeyGlyph } from "@/components/gamification/FlatTurkey";
import { SPECIES, getSpecies, professorIntro, PROFESSOR_NAME, type SpeciesId } from "@/lib/companion";
import { MODULES } from "@/lib/modules/registry";
import { MODULE_MOVES } from "@/lib/moves";
import { fetchJson } from "@/lib/fetchJson";

const TWIG = "repeating-linear-gradient(100deg, #8A5A34 0 5px, #5E3B1F 5px 8px, #8A5A34 8px 14px)";
const TWIG_FRONT = "repeating-linear-gradient(80deg, #8A5A34 0 6px, #5E3B1F 6px 9px, #8A5A34 9px 15px)";

/** Back row of 3, front row of 2 (percent of the scene). */
const POS = [
  { x: 21, y: 44, r: -9, z: 1, s: 0.84 },
  { x: 50, y: 40, r: 3, z: 1, s: 0.84 },
  { x: 79, y: 44, r: 9, z: 1, s: 0.84 },
  { x: 34, y: 68, r: -5, z: 2, s: 1 },
  { x: 66, y: 67, r: 6, z: 2, s: 1 },
];

export default function EggPage() {
  const { status } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [chosen, setChosen] = useState<SpeciesId | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
      return;
    }
    if (status !== "authenticated") return;
    let cancelled = false;
    fetchJson<{ username: string; companion?: { speciesId: string | null } }>("/api/user")
      .then((u) => {
        if (cancelled) return;
        if (u.companion?.speciesId) {
          router.replace("/dashboard");
          return;
        }
        setUsername(u.username);
        setReady(true);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setReady(true);
      });
    return () => { cancelled = true; };
  }, [status, router]);

  async function choose() {
    if (!chosen || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speciesId: chosen }),
      });
      if (!res.ok && res.status !== 409) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not save your egg");
      }
      router.replace("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your egg");
      setSaving(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <FlatTurkey stage={1} size="md" animate />
      </div>
    );
  }

  const sp = chosen ? getSpecies(chosen) : null;
  const mod = sp ? MODULES.find((m) => m.key === sp.suggestedModuleKey) : null;
  const move = sp ? MODULE_MOVES[sp.suggestedModuleKey] : null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg px-5 py-6 sm:px-8">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft">
            <FlatTurkeyGlyph size={30} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="eyebrow mb-1 text-ink-muted">{PROFESSOR_NAME}</div>
            <p aria-live="polite" className="rounded-2xl border border-line bg-surface px-4 py-3 font-body text-[15px] leading-snug text-ink">
              {sp ? sp.professorLine : professorIntro(username)}
            </p>
          </div>
        </div>

        <div className="relative isolate min-h-[360px] overflow-hidden rounded-[28px] border border-line bg-surface-2 sm:min-h-[420px]">
          <div aria-hidden className="absolute -right-8 -top-10 -z-10 h-36 w-36 rounded-full bg-ochre-soft" />
          <div
            aria-hidden
            className="absolute bottom-2.5 left-[3%] h-[68%] w-[94%] rounded-[50%] bg-ochre-soft"
            style={{ boxShadow: "inset 0 -6px 0 rgba(228,165,71,0.35)" }}
          >
            <div
              className="absolute bottom-[12%] left-1/2 h-[74%] w-[84%] -translate-x-1/2 rounded-[50%] border-[3px]"
              style={{ backgroundImage: TWIG, borderColor: "#5E3B1F" }}
            />
            <div
              className="absolute bottom-[6%] left-1/2 h-[36%] w-[84%] -translate-x-1/2 border-[3px] border-t-0"
              style={{ backgroundImage: TWIG_FRONT, borderColor: "#5E3B1F", borderRadius: "0 0 50% 50% / 0 0 100% 100%" }}
            />
          </div>
          {SPECIES.map((s, i) => {
            const p = POS[i % POS.length];
            const lifted = chosen === s.id;
            const dim = chosen !== null && !lifted;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={lifted}
                aria-label={`${s.commonName} egg`}
                onClick={() => setChosen(s.id)}
                className="absolute flex flex-col items-center rounded-[40%] transition-[transform,opacity] duration-200 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-forest-500"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  zIndex: lifted ? 10 : p.z + 1,
                  opacity: dim ? 0.55 : 1,
                  transform: `translate(-50%, calc(-50% + ${lifted ? "-16px" : "0px"})) rotate(${p.r}deg) scale(${p.s * (lifted ? 1.1 : 1)})`,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <span style={{ filter: lifted ? "drop-shadow(0 14px 8px rgba(92,74,58,0.32))" : "drop-shadow(0 8px 5px rgba(92,74,58,0.25))" }}>
                  <FlatTurkey stage={1} size={150} palette={s.palette} eggPattern={s.eggPattern} />
                </span>
                <span className="pointer-events-none absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink">
                  {s.commonName}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          {sp ? (
            <>
              <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-forest-fg">{sp.commonName}</h2>
              {mod && <p className="font-body text-[15px] font-semibold text-ink">Wants to practice: {mod.title}</p>}
              <p className="font-body text-sm leading-snug text-ink-soft">{sp.eggDesc}</p>
              {mod && move && (
                <p className="font-mono text-xs text-ink-muted">
                  {mod.estimatedMinutes} min module · learns {move.name}
                </p>
              )}
              {error && <p role="alert" className="font-body text-sm text-primary">{error}</p>}
              <Button className="mt-2 w-full" size="lg" onClick={choose} loading={saving}>
                Choose this egg
              </Button>
            </>
          ) : (
            <>
              <p className="font-body text-sm text-ink-soft">Tap an egg to meet it.</p>
              {error && <p role="alert" className="font-body text-sm text-primary">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
