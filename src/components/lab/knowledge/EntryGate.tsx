"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { BASICS, GATE, PERSPECTIVES } from "@/lib/knowledge/content";
import { BasicsBody, PerspectivesBody } from "./Resources";

export interface GateResult {
  /** Which resources they chose to read here. */
  basics: boolean;
  perspectives: boolean;
  /** How many times they turned everything down and came back to the first question. */
  loops: number;
  /** Every screen they saw, in order, so the team can see the path they took. */
  path: string[];
}

type View = "start" | "basics-offer" | "basics" | "perspectives-offer" | "perspectives" | "joke";

/**
 * The doorway into the conversation. The learner decides how much help they want first:
 * jump straight in, or read the basics, or the main perspectives, or both. Turning down
 * everything gets a light-hearted nudge and a second chance at the first question.
 *
 *   start ── chat ─────────────────────────────────────────────► done
 *     └─ not yet ─ basics-offer ── yes ─ basics ─► perspectives-offer ─ yes ─ perspectives ─► done
 *                        │                              └─ no ─────────────────────────────► done
 *                        └─ no ─► perspectives-offer ─ yes ─ perspectives ─► done
 *                                        └─ no ─► joke ─► start
 */
export function EntryGate({ onDone }: { onDone: (result: GateResult) => void }) {
  const [view, setView] = useState<View>("start");
  const [afterBasics, setAfterBasics] = useState(false);
  const [state, setState] = useState<GateResult>({ basics: false, perspectives: false, loops: 0, path: ["start"] });

  function go(next: View, patch: Partial<GateResult> = {}) {
    const merged = { ...state, ...patch, path: [...state.path, next] };
    setState(merged);
    setView(next);
  }

  function finish(patch: Partial<GateResult> = {}) {
    onDone({ ...state, ...patch, path: [...state.path, "done"] });
  }

  return (
    <div key={view} className="animate-slide-up">
      {view === "start" && (
        <Card>
          <Eyebrow>{GATE.title}</Eyebrow>
          <p className="mt-2 font-body text-sm text-ink-soft">{GATE.reassurance}</p>
          <Heading>{GATE.startQuestion}</Heading>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <Button size="lg" onClick={() => finish()}>
              {GATE.yes}
              <Icon name="arrow-right" size={18} />
            </Button>
            <Button size="lg" variant="outline" onClick={() => go("basics-offer")}>
              {GATE.notYet}
            </Button>
          </div>
        </Card>
      )}

      {view === "basics-offer" && (
        <Card>
          <Heading>{GATE.basicsOffer.title}</Heading>
          <p className="mt-2 font-body text-sm text-ink-soft">{GATE.basicsOffer.body}</p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <Button size="lg" onClick={() => go("basics", { basics: true })}>
              {GATE.basicsOffer.yes}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                setAfterBasics(false);
                go("perspectives-offer");
              }}
            >
              {GATE.basicsOffer.no}
            </Button>
          </div>
        </Card>
      )}

      {view === "basics" && (
        <Card>
          <Eyebrow>{BASICS.title}</Eyebrow>
          <div className="mt-3">
            <BasicsBody />
          </div>
          <div className="mt-6">
            <Button
              size="lg"
              onClick={() => {
                setAfterBasics(true);
                go("perspectives-offer");
              }}
            >
              {GATE.continue}
              <Icon name="arrow-right" size={18} />
            </Button>
          </div>
        </Card>
      )}

      {view === "perspectives-offer" && (
        <Card>
          <Heading>
            {(afterBasics ? GATE.perspectivesOffer.afterBasics : GATE.perspectivesOffer.withoutBasics).title}
          </Heading>
          <p className="mt-2 font-body text-sm text-ink-soft">
            {(afterBasics ? GATE.perspectivesOffer.afterBasics : GATE.perspectivesOffer.withoutBasics).body}
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <Button size="lg" onClick={() => go("perspectives", { perspectives: true })}>
              {GATE.perspectivesOffer.yes}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                // Said no to the basics and no to this: nothing left to offer but a nudge.
                if (afterBasics) finish();
                else go("joke");
              }}
            >
              {GATE.perspectivesOffer.no}
            </Button>
          </div>
        </Card>
      )}

      {view === "perspectives" && (
        <Card>
          <Eyebrow>{PERSPECTIVES.title}</Eyebrow>
          <div className="mt-3">
            <PerspectivesBody />
          </div>
          <div className="mt-6">
            <Button size="lg" onClick={() => finish()}>
              {GATE.continue}
              <Icon name="arrow-right" size={18} />
            </Button>
          </div>
        </Card>
      )}

      {view === "joke" && (
        <Card>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft">
            <Icon name="feather" size={22} />
          </div>
          <Heading>{GATE.joke.title}</Heading>
          <p className="mt-2 font-body text-sm text-ink-soft">{GATE.joke.body}</p>
          <div className="mt-6">
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                setAfterBasics(false);
                go("start", { loops: state.loops + 1 });
              }}
            >
              {GATE.joke.button}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-3xl border border-line bg-surface p-6 sm:p-8">{children}</section>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary">{children}</p>;
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-3 font-display text-2xl font-bold leading-snug tracking-[-0.02em] sm:text-3xl">{children}</h2>
  );
}
