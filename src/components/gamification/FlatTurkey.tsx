"use client";

import { useId } from "react";
import type { EggPattern } from "@/lib/companion";

/**
 * FlatTurkey — Headspace-style flat illustrated turkey across 8 evolution stages.
 *
 * Replaces the emoji-based TurkeyAvatar. Each stage is a small SVG built from
 * simple primitives so it reads as a single design family. Colors are driven
 * by an optional `palette` prop; defaults are Harvest warm tones.
 *
 *   <FlatTurkey stage={5} size={160} />
 *   <FlatTurkey stage={user.level} size="lg" animate />
 *
 * Levels:
 *   1 Egg · 2 Hatchling · 3 Poult · 4 Youngster
 *   5 Tom · 6 Gobbler · 7 Grand Gobbler · 8 Thunderbird
 */

export type TurkeyStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface FlatTurkeyPalette {
  body?: string;
  bodyDark?: string;
  belly?: string;
  fan1?: string;
  fan2?: string;
  fan3?: string;
  fan4?: string;
  beak?: string;
  wattle?: string;
  eye?: string;
  white?: string;
  egg?: string;
  speck?: string;
  feet?: string;
  crown?: string;
  spark?: string;
}

const DEFAULT_PALETTE: Required<FlatTurkeyPalette> = {
  body:     "#C0461C",
  bodyDark: "#8E2F11",
  belly:    "#E4A547",
  fan1:     "#E4A547",
  fan2:     "#C0461C",
  fan3:     "#7A2916",
  fan4:     "#1F4937",
  beak:     "#F5B73D",
  wattle:   "#B82914",
  eye:      "#1A1612",
  white:    "#FFFFFF",
  egg:      "#F2E1CC",
  speck:    "#C0461C",
  feet:     "#7A2916",
  crown:    "#E4A547",
  spark:    "#FFD86B",
};

export const TURKEY_STAGE_LABELS: Record<TurkeyStage, string> = {
  1: "Egg",
  2: "Hatchling",
  3: "Poult",
  4: "Youngster",
  5: "Tom",
  6: "Gobbler",
  7: "Grand Gobbler",
  8: "Thunderbird",
};

type SizeKey = "xs" | "sm" | "md" | "lg" | "xl";
const SIZE_PX: Record<SizeKey, number> = { xs: 40, sm: 64, md: 96, lg: 160, xl: 220 };

export interface FlatTurkeyProps {
  stage: number;
  /** Numeric px or shorthand */
  size?: number | SizeKey;
  /** Optional palette override (deep-merged onto default Harvest tones) */
  palette?: FlatTurkeyPalette;
  /** Subtle idle motion — float/wiggle on high stages */
  animate?: boolean;
  className?: string;
  /** Stage-1 only: the species' egg markings, drawn with palette.speck / palette.white. */
  eggPattern?: EggPattern;
}

function EggMarks({ pattern, clipId, speck, white }: { pattern?: EggPattern; clipId: string; speck: string; white: string }) {
  switch (pattern) {
    case "flecks":
      return (
        <>
          {([[115, 118, 3], [95, 138, 2.6], [120, 92, 2.4], [78, 116, 2.2], [104, 70, 2], [86, 98, 1.8], [124, 136, 2]] as const).map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={speck} opacity="0.75" />
          ))}
        </>
      );
    case "rings":
      return (
        <>
          {([[116, 96, 6], [82, 118, 7], [104, 138, 5.5]] as const).map(([x, y, r], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={r} fill="none" stroke={speck} strokeWidth="2.4" opacity="0.85" />
              <circle cx={x} cy={y} r="1.4" fill={speck} opacity="0.85" />
            </g>
          ))}
        </>
      );
    case "split":
      return (
        <g clipPath={`url(#${clipId})`}>
          <path d="M102 36 C92 64 112 84 100 100 C90 118 110 138 100 164 L160 164 L160 36 Z" fill={speck} />
        </g>
      );
    case "stripe":
      return (
        <g clipPath={`url(#${clipId})`}>
          <path d="M50 130 L150 80 L150 100 L50 150 Z" fill={speck} opacity="0.85" />
        </g>
      );
    case "tips":
      return (
        <>
          {([[100, 56], [89, 64], [111, 64], [100, 72], [80, 74], [120, 74], [92, 82], [108, 82]] as const).map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="3.2" fill={speck} />
              <circle cx={x} cy={y - 1.6} r="1.7" fill={white} />
            </g>
          ))}
        </>
      );
    default:
      return null;
  }
}

export function FlatTurkey({
  stage,
  size = "md",
  palette,
  animate = false,
  className,
  eggPattern,
}: FlatTurkeyProps) {
  const rawId = useId();
  const clipId = `egg-clip-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const s = Math.max(1, Math.min(8, stage)) as TurkeyStage;
  const px = typeof size === "number" ? size : SIZE_PX[size];
  const p = { ...DEFAULT_PALETTE, ...palette };

  const idleClass =
    animate && s >= 7 ? "animate-wiggle" :
    animate && s >= 5 ? "animate-float"  : "";

  const common = {
    viewBox: "0 0 200 200",
    width: px,
    height: px,
    className: [idleClass, className].filter(Boolean).join(" "),
    "aria-label": TURKEY_STAGE_LABELS[s],
    role: "img" as const,
  };

  if (s === 1) return (
    <svg {...common}>
      {eggPattern && (
        <defs>
          <clipPath id={clipId}><ellipse cx="100" cy="100" rx="46" ry="58" /></clipPath>
        </defs>
      )}
      <ellipse cx="105" cy="105" rx="46" ry="58" fill={p.bodyDark} opacity="0.18" />
      <ellipse cx="100" cy="100" rx="46" ry="58" fill={p.egg} />
      <ellipse cx="86" cy="80" rx="10" ry="15" fill={p.white} opacity="0.7" />
      {eggPattern ? (
        <EggMarks pattern={eggPattern} clipId={clipId} speck={p.speck} white={p.white} />
      ) : (
        <>
          <circle cx="115" cy="118" r="2.5" fill={p.speck} opacity="0.5" />
          <circle cx="95" cy="138" r="2"   fill={p.speck} opacity="0.5" />
          <circle cx="120" cy="95" r="2"   fill={p.speck} opacity="0.5" />
          <circle cx="78" cy="115" r="1.8" fill={p.speck} opacity="0.5" />
        </>
      )}
    </svg>
  );

  if (s === 2) return (
    <svg {...common}>
      {/* Bottom of egg with zigzag */}
      <path d="M58 130 L66 122 L74 130 L82 122 L90 130 L98 122 L106 130 L114 122 L122 130 L130 122 L138 130 Q142 160 100 162 Q58 160 58 130 Z" fill={p.egg}/>
      <path d="M62 134 L70 126 L78 134 L86 126 L94 134 L102 126 L110 134 L118 126 L126 134 L134 126 Q138 158 100 160 Q62 158 62 134 Z" fill={p.bodyDark} opacity="0.1"/>
      {/* Top half of egg cracked, tilted */}
      <g transform="translate(122 50) rotate(28)">
        <path d="M-20 0 Q-22 -22 0 -28 Q22 -22 20 0 L16 8 L8 -2 L0 6 L-8 -4 L-16 4 Z" fill={p.egg}/>
      </g>
      {/* Chick body */}
      <ellipse cx="100" cy="100" rx="28" ry="26" fill={p.belly}/>
      {/* Wisp */}
      <path d="M100 75 Q102 64 96 60" stroke={p.body} strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <circle cx="98" cy="58" r="2.5" fill={p.body}/>
      {/* Eyes */}
      <circle cx="92" cy="96" r="3" fill={p.eye}/>
      <circle cx="108" cy="96" r="3" fill={p.eye}/>
      <circle cx="93" cy="95" r="1" fill={p.white}/>
      <circle cx="109" cy="95" r="1" fill={p.white}/>
      {/* Beak */}
      <path d="M95 106 L105 106 L100 112 Z" fill={p.beak}/>
      {/* Tiny wings */}
      <ellipse cx="80" cy="108" rx="6" ry="9" fill={p.body} opacity="0.6"/>
      <ellipse cx="120" cy="108" rx="6" ry="9" fill={p.body} opacity="0.6"/>
    </svg>
  );

  if (s === 3) return (
    <svg {...common}>
      {/* Tail nubs */}
      <ellipse cx="142" cy="98"  rx="14" ry="8" fill={p.fan1} transform="rotate(-15 142 98)"/>
      <ellipse cx="148" cy="112" rx="14" ry="8" fill={p.fan2}/>
      <ellipse cx="142" cy="126" rx="14" ry="8" fill={p.fan1} transform="rotate(15 142 126)"/>
      {/* Body */}
      <ellipse cx="92" cy="125" rx="38" ry="34" fill={p.bodyDark}/>
      <ellipse cx="90" cy="120" rx="38" ry="34" fill={p.body}/>
      <ellipse cx="82" cy="135" rx="22" ry="14" fill={p.belly} opacity="0.85"/>
      {/* Head */}
      <circle cx="72" cy="86" r="26" fill={p.body}/>
      <ellipse cx="64" cy="78" rx="10" ry="8" fill={p.belly} opacity="0.4"/>
      <circle cx="62" cy="86" r="5"   fill={p.white}/>
      <circle cx="62" cy="87" r="3.2" fill={p.eye}/>
      <circle cx="63" cy="86" r="1"   fill={p.white}/>
      <path d="M48 92 Q42 88 46 96 Q50 100 56 96 Z" fill={p.beak}/>
      <path d="M55 78 Q52 70 58 65" stroke={p.wattle} strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M76 154 L72 162 M86 154 L86 162 M100 154 L100 162 M108 154 L112 162" stroke={p.feet} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );

  if (s === 4) return (
    <svg {...common}>
      {[-50, -25, 0, 25, 50].map((deg, i) => (
        <g key={i} transform={`rotate(${deg} 138 110)`}>
          <ellipse cx="162" cy="110" rx="22" ry="9" fill={i % 2 === 0 ? p.fan1 : p.fan2}/>
        </g>
      ))}
      <ellipse cx="94" cy="124" rx="36" ry="34" fill={p.bodyDark}/>
      <ellipse cx="92" cy="120" rx="36" ry="34" fill={p.body}/>
      <ellipse cx="86" cy="135" rx="22" ry="13" fill={p.belly} opacity="0.9"/>
      <circle cx="74" cy="82" r="24" fill={p.body}/>
      <ellipse cx="66" cy="74" rx="9" ry="7" fill={p.belly} opacity="0.35"/>
      <circle cx="65" cy="82" r="5"   fill={p.white}/>
      <circle cx="65" cy="83" r="3.2" fill={p.eye}/>
      <circle cx="66" cy="82" r="1"   fill={p.white}/>
      <path d="M50 88 Q44 84 48 92 Q52 96 58 92 Z" fill={p.beak}/>
      <path d="M58 72 Q55 64 62 60" stroke={p.wattle} strokeWidth="3" fill="none" strokeLinecap="round"/>
      <ellipse cx="58" cy="96" rx="4" ry="6" fill={p.wattle}/>
      <path d="M78 154 L74 164 M88 154 L88 164 M102 154 L102 164 M112 154 L116 164" stroke={p.feet} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );

  if (s === 5 || s === 6) {
    const isGobbler = s === 6;
    const fanCount  = isGobbler ? 9   : 7;
    const fanRadius = isGobbler ? 86  : 78;
    const fanSpread = isGobbler ? 130 : 110;
    const palette9 = [p.fan3, p.fan2, p.fan1, p.fan4, p.fan1, p.fan2, p.fan3, p.fan2, p.fan1];
    return (
      <svg {...common}>
        {Array.from({ length: fanCount }).map((_, i) => {
          const deg = -fanSpread / 2 + (i * fanSpread) / (fanCount - 1);
          const c = palette9[i % 9];
          return (
            <g key={i} transform={`rotate(${deg} 100 132)`}>
              <ellipse cx="100" cy={132 - fanRadius}        rx="11" ry={fanRadius * 0.5}  fill={c} />
              <ellipse cx="100" cy={132 - fanRadius * 1.1}  rx="6"  ry={fanRadius * 0.18} fill={p.belly} opacity="0.6" />
            </g>
          );
        })}
        <circle cx="100" cy="132" r="16" fill={p.fan3}/>
        <ellipse cx="102" cy="134" rx="34" ry="30" fill={p.bodyDark}/>
        <ellipse cx="100" cy="132" rx="34" ry="30" fill={p.body}/>
        <ellipse cx="100" cy="142" rx="22" ry="14" fill={p.belly}    opacity="0.85"/>
        <ellipse cx="100" cy="124" rx="14" ry="6"  fill={p.bodyDark} opacity="0.3"/>
        <circle cx="100" cy="96" r="22" fill={p.body}/>
        <ellipse cx="92" cy="88" rx="8" ry="7" fill={p.belly} opacity="0.35"/>
        <circle cx="92" cy="96" r="5"   fill={p.white}/>
        <circle cx="108" cy="96" r="5"  fill={p.white}/>
        <circle cx="92" cy="97" r="3.2" fill={p.eye}/>
        <circle cx="108" cy="97" r="3.2" fill={p.eye}/>
        <circle cx="93" cy="96" r="1"   fill={p.white}/>
        <circle cx="109" cy="96" r="1"  fill={p.white}/>
        <path d="M94 106 L106 106 L100 114 Z" fill={p.beak}/>
        <path d="M100 114 Q104 122 96 126" stroke={p.wattle} strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        <ellipse cx="94" cy="112" rx="3" ry="5" fill={p.wattle}/>
        <path d="M92 162 L88 172 M98 162 L98 172 M104 162 L104 172 M112 162 L116 172" stroke={p.feet} strokeWidth="3.5" strokeLinecap="round"/>
      </svg>
    );
  }

  if (s === 7) return (
    <svg {...common}>
      {/* Outer fan */}
      {Array.from({ length: 9 }).map((_, i) => {
        const deg = -80 + i * 20;
        const c = [p.fan3, p.fan2, p.fan1, p.crown, p.fan4, p.crown, p.fan1, p.fan2, p.fan3][i];
        return (
          <g key={`o${i}`} transform={`rotate(${deg} 100 132)`}>
            <ellipse cx="100" cy="42" rx="13" ry="46" fill={c}/>
            <ellipse cx="100" cy="22" rx="7"  ry="14" fill={p.belly} opacity="0.5"/>
          </g>
        );
      })}
      {/* Inner fan */}
      {Array.from({ length: 7 }).map((_, i) => {
        const deg = -55 + i * 18;
        const c = [p.fan2, p.fan1, p.crown, p.belly, p.crown, p.fan1, p.fan2][i];
        return (
          <g key={`i${i}`} transform={`rotate(${deg} 100 132)`}>
            <ellipse cx="100" cy="74" rx="8" ry="28" fill={c}/>
          </g>
        );
      })}
      <ellipse cx="102" cy="134" rx="36" ry="32" fill={p.bodyDark}/>
      <ellipse cx="100" cy="132" rx="36" ry="32" fill={p.body}/>
      <ellipse cx="100" cy="142" rx="24" ry="15" fill={p.belly}    opacity="0.85"/>
      <ellipse cx="100" cy="122" rx="14" ry="6"  fill={p.bodyDark} opacity="0.3"/>
      <circle cx="100" cy="140" r="6" fill={p.crown}/>
      <circle cx="100" cy="140" r="3" fill={p.body}/>
      <circle cx="100" cy="96"  r="24" fill={p.body}/>
      <ellipse cx="92" cy="86" rx="8" ry="7" fill={p.belly} opacity="0.35"/>
      <circle cx="92"  cy="96" r="5.5" fill={p.white}/>
      <circle cx="108" cy="96" r="5.5" fill={p.white}/>
      <circle cx="92"  cy="97" r="3.5" fill={p.eye}/>
      <circle cx="108" cy="97" r="3.5" fill={p.eye}/>
      <circle cx="93"  cy="96" r="1.2" fill={p.white}/>
      <circle cx="109" cy="96" r="1.2" fill={p.white}/>
      <path d="M93 106 L107 106 L100 116 Z" fill={p.beak}/>
      <path d="M100 116 Q106 126 96 130" stroke={p.wattle} strokeWidth="4" fill="none" strokeLinecap="round"/>
      <g transform="translate(140 60)"><path d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z" fill={p.spark}/></g>
      <g transform="translate(56 70)"><path d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z" fill={p.spark}/></g>
      <path d="M88 168 L84 178 M96 168 L96 178 M104 168 L104 178 M112 168 L116 178" stroke={p.feet} strokeWidth="4" strokeLinecap="round"/>
    </svg>
  );

  // s === 8 — Thunderbird
  return (
    <svg {...common}>
      <circle cx="100" cy="100" r="96" fill={p.crown} opacity="0.08"/>
      {Array.from({ length: 11 }).map((_, i) => {
        const deg = -90 + i * 18;
        const c = [p.fan3, p.fan2, p.crown, p.fan1, p.spark, p.belly, p.spark, p.fan1, p.crown, p.fan2, p.fan3][i];
        return (
          <g key={`o${i}`} transform={`rotate(${deg} 100 132)`}>
            <ellipse cx="100" cy="34" rx="13" ry="50" fill={c}/>
            <ellipse cx="100" cy="14" rx="7"  ry="14" fill={p.belly} opacity="0.65"/>
          </g>
        );
      })}
      {Array.from({ length: 7 }).map((_, i) => {
        const deg = -55 + i * 18;
        const c = [p.fan2, p.crown, p.spark, p.belly, p.spark, p.crown, p.fan2][i];
        return (
          <g key={`i${i}`} transform={`rotate(${deg} 100 132)`}>
            <ellipse cx="100" cy="72" rx="9" ry="32" fill={c}/>
          </g>
        );
      })}
      <ellipse cx="102" cy="134" rx="36" ry="32" fill={p.bodyDark}/>
      <ellipse cx="100" cy="132" rx="36" ry="32" fill={p.body}/>
      <ellipse cx="100" cy="142" rx="24" ry="15" fill={p.belly} opacity="0.9"/>
      <path d="M82 78 L88 64 L100 76 L112 64 L118 78 L114 84 L86 84 Z" fill={p.crown}/>
      <circle cx="88"  cy="68" r="2"   fill={p.spark}/>
      <circle cx="100" cy="62" r="2.5" fill={p.spark}/>
      <circle cx="112" cy="68" r="2"   fill={p.spark}/>
      <circle cx="100" cy="100" r="22" fill={p.body}/>
      <ellipse cx="92" cy="92" rx="8" ry="6" fill={p.belly} opacity="0.35"/>
      <circle cx="92"  cy="100" r="5.5" fill={p.white}/>
      <circle cx="108" cy="100" r="5.5" fill={p.white}/>
      <circle cx="92"  cy="101" r="3.5" fill={p.eye}/>
      <circle cx="108" cy="101" r="3.5" fill={p.eye}/>
      <circle cx="93"  cy="100" r="1.2" fill={p.white}/>
      <circle cx="109" cy="100" r="1.2" fill={p.white}/>
      <path d="M93 110 L107 110 L100 120 Z" fill={p.beak}/>
      <path d="M100 120 Q106 130 96 134" stroke={p.wattle} strokeWidth="4" fill="none" strokeLinecap="round"/>
      <g transform="translate(150 50)"><path d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" fill={p.spark}/></g>
      <g transform="translate(46 50)"><path d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z" fill={p.spark}/></g>
      <g transform="translate(166 130)"><path d="M0 -5 L1.2 -1.2 L5 0 L1.2 1.2 L0 5 L-1.2 1.2 L-5 0 L-1.2 -1.2 Z" fill={p.spark}/></g>
      <g transform="translate(30 130)"><path d="M0 -5 L1.2 -1.2 L5 0 L1.2 1.2 L0 5 L-1.2 1.2 L-5 0 L-1.2 -1.2 Z" fill={p.spark}/></g>
      <path d="M88 168 L84 178 M96 168 L96 178 M104 168 L104 178 M112 168 L116 178" stroke={p.feet} strokeWidth="4" strokeLinecap="round"/>
    </svg>
  );
}

/** Tiny inline glyph — for chips, nav, small badges. */
export function FlatTurkeyGlyph({
  palette,
  size = 24,
  className,
}: {
  palette?: FlatTurkeyPalette;
  size?: number;
  className?: string;
}) {
  const p = { ...DEFAULT_PALETTE, ...palette };
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <ellipse cx="17" cy="9"  rx="4.5" ry="2.5" fill={p.fan1} transform="rotate(-15 17 9)"/>
      <ellipse cx="18" cy="13" rx="5"   ry="2.8" fill={p.fan2}/>
      <ellipse cx="17" cy="17" rx="4.5" ry="2.5" fill={p.fan1} transform="rotate(15 17 17)"/>
      <ellipse cx="10" cy="14" rx="6"   ry="5.5" fill={p.body}/>
      <ellipse cx="9"  cy="16" rx="3.5" ry="2.5" fill={p.belly} opacity="0.9"/>
      <circle  cx="7"  cy="12" r="1.6" fill={p.white}/>
      <circle  cx="7"  cy="12.4" r="1" fill={p.eye}/>
      <path d="M3 14 L7 13 L5.5 16 Z" fill={p.beak}/>
    </svg>
  );
}

/** Wrapper with name + level pill underneath. Convenient for profile/leaderboard rows. */
export function FlatTurkeyWithLabel({
  stage,
  size = "md",
  palette,
  animate,
  className = "",
}: FlatTurkeyProps) {
  const s = Math.max(1, Math.min(8, stage)) as TurkeyStage;
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <FlatTurkey stage={s} size={size} palette={palette} animate={animate} />
      <div className="text-center">
        <div className="font-display text-sm font-semibold text-ink">
          {TURKEY_STAGE_LABELS[s]}
        </div>
        <div className="font-mono text-eyebrow uppercase text-ink-muted">
          Level {s}
        </div>
      </div>
    </div>
  );
}
