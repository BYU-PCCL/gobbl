"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { MyTurkey } from "@/components/turkey/MyTurkey";
import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";
import { EGG_COST } from "@/lib/flock/config";
import { emphasizedActivity } from "@/lib/flock/home";
import { nextStep } from "@/lib/flock/progress";
import { EGG_SKILLS } from "@/lib/flock/skills";
import type { TurkeyView } from "@/lib/flock/view";

export interface CoopSceneProps {
  turkeys: TurkeyView[];
  /** The first egg has passed its quiz and can be hatched. */
  firstEggReady: boolean;
  /** Open a hatched turkey's page. */
  onOpenTurkey: (t: TurkeyView) => void;
}

type BoxState = "turkey" | "egg-waiting" | "egg-ready" | "empty";

const ALCOVE = "relative flex aspect-[5/4] w-full items-end justify-center overflow-hidden rounded-t-[999px] rounded-b-xl bg-coop-shade";

/**
 * The inside of the coop: one nesting box per skill, always in the same order. A box holds
 * the turkey for that skill, its egg, or nothing yet, so the flock reads as a collection
 * with the gaps showing what is left to hatch.
 */
export function CoopScene({ turkeys, firstEggReady, onOpenTurkey }: CoopSceneProps) {
  const anyHatched = turkeys.some((t) => t.hatched);

  return (
    <div className="rounded-3xl border border-coop-shade/25 bg-coop-wall p-3 shadow-soft sm:p-4">
      {/* The roof beam */}
      <div aria-hidden className="mb-3 h-3 rounded-full bg-coop-plank sm:mb-4" />

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {EGG_SKILLS.map((skill, i) => {
          const t = turkeys.find((x) => x.skill === skill.key) ?? null;
          const state: BoxState = !t
            ? "empty"
            : t.hatched
              ? "turkey"
              : anyHatched || firstEggReady
                ? "egg-ready"
                : "egg-waiting";
          // The fifth box sits alone on its row at two columns: centre it.
          const lone = i === EGG_SKILLS.length - 1 && EGG_SKILLS.length % 2 === 1;
          return (
            <li key={skill.key} className={lone ? "col-span-2 mx-auto w-[calc(50%-0.375rem)] sm:col-span-1 sm:mx-0 sm:w-auto" : ""}>
              {state === "turkey" && t && <TurkeyBox turkey={t} onOpen={() => onOpenTurkey(t)} />}
              {state === "egg-ready" && t && (
                <EggBox turkey={t} href={`/hatch?turkeyId=${t.id}`} status="Ready to hatch" action="Hatch" ready />
              )}
              {state === "egg-waiting" && t && (
                <EggBox turkey={t} href="/home" status="Needs its first lesson" action="Feed to hatch" />
              )}
              {state === "empty" && <EmptyBox skill={skill.key} label={skill.label} canBuy={anyHatched} />}
            </li>
          );
        })}
      </ul>

      {/* The floor */}
      <div aria-hidden className="mt-3 h-4 rounded-full bg-coop-straw/70 sm:mt-4" />
    </div>
  );
}

/** The plate under a box: who lives here and what they need. */
function Plate({ title, line, chip }: { title: string; line: string; chip: ReactNode }) {
  return (
    <span className="mt-2 flex w-full flex-col items-center gap-1 rounded-xl bg-surface px-2 py-2 text-center">
      <span className="w-full truncate font-display text-sm font-bold leading-tight text-ink sm:text-base">{title}</span>
      <span className="w-full truncate font-body text-xs text-ink-soft">{line}</span>
      {chip}
    </span>
  );
}

function Chip({ tone, children }: { tone: "need" | "calm" | "action"; children: ReactNode }) {
  const tones = {
    need: "bg-primary-soft text-primary",
    calm: "bg-forest-soft text-forest-fg",
    action: "bg-primary text-white",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-body text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

const Straw = () => <span aria-hidden className="absolute inset-x-[-10%] bottom-[-18%] h-[42%] rounded-[50%] bg-coop-straw" />;

const BOX =
  "group flex w-full flex-col items-center rounded-2xl bg-coop-plank p-2 text-left transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 active:scale-[0.98]";

function TurkeyBox({ turkey: t, onOpen }: { turkey: TurkeyView; onOpen: () => void }) {
  const name = t.name?.trim() || "Your turkey";
  const step = nextStep(t.hatched, t.done);
  const low = emphasizedActivity(t.needs);
  // The lesson order comes first; after that, whichever need is running low.
  const need =
    step === "feed"
      ? "Needs a lesson"
      : step === "school"
        ? "Ready for School"
        : low === "feed"
          ? "Hungry"
          : low === "school"
            ? "Wants to learn"
            : low === "park"
              ? "Lonely"
              : null;
  return (
    <button type="button" onClick={onOpen} className={BOX} aria-label={`${name}, ${t.stageName}, ${t.skillLabel}. ${need ?? "Doing well"}. Open`}>
      <span className={ALCOVE}>
        <Straw />
        <span className="relative transition-transform group-hover:-translate-y-0.5">
          <MyTurkey turkey={t} size={112} inScene animate={false} decorative showShadow={false} />
        </span>
      </span>
      <Plate
        title={name}
        line={`${t.stageName} · ${t.skillLabel}`}
        chip={need ? <Chip tone="need">{need}</Chip> : <Chip tone="calm">Doing well</Chip>}
      />
    </button>
  );
}

function EggBox({
  turkey: t,
  href,
  status,
  action,
  ready = false,
}: {
  turkey: TurkeyView;
  href: string;
  status: string;
  action: string;
  ready?: boolean;
}) {
  return (
    <Link href={href} className={BOX} aria-label={`${t.skillLabel} egg. ${status}. ${action}`}>
      <span className={ALCOVE}>
        <Straw />
        <span className="relative">
          <MyTurkey turkey={t} size={96} animate={false} decorative showShadow={false} />
        </span>
      </span>
      <Plate title={`${t.skillLabel} egg`} line={status} chip={<Chip tone={ready ? "action" : "need"}>{action}</Chip>} />
    </Link>
  );
}

function EmptyBox({ skill, label, canBuy }: { skill: TurkeyView["skill"]; label: string; canBuy: boolean }) {
  const inner = (
    <>
      <span className={ALCOVE}>
        <Straw />
        {/* A faint outline of the egg that belongs here. */}
        <span className="relative opacity-25 grayscale">
          <TurkeyCharacter stage={1} skill={skill} size={88} animate={false} decorative showShadow={false} />
        </span>
      </span>
      <Plate
        title={label}
        line="Empty nest"
        chip={
          canBuy ? (
            <Chip tone="calm">
              <Icon name="feather" size={12} />
              Get egg · {EGG_COST}
            </Chip>
          ) : (
            <span className="font-body text-xs text-ink-muted">Hatch your first egg to add more</span>
          )
        }
      />
    </>
  );
  if (!canBuy) return <div className={`${BOX} opacity-90`}>{inner}</div>;
  return (
    <Link href="/shop#eggs" className={BOX} aria-label={`${label}: empty nest. Get this egg for ${EGG_COST} feathers`}>
      {inner}
    </Link>
  );
}
