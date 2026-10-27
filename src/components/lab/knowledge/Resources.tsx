"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { BASICS, PERSPECTIVES, RESOURCES_FOOTNOTE, type ResourceSection } from "@/lib/knowledge/content";

export type ResourceKey = "basics" | "perspectives";

function Sections({ sections }: { sections: ResourceSection[] }) {
  return (
    <div className="flex flex-col gap-3">
      {sections.map((s) => (
        <div key={s.heading}>
          <h4 className="font-display text-sm font-bold">{s.heading}</h4>
          <p className="mt-0.5 whitespace-pre-line font-body text-sm leading-relaxed text-ink-soft">{s.body}</p>
        </div>
      ))}
    </div>
  );
}

/** The plain explanation of the issue. Used on the entry screen and in the side panel. */
export function BasicsBody() {
  return <Sections sections={BASICS.sections} />;
}

/** The main ways people look at the question. Used on the entry screen and in the side panel. */
export function PerspectivesBody() {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-body text-sm text-ink-muted">{PERSPECTIVES.intro}</p>
      <Sections sections={PERSPECTIVES.sections} />
      <p className="font-body text-sm text-ink-muted">{PERSPECTIVES.outro}</p>
    </div>
  );
}

function Accordion({
  title,
  open,
  unseen,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  unseen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-bg">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left"
      >
        <span className="flex items-center gap-2 font-body text-sm font-semibold">
          {title}
          {unseen && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-label="Not opened yet" />}
        </span>
        <Icon name="chevron-down" size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-line px-3.5 py-3">{children}</div>}
    </div>
  );
}

function PanelBody({
  viewed,
  onOpen,
}: {
  viewed: Record<ResourceKey, boolean>;
  onOpen: (key: ResourceKey) => void;
}) {
  const [open, setOpen] = useState<Record<ResourceKey, boolean>>({ basics: false, perspectives: false });

  function toggle(key: ResourceKey) {
    const next = !open[key];
    setOpen((o) => ({ ...o, [key]: next }));
    if (next) onOpen(key);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Accordion title={BASICS.title} open={open.basics} unseen={!viewed.basics} onToggle={() => toggle("basics")}>
        <BasicsBody />
      </Accordion>
      <Accordion
        title={PERSPECTIVES.title}
        open={open.perspectives}
        unseen={!viewed.perspectives}
        onToggle={() => toggle("perspectives")}
      >
        <PerspectivesBody />
      </Accordion>
      <p className="px-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">{RESOURCES_FOOTNOTE}</p>
    </div>
  );
}

/**
 * The two resources that stay beside the learner once they're past the entry screen: open
 * either, any time, without leaving what they're doing. Opening one is reported so the team
 * can see who reached for help and when.
 *
 * Wide screens: a card beside the content. Phones: a button that opens a sheet.
 */
export function ResourcePanel({
  viewed,
  onOpen,
}: {
  viewed: Record<ResourceKey, boolean>;
  onOpen: (key: ResourceKey) => void;
}) {
  const [sheet, setSheet] = useState(false);
  const anyUnseen = !viewed.basics || !viewed.perspectives;

  return (
    <>
      <aside className="hidden lg:block">
        <div className="sticky top-20 rounded-2xl border border-line bg-surface p-4">
          <h3 className="font-display text-base font-bold tracking-[-0.02em]">If you want more</h3>
          <p className="mb-3 mt-0.5 font-body text-xs text-ink-soft">Open either one whenever you like.</p>
          <PanelBody viewed={viewed} onOpen={onOpen} />
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setSheet(true)}
        className="fixed bottom-4 right-4 z-20 flex items-center gap-2 rounded-full bg-ink px-4 py-3 font-body text-sm font-semibold text-bg shadow-lift lg:hidden"
      >
        <Icon name="skills" size={16} />
        More info
        {anyUnseen && <span className="h-2 w-2 rounded-full bg-golden-400" aria-hidden />}
      </button>

      {sheet && (
        <div className="fixed inset-0 z-30 flex items-end bg-ink/40 lg:hidden" onClick={() => setSheet(false)}>
          <div
            className="max-h-[80dvh] w-full overflow-y-auto rounded-t-3xl bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-base font-bold tracking-[-0.02em]">If you want more</h3>
              <button
                type="button"
                onClick={() => setSheet(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-2"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <PanelBody viewed={viewed} onOpen={onOpen} />
          </div>
        </div>
      )}
    </>
  );
}
