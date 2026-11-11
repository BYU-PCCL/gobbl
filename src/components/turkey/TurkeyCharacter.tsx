"use client";

/**
 * TurkeyCharacter — the placeholder Finch-style turkey.
 *
 * This is the single swap point for the artist's final design: every new
 * screen draws the turkey through this component and nothing else. Keep the
 * props contract stable and replace the drawing inside.
 *
 * Everything is one inline SVG in a 200×200 viewBox. Head / neck / chest
 * positions per stage follow FlatTurkey's geometry so existing shop items
 * (ItemLayers + avatarAnchors) still sit on the turkey. Items live inside the
 * same animated group as the body, so they bob and react with it.
 */

import React, { useEffect, useId, useRef, useState } from "react";
import { ItemLayer, ITEM_RENDERERS } from "@/components/gamification/ItemLayers";
import { getSlotOffset } from "@/lib/avatarAnchors";
import type { EquippedCosmetics } from "@/lib/shop";
import type { TurkeyMood } from "@/lib/flock/needs";
import { getTurkeySkill, type TurkeySkillKey } from "@/lib/flock/skills";
import { getSpecies, type EggPattern } from "@/lib/companion";
import { STAGE_NAMES } from "@/lib/flock/growth";

export type TurkeyReaction = "none" | "pet" | "eat" | "cheer" | "listen";

export interface TurkeyCharacterProps {
  stage: number; // 1 = egg … 8
  mood: TurkeyMood;
  skill: TurkeySkillKey; // decides the species look (colours, egg pattern), see lookFor
  equipped?: EquippedCosmetics;
  reaction?: TurkeyReaction; // one-shot; parent resets to "none" via onReactionEnd
  onReactionEnd?: () => void;
  onTap?: () => void;
  size?: number; // px, default 220
  label?: string; // turkey's name, used in the aria-label
  className?: string;
}

const REACTION_MS = 900;

// Theme scale values only (tailwind.config.ts: gobbl / golden / roost).
const C = {
  bodyHi: "#D67448", // gobbl-400
  body: "#C0461C", // gobbl-500 (primary)
  bodyMid: "#A53A14", // gobbl-600
  bodyLo: "#7A2916", // gobbl-700
  bellyHi: "#FEF7E5", // golden-50
  belly: "#F6D58E", // golden-200
  bellyLo: "#E4A547", // golden-400 (ochre)
  beak: "#F0BD56", // golden-300
  beakLo: "#C68A2B", // golden-500
  mouth: "#561B0F", // gobbl-800
  eye: "#1A1612", // roost-900 (ink)
  white: "#FFFFFF", // surface
  cheek: "#E4A78A", // gobbl-300
  eggHi: "#FBF6EB", // roost-50
  egg: "#F4ECDD", // roost-100
  eggLo: "#D4C5A6", // roost-300
  shadow: "#1A1612", // roost-900
  spark: "#F0BD56", // golden-300
  sparkHi: "#FBE9C4", // golden-100
};

// ─── Per-stage geometry ──────────────────────────────────────────────────────

interface Fan {
  px: number;
  py: number;
  count: number;
  len: number;
  spread: number; // degrees
  center: number; // degrees, 0 = straight up, 90 = right
  w: number;
}

interface BirdGeo {
  kind: "side" | "front";
  head: { cx: number; cy: number; r: number };
  body: { cx: number; cy: number; rx: number; ry: number };
  belly: { cx: number; cy: number; rx: number; ry: number };
  eyes: { lx: number; rx: number; y: number };
  beak: { x: number; y: number };
  feet: [number, number];
  fan: Fan;
  innerFan?: Fan;
  groundY: number;
}

const BIRDS: Record<number, BirdGeo> = {
  // Three-quarter view facing left (matches FlatTurkey 3/4 + avatarAnchors offsets)
  3: {
    kind: "side",
    head: { cx: 70, cy: 88, r: 26 },
    body: { cx: 92, cy: 122, rx: 40, ry: 34 },
    belly: { cx: 84, cy: 136, rx: 24, ry: 16 },
    eyes: { lx: 57, rx: 73, y: 88 },
    beak: { x: 64, y: 97 },
    feet: [82, 104],
    fan: { px: 120, py: 114, count: 3, len: 36, spread: 50, center: 72, w: 9 },
    groundY: 160,
  },
  4: {
    kind: "side",
    head: { cx: 72, cy: 84, r: 24 },
    body: { cx: 94, cy: 120, rx: 38, ry: 34 },
    belly: { cx: 88, cy: 135, rx: 24, ry: 15 },
    eyes: { lx: 59, rx: 74, y: 85 },
    beak: { x: 66, y: 94 },
    feet: [84, 106],
    fan: { px: 122, py: 112, count: 5, len: 48, spread: 90, center: 62, w: 10 },
    groundY: 160,
  },
  // Front-facing (matches FlatTurkey 5–8)
  5: {
    kind: "front",
    head: { cx: 100, cy: 96, r: 23 },
    body: { cx: 100, cy: 134, rx: 38, ry: 32 },
    belly: { cx: 100, cy: 144, rx: 24, ry: 16 },
    eyes: { lx: 92, rx: 108, y: 95 },
    beak: { x: 100, y: 103 },
    feet: [90, 110],
    fan: { px: 100, py: 132, count: 7, len: 76, spread: 120, center: 0, w: 12 },
    groundY: 170,
  },
  6: {
    kind: "front",
    head: { cx: 100, cy: 96, r: 23 },
    body: { cx: 100, cy: 134, rx: 38, ry: 32 },
    belly: { cx: 100, cy: 144, rx: 24, ry: 16 },
    eyes: { lx: 92, rx: 108, y: 95 },
    beak: { x: 100, y: 103 },
    feet: [90, 110],
    fan: { px: 100, py: 132, count: 9, len: 84, spread: 140, center: 0, w: 12 },
    groundY: 170,
  },
  7: {
    kind: "front",
    head: { cx: 100, cy: 96, r: 24 },
    body: { cx: 100, cy: 135, rx: 40, ry: 34 },
    belly: { cx: 100, cy: 146, rx: 26, ry: 17 },
    eyes: { lx: 92, rx: 108, y: 95 },
    beak: { x: 100, y: 104 },
    feet: [90, 110],
    fan: { px: 100, py: 132, count: 9, len: 92, spread: 160, center: 0, w: 13 },
    innerFan: { px: 100, py: 132, count: 7, len: 58, spread: 108, center: 0, w: 8 },
    groundY: 172,
  },
  8: {
    kind: "front",
    head: { cx: 100, cy: 100, r: 23 },
    body: { cx: 100, cy: 137, rx: 40, ry: 34 },
    belly: { cx: 100, cy: 148, rx: 26, ry: 17 },
    eyes: { lx: 92, rx: 108, y: 99 },
    beak: { x: 100, y: 108 },
    feet: [90, 110],
    fan: { px: 100, py: 134, count: 11, len: 98, spread: 180, center: 0, w: 13 },
    innerFan: { px: 100, py: 134, count: 7, len: 62, spread: 108, center: 0, w: 9 },
    groundY: 174,
  },
};

const EGG = { cx: 100, cy: 100, rx: 46, ry: 58 };
const CHICK = { cx: 100, cy: 102, rx: 30, ry: 28 };

function groundYFor(stage: number) {
  if (stage === 1) return 160;
  if (stage === 2) return 162;
  return BIRDS[stage].groundY;
}

function topYFor(stage: number) {
  if (stage === 1) return EGG.cy - EGG.ry;
  if (stage === 2) return CHICK.cy - CHICK.ry - 10;
  const h = BIRDS[stage].head;
  return h.cy - h.r;
}

// ─── Scoped styles ───────────────────────────────────────────────────────────

const STYLES = `
.gtc-bob, .gtc-react, .gtc-wobble { transform-box: view-box; }
.gtc-bob { animation: gtc-bob 3.2s ease-in-out infinite; }
.gtc-bob--happy { animation: gtc-bounce 2.4s ease-in-out infinite; }
.gtc-bob--sad { animation: gtc-sag 5s ease-in-out infinite; }
.gtc-wobble { animation: gtc-wobble 3.6s ease-in-out infinite; }
.gtc-wobble--sad { animation-duration: 5.4s; }
.gtc-shadow { transform-box: fill-box; transform-origin: center; animation: gtc-shadow 3.2s ease-in-out infinite; }
.gtc-shadow--happy { animation-duration: 2.4s; }
.gtc-shadow--sad { animation-duration: 5s; }
.gtc-blink { transform-box: fill-box; transform-origin: center; animation: gtc-blink 4.2s ease-in-out infinite; }
.gtc-twinkle { transform-box: fill-box; transform-origin: center; animation: gtc-twinkle 2.6s ease-in-out infinite; }
.gtc-r-pet { animation: gtc-squish 0.9s ease-out; }
.gtc-r-eat { animation: gtc-peck 0.9s ease-in-out; }
.gtc-r-cheer { animation: gtc-hop 0.9s ease-out; }
.gtc-r-listen { animation: gtc-tilt 0.9s ease-in-out; }
.gtc-heart { transform-box: fill-box; transform-origin: center; animation: gtc-float-up 0.9s ease-out both; }
.gtc-sparkle { transform-box: fill-box; transform-origin: center; animation: gtc-pop 0.9s ease-out both; }
.gtc-seed { animation: gtc-seeds 0.9s ease-in forwards; }
@keyframes gtc-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes gtc-bounce {
  0%, 100% { transform: translateY(0) scale(1, 1); }
  35% { transform: translateY(-5px) scale(0.985, 1.02); }
  60% { transform: translateY(-4px) scale(1, 1); }
  85% { transform: translateY(0) scale(1.025, 0.975); }
}
@keyframes gtc-sag { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
@keyframes gtc-wobble {
  0%, 55%, 100% { transform: rotate(0deg); }
  64% { transform: rotate(-4deg); }
  73% { transform: rotate(4deg); }
  82% { transform: rotate(-2deg); }
  91% { transform: rotate(1deg); }
}
@keyframes gtc-shadow { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.92); opacity: 0.8; } }
@keyframes gtc-blink { 0%, 93%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }
@keyframes gtc-twinkle { 0%, 100% { opacity: 0.45; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.1); } }
@keyframes gtc-squish {
  0% { transform: scale(1, 1); }
  20% { transform: scale(1.1, 0.86); }
  45% { transform: scale(0.95, 1.06); }
  70% { transform: scale(1.03, 0.97); }
  100% { transform: scale(1, 1); }
}
@keyframes gtc-peck {
  0%, 100% { transform: translateY(0) scale(1, 1); }
  18%, 58% { transform: translateY(7px) scale(1.02, 0.94); }
  36%, 78% { transform: translateY(0) scale(1, 1); }
}
@keyframes gtc-hop {
  0% { transform: translateY(0) scale(1, 1); }
  12% { transform: translateY(0) scale(1.06, 0.92); }
  35% { transform: translateY(-18px) scale(0.96, 1.05); }
  58% { transform: translateY(0) scale(1.06, 0.94); }
  75% { transform: translateY(-6px) scale(1, 1); }
  90%, 100% { transform: translateY(0) scale(1, 1); }
}
@keyframes gtc-tilt {
  0%, 100% { transform: rotate(0deg); }
  25%, 75% { transform: rotate(-9deg); }
}
@keyframes gtc-float-up {
  0% { opacity: 0; transform: translateY(6px) scale(0.6); }
  25% { opacity: 1; transform: translateY(0) scale(1.1); }
  100% { opacity: 0; transform: translateY(-24px) scale(1); }
}
@keyframes gtc-pop {
  0% { opacity: 0; transform: scale(0) rotate(0deg); }
  35% { opacity: 1; transform: scale(1.2) rotate(20deg); }
  100% { opacity: 0; transform: scale(0.6) rotate(45deg); }
}
@keyframes gtc-seeds { 0%, 60% { opacity: 1; } 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .gtc-root, .gtc-root * { animation: none !important; }
}
`;

// ─── Small parts ─────────────────────────────────────────────────────────────

function Sparkle({ x, y, r, fill, className, delay }: {
  x: number; y: number; r: number; fill: string; className?: string; delay?: number;
}) {
  const k = r * 0.28;
  return (
    <path
      className={className}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      d={`M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k} Z`}
      fill={fill}
    />
  );
}

function FanFeathers({ fan, fills, sheenId, tipOpacity = 0.55 }: {
  fan: Fan; fills: string[]; sheenId: string; tipOpacity?: number;
}) {
  const { px, py, count, len, spread, center, w } = fan;
  return (
    <g>
      {Array.from({ length: count }).map((_, i) => {
        const deg = count === 1 ? center : center - spread / 2 + (i * spread) / (count - 1);
        const fill = fills[i % fills.length];
        const cy = py - len * 0.55;
        const ry = len * 0.5;
        return (
          <g key={i} transform={`rotate(${deg} ${px} ${py})`}>
            <ellipse cx={px} cy={cy} rx={w} ry={ry} fill={fill} />
            {i % 2 === 1 && <ellipse cx={px} cy={cy} rx={w} ry={ry} fill={C.bodyLo} opacity={0.18} />}
            <ellipse cx={px} cy={cy} rx={w} ry={ry} fill={`url(#${sheenId})`} />
            <ellipse cx={px} cy={py - len * 0.9} rx={w * 0.5} ry={len * 0.11} fill={C.bellyHi} opacity={tipOpacity} />
          </g>
        );
      })}
    </g>
  );
}

function Face({ eyes, beak, mood, tint, wattle, facing, blinkStyle }: {
  eyes: { lx: number; rx: number; y: number };
  beak: { x: number; y: number };
  mood: TurkeyMood;
  tint: string;
  wattle: boolean;
  facing: "front" | "left";
  blinkStyle?: React.CSSProperties;
}) {
  const dx = mood === "lonely" ? 2.5 : 0;
  const dy = mood === "hungry" || mood === "sad" ? 1.6 : 0;
  const { lx, rx, y } = eyes;
  const { x: bx, y: by } = beak;
  const cheekOpacity = mood === "happy" ? 0.8 : 0.5;

  const eye = (x: number) => {
    if (mood === "happy") {
      return (
        <path
          key={x}
          d={`M${x - 4} ${y + 1} Q${x} ${y - 4.5} ${x + 4} ${y + 1}`}
          stroke={C.eye}
          strokeWidth={2.6}
          fill="none"
          strokeLinecap="round"
        />
      );
    }
    if (mood === "sad") {
      // Lowered, half-lidded eye
      const ex = x + dx;
      const ey = y + dy;
      return (
        <g key={x}>
          <path d={`M${ex - 3.8} ${ey} A3.8 3.8 0 0 0 ${ex + 3.8} ${ey} Z`} fill={C.eye} />
          <circle cx={ex - 1.2} cy={ey + 1.2} r={0.9} fill={C.white} />
        </g>
      );
    }
    const ex = x + dx;
    const ey = y + dy;
    return (
      <g key={x}>
        <ellipse cx={ex} cy={ey} rx={3.9} ry={4.7} fill={C.eye} />
        <circle cx={ex + 1.2} cy={ey - 1.7} r={1.4} fill={C.white} />
      </g>
    );
  };

  return (
    <g>
      {/* Cheeks */}
      <ellipse cx={lx - 5} cy={y + 8} rx={facing === "left" ? 3.5 : 4.5} ry={2.6} fill={C.cheek} opacity={cheekOpacity} />
      <ellipse cx={rx + 5} cy={y + 8} rx={4.5} ry={2.6} fill={C.cheek} opacity={cheekOpacity} />
      {/* Sad brows */}
      {mood === "sad" && (
        <g stroke={C.bodyLo} strokeWidth={1.6} strokeLinecap="round" fill="none">
          <path d={`M${lx - 4} ${y - 4.5} L${lx + 3} ${y - 7}`} />
          <path d={`M${rx - 3} ${y - 7} L${rx + 4} ${y - 4.5}`} />
        </g>
      )}
      {/* Eyes (blink together) */}
      <g className="gtc-blink" style={blinkStyle}>
        {eye(lx)}
        {eye(rx)}
      </g>
      {/* Wattle (skill tint) */}
      {wattle && (
        <g>
          <path
            d={`M${bx + 1} ${by + 6} Q${bx + 5} ${by + 14} ${bx - 1} ${by + 19}`}
            stroke={tint}
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
          />
          <circle cx={bx - 1.5} cy={by + 19.5} r={2.6} fill={tint} />
        </g>
      )}
      {/* Beak */}
      {mood === "hungry" ? (
        <g>
          <ellipse cx={bx} cy={by + 5.5} rx={3.6} ry={2.8} fill={C.mouth} />
          <path d={`M${bx - 6} ${by} Q${bx} ${by - 3} ${bx + 6} ${by} L${bx} ${by + 4.5} Z`} fill={C.beak} />
          <path d={`M${bx - 4.5} ${by + 6.5} L${bx + 4.5} ${by + 6.5} L${bx} ${by + 11} Z`} fill={C.beakLo} />
        </g>
      ) : (
        <g>
          <path
            d={`M${bx - 6} ${by} Q${bx} ${by - 3} ${bx + 6} ${by} Q${bx + 1.5} ${by + 8} ${bx} ${by + 8} Q${bx - 1.5} ${by + 8} ${bx - 6} ${by} Z`}
            fill={C.beak}
          />
          <path d={`M${bx - 2} ${by + 4} Q${bx} ${by + 8} ${bx + 2} ${by + 4}`} fill={C.beakLo} opacity={0.6} />
        </g>
      )}
    </g>
  );
}

// ─── Species look ────────────────────────────────────────────────────────────

/** Blend two #RRGGBB colours; t = 0 gives a, t = 1 gives b. */
function mix(a: string, b: string, t: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** The colours that differ from turkey to turkey. Everything else comes from C. */
interface Look {
  bodyHi: string;
  body: string;
  bodyMid: string;
  bodyLo: string;
  bellyHi: string;
  belly: string;
  bellyLo: string;
  eggHi: string;
  egg: string;
  eggLo: string;
  /** Tail feathers, cycled across the fan. */
  fan: string[];
  /** Head tuft and chick wisp. */
  accent: string;
  wattle: string;
  /** Egg markings. */
  speck: string;
  eggPattern: EggPattern;
}

/**
 * A turkey looks like the species of its skill (body, belly, tail and egg colours plus the egg
 * pattern). A skill with no species keeps the house colours with its skill tint on the tail.
 */
function lookFor(skill: TurkeySkillKey): Look {
  const def = getTurkeySkill(skill);
  const tint = def?.tint ?? C.body;
  if (!def?.species) {
    return {
      bodyHi: C.bodyHi, body: C.body, bodyMid: C.bodyMid, bodyLo: C.bodyLo,
      bellyHi: C.bellyHi, belly: C.belly, bellyLo: C.bellyLo,
      eggHi: C.eggHi, egg: C.egg, eggLo: C.eggLo,
      fan: [tint], accent: tint, wattle: tint, speck: tint, eggPattern: "flecks",
    };
  }
  const species = getSpecies(def.species);
  const p = species.palette;
  const body = p.body ?? C.body;
  const bodyDark = p.bodyDark ?? C.bodyLo;
  const belly = p.belly ?? C.bellyLo;
  const egg = p.egg ?? C.egg;
  return {
    bodyHi: mix(body, "#FFFFFF", 0.28), body, bodyMid: mix(body, bodyDark, 0.55), bodyLo: bodyDark,
    bellyHi: mix(belly, "#FFFFFF", 0.78), belly: mix(belly, "#FFFFFF", 0.38), bellyLo: belly,
    eggHi: mix(egg, "#FFFFFF", 0.55), egg, eggLo: mix(egg, "#5E3B1F", 0.2),
    fan: [p.fan1 ?? tint, p.fan2 ?? tint, p.fan3 ?? tint, p.fan4 ?? tint],
    accent: p.crown ?? tint,
    wattle: p.wattle ?? "#B82914",
    speck: p.speck ?? tint,
    eggPattern: species.eggPattern,
  };
}

/** Egg markings per species pattern, drawn over the shell (EGG geometry). */
function EggMarks({ look, clipId }: { look: Look; clipId: string }) {
  const { speck } = look;
  switch (look.eggPattern) {
    case "rings":
      return (
        <g>
          {[[116, 96, 6], [82, 118, 7], [104, 138, 5.5]].map(([x, y, r], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={r} fill="none" stroke={speck} strokeWidth={2.4} opacity={0.85} />
              <circle cx={x} cy={y} r={1.4} fill={speck} opacity={0.85} />
            </g>
          ))}
        </g>
      );
    case "split":
      return (
        <g clipPath={`url(#${clipId})`}>
          <path d="M102 36 C92 64 112 84 100 100 C90 118 110 138 100 164 L160 164 L160 36 Z" fill={speck} opacity={0.9} />
        </g>
      );
    case "stripe":
      return (
        <g clipPath={`url(#${clipId})`}>
          <path d="M50 130 L150 80 L150 100 L50 150 Z" fill={speck} opacity={0.85} />
        </g>
      );
    case "tips":
      return (
        <g>
          {[[100, 56], [89, 64], [111, 64], [100, 72], [80, 74], [120, 74], [92, 82], [108, 82]].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={3.2} fill={speck} />
              <circle cx={x} cy={y - 1.6} r={1.7} fill={C.white} />
            </g>
          ))}
        </g>
      );
    default:
      return (
        <g>
          {[[115, 118, 3], [94, 138, 2.4], [121, 92, 2.4], [78, 116, 2.2], [106, 70, 1.8], [84, 90, 1.6]].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={speck} opacity={0.7} />
          ))}
        </g>
      );
  }
}

// ─── Stage drawings ──────────────────────────────────────────────────────────

interface Ids {
  body: string;
  belly: string;
  egg: string;
  eggClip: string;
  sheen: string;
  aura: string;
}

function EggBody({ ids, look }: { ids: Ids; look: Look }) {
  const { cx, cy, rx, ry } = EGG;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${ids.egg})`} />
      <ellipse cx={cx - 15} cy={cy - 24} rx={10} ry={15} fill={C.white} opacity={0.6} transform={`rotate(-18 ${cx - 15} ${cy - 24})`} />
      <EggMarks look={look} clipId={ids.eggClip} />
    </g>
  );
}

function ChickBody({ ids, mood, look, blinkStyle }: { ids: Ids; mood: TurkeyMood; look: Look; blinkStyle?: React.CSSProperties }) {
  const { cx, cy, rx, ry } = CHICK;
  return (
    <g>
      {/* Cracked-off shell cap, tilted aside */}
      <g transform="translate(130 56) rotate(28)">
        <path d="M-18 0 Q-20 -20 0 -25 Q20 -20 18 0 L14 7 L7 -2 L0 5 L-7 -3 L-14 4 Z" fill={`url(#${ids.egg})`} />
      </g>
      {/* Wisp (species accent) */}
      <path d={`M${cx} ${cy - ry + 3} Q${cx + 3} ${cy - ry - 9} ${cx - 4} ${cy - ry - 13}`} stroke={look.accent} strokeWidth={4} fill="none" strokeLinecap="round" />
      <circle cx={cx - 5} cy={cy - ry - 14} r={3} fill={look.accent} />
      {/* Fluffy chick */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${ids.belly})`} />
      <ellipse cx={cx - 27} cy={cy + 8} rx={7} ry={10} fill={look.bellyLo} opacity={0.75} transform={`rotate(20 ${cx - 27} ${cy + 8})`} />
      <ellipse cx={cx + 27} cy={cy + 8} rx={7} ry={10} fill={look.bellyLo} opacity={0.75} transform={`rotate(-20 ${cx + 27} ${cy + 8})`} />
      <Face eyes={{ lx: 91, rx: 109, y: 96 }} beak={{ x: 100, y: 104 }} mood={mood} tint={look.wattle} wattle={false} facing="front" blinkStyle={blinkStyle} />
      {/* Bottom shell in front */}
      <path d="M58 128 L66 120 L74 128 L82 120 L90 128 L98 120 L106 128 L114 120 L122 128 L130 120 L138 128 L142 128 Q144 162 100 162 Q56 162 58 128 Z" fill={`url(#${ids.egg})`} />
      {[[82, 146], [112, 150], [124, 138]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.2} fill={look.speck} opacity={0.6} />
      ))}
    </g>
  );
}

function BirdBody({ geo, ids, mood, look, stage, blinkStyle }: {
  geo: BirdGeo; ids: Ids; mood: TurkeyMood; look: Look; stage: number; blinkStyle?: React.CSSProperties;
}) {
  const { head, body, belly, eyes, beak, feet, fan, innerFan, kind, groundY } = geo;
  const sad = mood === "sad";
  // Droopy tail when sad: side fans rotate down, front fans fold lower.
  const fanTransform = !sad
    ? undefined
    : kind === "side"
      ? `rotate(22 ${fan.px} ${fan.py})`
      : `translate(${fan.px} ${fan.py}) scale(1.04 0.82) translate(${-fan.px} ${-fan.py}) translate(0 4)`;
  const innerFills = stage === 8 ? [C.spark, look.belly, C.sparkHi] : [look.belly, look.bellyLo];

  return (
    <g>
      {stage === 8 && <circle cx={100} cy={112} r={94} fill={`url(#${ids.aura})`} />}
      {/* Tail fan (species colours) */}
      <g transform={fanTransform}>
        <FanFeathers fan={fan} fills={look.fan} sheenId={ids.sheen} />
        {innerFan && <FanFeathers fan={innerFan} fills={innerFills} sheenId={ids.sheen} tipOpacity={0.35} />}
      </g>
      {/* Feet */}
      {feet.map((fx, i) => (
        <g key={i}>
          <ellipse cx={fx} cy={groundY - 3} rx={7} ry={3.6} fill={C.beakLo} />
          <ellipse cx={fx - 1} cy={groundY - 4} rx={4} ry={1.4} fill={C.beak} opacity={0.6} />
        </g>
      ))}
      {/* Body */}
      <ellipse cx={body.cx} cy={body.cy} rx={body.rx} ry={body.ry} fill={`url(#${ids.body})`} />
      <ellipse cx={belly.cx} cy={belly.cy} rx={belly.rx} ry={belly.ry} fill={`url(#${ids.belly})`} />
      {/* Wings */}
      {kind === "front" ? (
        <>
          <ellipse cx={body.cx - body.rx + 6} cy={body.cy + 2} rx={10} ry={18} fill={look.bodyMid} opacity={0.85} transform={`rotate(${sad ? 26 : 16} ${body.cx - body.rx + 6} ${body.cy + 2})`} />
          <ellipse cx={body.cx + body.rx - 6} cy={body.cy + 2} rx={10} ry={18} fill={look.bodyMid} opacity={0.85} transform={`rotate(${sad ? -26 : -16} ${body.cx + body.rx - 6} ${body.cy + 2})`} />
        </>
      ) : (
        <ellipse cx={body.cx + 14} cy={body.cy - 2} rx={18} ry={13} fill={look.bodyMid} opacity={0.8} transform={`rotate(${sad ? 24 : 12} ${body.cx + 14} ${body.cy - 2})`} />
      )}
      {stage >= 7 && (
        <g>
          <circle cx={100} cy={body.cy + 6} r={5.5} fill={C.bellyLo} />
          <circle cx={100} cy={body.cy + 6} r={2.6} fill={C.spark} />
        </g>
      )}
      {/* Head */}
      <circle cx={head.cx} cy={head.cy} r={head.r} fill={`url(#${ids.body})`} />
      {/* Head tuft (species accent) */}
      <path
        d={`M${head.cx + 1} ${head.cy - head.r + 3} Q${head.cx - 3} ${head.cy - head.r - 7} ${head.cx + 4} ${head.cy - head.r - 10}`}
        stroke={look.accent}
        strokeWidth={3.5}
        fill="none"
        strokeLinecap="round"
      />
      <Face eyes={eyes} beak={beak} mood={mood} tint={look.wattle} wattle facing={kind === "side" ? "left" : "front"} blinkStyle={blinkStyle} />
      {stage === 8 && (
        <g>
          <Sparkle x={152} y={50} r={8} fill={C.spark} className="gtc-twinkle" />
          <Sparkle x={46} y={52} r={7} fill={C.spark} className="gtc-twinkle" delay={700} />
          <Sparkle x={168} y={128} r={5} fill={C.sparkHi} className="gtc-twinkle" delay={1300} />
          <Sparkle x={32} y={128} r={5} fill={C.sparkHi} className="gtc-twinkle" delay={1900} />
        </g>
      )}
    </g>
  );
}

// ─── Reaction overlays ───────────────────────────────────────────────────────

function Heart({ x, y, s, fill, delay }: { x: number; y: number; s: number; fill: string; delay?: number }) {
  return (
    // Positioned by the outer group: a CSS animation on an element replaces its
    // `transform` attribute, so the animated path must not carry one itself.
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        className="gtc-heart"
        style={delay ? { animationDelay: `${delay}ms` } : undefined}
        d="M0 6 C-8 0 -10 -6 -5 -8 C-2 -9 0 -6 0 -5 C0 -6 2 -9 5 -8 C10 -6 8 0 0 6 Z"
        fill={fill}
      />
    </g>
  );
}

function ReactionOverlay({ reaction, stage }: { reaction: TurkeyReaction; stage: number }) {
  const top = topYFor(stage);
  const ground = groundYFor(stage);
  if (reaction === "pet") {
    return (
      <g>
        <Heart x={118} y={top - 8} s={1.3} fill={C.body} />
        <Heart x={84} y={top} s={0.9} fill={C.bodyHi} delay={150} />
      </g>
    );
  }
  if (reaction === "cheer") {
    return (
      <g>
        <Sparkle x={48} y={top + 10} r={7} fill={C.spark} className="gtc-sparkle" />
        <Sparkle x={154} y={top + 4} r={8} fill={C.spark} className="gtc-sparkle" delay={120} />
        <Sparkle x={36} y={top + 62} r={5} fill={C.bellyLo} className="gtc-sparkle" delay={240} />
        <Sparkle x={166} y={top + 58} r={5} fill={C.bellyLo} className="gtc-sparkle" delay={320} />
      </g>
    );
  }
  if (reaction === "eat") {
    return (
      <g className="gtc-seed">
        {[[84, -2], [96, 0], [108, -1], [116, 1]].map(([x, dy], i) => (
          <ellipse key={i} cx={x} cy={ground + 2 + dy} rx={2.4} ry={1.6} fill={i % 2 ? C.beakLo : C.bellyLo} />
        ))}
      </g>
    );
  }
  return null;
}

// ─── Main component ──────────────────────────────────────────────────────────

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function ariaLabelFor(label: string | undefined, stageName: string, mood: TurkeyMood) {
  const article = /^[aeiou]/i.test(stageName) ? "an" : "a";
  const who = label?.trim() ? label.trim() : "Your turkey";
  return `${who}, ${article} ${stageName}, looks ${mood}`;
}

export function TurkeyCharacter({
  stage,
  mood,
  skill,
  equipped = {},
  reaction = "none",
  onReactionEnd,
  onTap,
  size = 220,
  label,
  className,
}: TurkeyCharacterProps) {
  const s = Math.max(1, Math.min(8, Math.round(stage) || 1));
  const look = lookFor(skill);

  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const ids: Ids = {
    body: `${uid}-body`,
    belly: `${uid}-belly`,
    egg: `${uid}-egg`,
    eggClip: `${uid}-eggclip`,
    sheen: `${uid}-sheen`,
    aura: `${uid}-aura`,
  };
  const clipId = `${uid}-bg`;
  // Stable per-instance offset so a flock doesn't blink in unison.
  const blinkStyle: React.CSSProperties = { animationDelay: `${(hashString(uid) % 30) / 10}s` };

  // ── One-shot reactions ──
  const [playing, setPlaying] = useState<TurkeyReaction>("none");
  const [playKey, setPlayKey] = useState(0);
  const onEndRef = useRef(onReactionEnd);
  useEffect(() => {
    onEndRef.current = onReactionEnd;
  }, [onReactionEnd]);

  useEffect(() => {
    if (reaction === "none") {
      setPlaying("none");
      return;
    }
    setPlaying(reaction);
    setPlayKey((k) => k + 1);
    const t = window.setTimeout(() => {
      setPlaying("none");
      onEndRef.current?.();
    }, REACTION_MS);
    return () => window.clearTimeout(t);
  }, [reaction]);

  const groundY = groundYFor(s);
  const bobClass =
    s === 1
      ? `gtc-wobble${mood === "sad" ? " gtc-wobble--sad" : ""}`
      : `gtc-bob${mood === "happy" ? " gtc-bob--happy" : mood === "sad" ? " gtc-bob--sad" : ""}`;
  const shadowClass = `gtc-shadow${s === 1 ? "" : mood === "happy" ? " gtc-shadow--happy" : mood === "sad" ? " gtc-shadow--sad" : ""}`;
  const origin = { transformOrigin: `100px ${groundY}px` };

  // Static mood posture (droop) applied inside the animated groups.
  const posture =
    mood === "sad"
      ? `translate(0 3) translate(100 ${groundY}) scale(1 0.97) translate(-100 ${-groundY})`
      : mood === "lonely"
        ? `translate(0 1.5) rotate(-4 100 ${groundY})`
        : undefined;

  const BgRenderer = equipped.background ? ITEM_RENDERERS[equipped.background] : undefined;
  const geo = s >= 3 ? BIRDS[s] : undefined;

  const svg = (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={ariaLabelFor(label, STAGE_NAMES[s] ?? "turkey", mood)}
      className="gtc-root"
      style={{ display: "block", overflow: "visible" }}
    >
      <style>{STYLES}</style>
      <defs>
        <radialGradient id={ids.body} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor={look.bodyHi} />
          <stop offset="0.5" stopColor={look.body} />
          <stop offset="0.85" stopColor={look.bodyMid} />
          <stop offset="1" stopColor={look.bodyLo} />
        </radialGradient>
        <radialGradient id={ids.belly} cx="45%" cy="35%" r="75%">
          <stop offset="0" stopColor={look.bellyHi} />
          <stop offset="0.6" stopColor={look.belly} />
          <stop offset="1" stopColor={look.bellyLo} />
        </radialGradient>
        <radialGradient id={ids.egg} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor={look.eggHi} />
          <stop offset="0.6" stopColor={look.egg} />
          <stop offset="1" stopColor={look.eggLo} />
        </radialGradient>
        <linearGradient id={ids.sheen} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={C.white} stopOpacity={0} />
          <stop offset="0.55" stopColor={C.white} stopOpacity={0.08} />
          <stop offset="1" stopColor={C.white} stopOpacity={0.4} />
        </linearGradient>
        <radialGradient id={ids.aura}>
          <stop offset="0" stopColor={C.sparkHi} stopOpacity={0.7} />
          <stop offset="1" stopColor={C.sparkHi} stopOpacity={0} />
        </radialGradient>
        <clipPath id={ids.eggClip}>
          <ellipse cx={EGG.cx} cy={EGG.cy} rx={EGG.rx} ry={EGG.ry} />
        </clipPath>
        <clipPath id={clipId}>
          <rect x="0" y="0" width="200" height="200" rx="64" />
        </clipPath>
      </defs>

      {/* Background item — clipped to a squircle like AvatarWithItems */}
      {BgRenderer && (
        <g clipPath={`url(#${clipId})`}>
          <BgRenderer />
        </g>
      )}

      {/* Soft ground shadow */}
      <ellipse className={shadowClass} cx={100} cy={groundY + 1} rx={s === 1 ? 36 : s === 2 ? 40 : 44} ry={5.5} fill={C.shadow} fillOpacity={0.16} />

      {/* Idle (bob / wobble) → reaction → posture; items move with the body */}
      <g className={bobClass} style={origin}>
        <g key={playKey} className={playing !== "none" ? `gtc-react gtc-r-${playing}` : "gtc-react"} style={origin}>
          <g transform={posture}>
            {equipped.cape && <ItemLayer id={equipped.cape} translate={getSlotOffset(s, "cape")} />}
            {s === 1 && <EggBody ids={ids} look={look} />}
            {s === 2 && <ChickBody ids={ids} mood={mood} look={look} blinkStyle={blinkStyle} />}
            {geo && <BirdBody geo={geo} ids={ids} mood={mood} look={look} stage={s} blinkStyle={blinkStyle} />}
            {equipped.hat && <ItemLayer id={equipped.hat} translate={getSlotOffset(s, "hat")} />}
            {equipped.face && <ItemLayer id={equipped.face} translate={getSlotOffset(s, "face")} />}
            {equipped.neck && <ItemLayer id={equipped.neck} translate={getSlotOffset(s, "neck")} />}
            {equipped.chest && <ItemLayer id={equipped.chest} translate={getSlotOffset(s, "chest")} />}
          </g>
        </g>
      </g>

      {playing !== "none" && (
        <g key={`fx-${playKey}`}>
          <ReactionOverlay reaction={playing} stage={s} />
        </g>
      )}
    </svg>
  );

  if (onTap) {
    return (
      <button
        type="button"
        onClick={onTap}
        className={[
          "inline-block rounded-full bg-transparent p-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-ochre/40",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ width: size, height: size, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
      >
        {svg}
      </button>
    );
  }

  return (
    <div className={className} style={{ width: size, height: size }}>
      {svg}
    </div>
  );
}

export default TurkeyCharacter;
