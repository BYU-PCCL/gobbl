"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";
import type { TurkeySkillKey } from "@/lib/flock/skills";
import type { EggPattern } from "@/lib/companion";
import type { TurkeyPalette } from "@/lib/turkeyPalette";

/**
 * An egg whose shell is two pieces split along a zig-zag seam. Each tap rocks it harder and
 * reveals more of the seam; when `hatched` flips on, the top half lifts away, the bottom half
 * stays as a cup and the chick rises out of it. Decorative: the page supplies the labelled
 * tap button.
 *
 * The art is the stage-1 TurkeyCharacter drawn twice behind complementary clip-paths, so the
 * pieces always match the egg the user picked. Egg geometry (TurkeyCharacter): centre 100,100
 * in a 200 viewBox, 92 wide, 116 tall, so a seam at y=100 crosses the middle.
 */
export interface EggHatchProps {
  /** Decides the species look (colours, pattern). Ignored when `palette` is given. */
  skill?: TurkeySkillKey;
  palette?: TurkeyPalette;
  eggPattern?: EggPattern;
  /** Taps so far, 0..total. */
  progress: number;
  /** Taps needed. */
  total: number;
  /** true plays the break-apart and leaves the chick showing. */
  hatched: boolean;
  /** Pixel size of the square drawing. Default 240. */
  size?: number;
  /** Called once, after the chick has settled (or straight away under reduced motion). */
  onHatched?: () => void;
  className?: string;
}

/** Seam points in the 200 viewBox: across the egg's middle, alternating up and down. */
const SEAM: Array<[number, number]> = Array.from({ length: 13 }, (_, i) => [54 + (i * 92) / 12, i % 2 ? 106 : 94]);
const SEAM_PATH = SEAM.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y}`).join(" ");

const pct = (n: number) => `${(n / 2).toFixed(2)}%`;
const seamPts = SEAM.map(([x, y]) => `${pct(x)} ${pct(y)}`);
const firstY = pct(SEAM[0][1]);
const lastY = pct(SEAM[SEAM.length - 1][1]);
const TOP_CLIP = `polygon(-30% -40%, 130% -40%, 130% ${lastY}, ${[...seamPts].reverse().join(", ")}, -30% ${firstY})`;
const BOTTOM_CLIP = `polygon(-30% ${firstY}, ${seamPts.join(", ")}, 130% ${lastY}, 130% 130%, -30% 130%)`;
/** Keeps the chick above the cup's lower edge, and drops its own drawn shell: the loose cap beside its head and the lower half, which the cup replaces. */
const CHICK_OUTER_CLIP = "polygon(-30% -60%, 130% -60%, 130% 79%, -30% 79%)";
const CHICK_INNER_CLIP = "polygon(-30% -60%, 54% -60%, 54% 38%, 130% 38%, 130% 64%, -30% 64%)";

const HATCH_SETTLE_MS = 1300;

export function EggHatch({
  skill,
  palette,
  eggPattern,
  progress,
  total,
  hatched,
  size = 240,
  onHatched,
  className,
}: EggHatchProps) {
  const doneRef = useRef(onHatched);
  useEffect(() => {
    doneRef.current = onHatched;
  }, [onHatched]);

  useEffect(() => {
    if (!hatched) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => doneRef.current?.(), reduce ? 60 : HATCH_SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [hatched]);

  const frac = total > 0 ? Math.min(1, Math.max(0, progress / total)) : 0;
  const rockDeg = 2 + frac * 8;
  const sepPx = frac * 3; // the halves drift apart a little more each tap
  const box: CSSProperties = { width: size, height: size };
  const layer: CSSProperties = { position: "absolute", inset: 0 };

  const egg = (
    <TurkeyCharacter
      stage={1}
      size={size}
      skill={skill}
      palette={palette}
      eggPattern={eggPattern}
      animate={false}
      showShadow={false}
      decorative
    />
  );

  return (
    <div className={`relative ${className ?? ""}`} style={box} aria-hidden>
      {/* Ground shadow, fixed while the egg rocks */}
      <div
        className="absolute left-1/2 rounded-[50%] bg-ink/15"
        style={{ width: size * 0.4, height: size * 0.05, top: size * 0.8, transform: "translateX(-50%)" }}
      />

      {/* Chick, behind the bottom half so it appears to rise out of it */}
      {hatched && (
        <div style={{ ...layer, clipPath: CHICK_OUTER_CLIP }}>
          {/* Lifted so the face clears the rim of the cup once the chick has settled. */}
          <div style={{ ...layer, transform: "translateY(-13%)" }}>
            <div className="animate-chick-rise motion-reduce:[animation-delay:0ms]" style={{ ...layer, clipPath: CHICK_INNER_CLIP }}>
              <TurkeyCharacter stage={2} size={size} skill={skill} palette={palette} eggPattern={eggPattern} animate={false} showShadow={false} decorative />
            </div>
          </div>
        </div>
      )}

      {/* The shell. Rocks once per tap (key restarts the one-shot). */}
      <div
        key={hatched ? "hatched" : progress}
        className={!hatched && progress > 0 ? "animate-egg-rock" : undefined}
        style={{ ...layer, transformOrigin: "50% 80%", ["--rock" as string]: `${rockDeg}deg` }}
      >
        <div style={{ ...layer, clipPath: BOTTOM_CLIP, transform: hatched ? undefined : `translateY(${sepPx * 0.3}px)` }}>{egg}</div>
        <div
          className={hatched ? "animate-shell-lift" : undefined}
          style={{
            ...layer,
            clipPath: TOP_CLIP,
            transformOrigin: "50% 50%",
            transform: hatched ? undefined : `translateY(${-sepPx}px)`,
            ["--sep" as string]: `${-sepPx}px`,
          }}
        >
          {egg}
        </div>
        {/* Seam line, revealed along its length with each tap */}
        <svg
          viewBox="0 0 200 200"
          width={size}
          height={size}
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{ opacity: hatched ? 0 : 1, transform: `translateY(${-sepPx * 0.35}px)` }}
        >
          <path
            d={SEAM_PATH}
            pathLength={1}
            fill="none"
            stroke="#561B0F"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1 1"
            strokeDashoffset={1 - frac}
            opacity={frac > 0 ? 0.75 : 0}
            style={{ transition: "stroke-dashoffset 0.4s ease-out" }}
          />
        </svg>
      </div>
    </div>
  );
}

export default EggHatch;
