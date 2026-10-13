"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import {
  STUDIO_COMPONENTS,
  describePath,
  getStudioComponent,
  stepErrors,
  variantWarnings,
  type FieldError,
} from "@/lib/studio/components";
import {
  DESCRIPTION_MAX_LENGTH,
  MINUTES_MAX,
  MINUTES_MIN,
  SKILLS,
  TITLE_MAX_LENGTH,
  VARIANT_LABELS,
  type StudioDoc,
  type StudioStep,
  type StudioVariantKey,
  type StudioVersionDetail,
} from "@/lib/studio/types";
import { availableAnswers, variableErrors, variableMap, withoutAnswerNames } from "@/lib/studio/variables";
import { PropsForm } from "./PropsForm";
import { StepFlow, type DragItem } from "./StepFlow";
import { StudioPreview } from "./StudioPreview";
import { useDraftEditor, type SaveState } from "./useDraftEditor";
import { useLeaveGuard } from "./useLeaveGuard";
import { VersionHistory } from "./VersionHistory";

function newStepId(): string {
  return `step-${Math.random().toString(36).slice(2, 9)}`;
}

function withSteps(doc: StudioDoc, key: StudioVariantKey, update: (steps: StudioStep[]) => StudioStep[]): StudioDoc {
  return { ...doc, variants: doc.variants.map((v) => (v.key === key ? { ...v, steps: update(v.steps) } : v)) };
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

interface PreviewState {
  steps: StudioStep[];
  title: string;
  subtitle: string;
  startIndex: number;
}

/**
 * The module editor: pick components from the palette, arrange them into a flow, change each
 * one's settings, then preview the module as a learner would see it. Changes save on their
 * own, can be undone, and every save is kept in the version history.
 */
export function ModuleEditor({ moduleId }: { moduleId: string }) {
  const editor = useDraftEditor(moduleId);
  const { content, edit } = editor;
  const { doc } = content;

  const [variantKey, setVariantKey] = useState<StudioVariantKey>("standard");
  const [selected, setSelected] = useState<Partial<Record<StudioVariantKey, string>>>({});
  const [drag, setDrag] = useState<DragItem | null>(null);
  /** Field errors show once the author has left the field, or asked to see them all. */
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState<{ id: number; message: string; undo: boolean } | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [addingAdvanced, setAddingAdvanced] = useState(false);

  useLeaveGuard(
    editor.dirty || editor.saveState.kind === "saving",
    "Your latest changes haven't been saved yet. Leave anyway?",
  );

  const variant = doc.variants.find((v) => v.key === variantKey) ?? doc.variants[0];
  const steps = useMemo(() => variant?.steps ?? [], [variant]);
  const errorsByStep = useMemo(() => {
    const out: Record<string, FieldError[]> = {};
    const fromVariables = variableErrors(steps);
    for (const s of steps) {
      const errs = [...stepErrors(s.type, s.props), ...(fromVariables[s.id] ?? [])];
      if (errs.length) out[s.id] = errs;
    }
    return out;
  }, [steps]);
  const vars = useMemo(() => variableMap(steps), [steps]);
  const errorCounts = useMemo(
    () => Object.fromEntries(Object.entries(errorsByStep).map(([id, errs]) => [id, errs.length])),
    [errorsByStep],
  );

  const chosen = selected[variant?.key ?? "standard"];
  const selectedStep = steps.find((s) => s.id === chosen) ?? steps[0] ?? null;
  const selectedIndex = selectedStep ? steps.indexOf(selectedStep) : -1;
  const selectedDef = selectedStep ? getStudioComponent(selectedStep.type) : undefined;

  const say = useCallback((message: string, undo = false) => {
    setNotice({ id: Date.now(), message, undo });
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const { save, undo, redo } = editor;
  const previewOpen = preview !== null;

  // The preview gets its own browser history entry, so Back (or a back swipe) returns to the
  // editor instead of leaving the page. Next copies its router state into entries pushed
  // this way, so popping back to the editor's entry is a no-op for the router.
  useEffect(() => {
    if (!previewOpen) return;
    window.history.pushState({ studioPreview: true }, "");
    const onPop = () => setPreview(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [previewOpen]);

  const exitPreview = useCallback(() => {
    // Leaving through the button should also drop the preview's history entry, so a later
    // Back doesn't land on a preview that is no longer open.
    if ((window.history.state as { studioPreview?: boolean } | null)?.studioPreview) window.history.back();
    else setPreview(null);
  }, []);

  useEffect(() => {
    // The editor's shortcuts would act on a draft that isn't on screen during preview.
    if (previewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        void save();
      } else if (key === "z" && !isTyping(e.target)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (key === "y" && !isTyping(e.target)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, undo, redo, previewOpen]);

  if (editor.loadError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <p className="font-body text-sm text-ink-soft">{editor.loadError}</p>
        <Link href="/studio" className="font-body text-sm font-semibold text-primary underline-offset-2 hover:underline">
          Back to drafts
        </Link>
      </div>
    );
  }

  if (!editor.loaded || !variant) {
    return <p className="font-body text-sm text-ink-muted">Loading module…</p>;
  }

  if (preview) {
    return (
      <StudioPreview
        steps={preview.steps}
        title={preview.title}
        subtitle={preview.subtitle}
        startIndex={preview.startIndex}
        onExit={exitPreview}
      />
    );
  }

  const select = (id: string) => setSelected((s) => ({ ...s, [variant.key]: id }));
  const editSteps = (update: (steps: StudioStep[]) => StudioStep[], key: string | null = null) =>
    edit((c) => ({ ...c, doc: withSteps(c.doc, variant.key, update) }), key);

  function insertStep(type: string, index: number) {
    const def = getStudioComponent(type);
    if (!def) return;
    const step: StudioStep = { id: newStepId(), type, props: structuredClone(def.defaultProps) };
    editSteps((all) => [...all.slice(0, index), step, ...all.slice(index)]);
    select(step.id);
  }

  function moveStep(from: number, to: number) {
    if (to < 0 || to >= steps.length) return;
    editSteps((all) => {
      const next = [...all];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function duplicateStep(id: string) {
    const i = steps.findIndex((s) => s.id === id);
    if (i < 0) return;
    const original = steps[i];
    const copy: StudioStep = {
      ...original,
      id: newStepId(),
      props: withoutAnswerNames(original.type, structuredClone(original.props)),
    };
    editSteps((all) => [...all.slice(0, i + 1), copy, ...all.slice(i + 1)]);
    select(copy.id);
  }

  function removeStep(id: string) {
    const i = steps.findIndex((s) => s.id === id);
    if (i < 0) return;
    const label = getStudioComponent(steps[i].type)?.label ?? "Step";
    editSteps((all) => all.filter((s) => s.id !== id));
    const neighbour = steps[i + 1] ?? steps[i - 1];
    if (neighbour) select(neighbour.id);
    say(`Removed ${label.toLowerCase()} (step ${i + 1})`, true);
  }

  function addAdvanced(copy: boolean) {
    const standard = doc.variants[0].steps;
    const steps = copy ? standard.map((s) => ({ ...structuredClone(s), id: newStepId() })) : [];
    edit((c) => ({ ...c, doc: { ...c.doc, variants: [c.doc.variants[0], { key: "advanced", steps }] } }));
    setAddingAdvanced(false);
    setVariantKey("advanced");
  }

  function removeAdvanced() {
    edit((c) => ({ ...c, doc: { ...c.doc, variants: [c.doc.variants[0]] } }));
    setVariantKey("standard");
    say("Removed the advanced version", true);
  }

  /** Preview from step `start`, or, if a step from there on isn't ready, show what to fix. */
  function startPreview(start: number) {
    const broken = steps.slice(start).filter((s) => errorsByStep[s.id]);
    if (broken.length > 0) {
      setRevealed((r) => new Set(Array.from(r).concat(broken.map((s) => s.id))));
      select(broken[0].id);
      say(
        broken.length === 1
          ? "One step needs fixing before it can be previewed. It's selected."
          : `${broken.length} steps need fixing before they can be previewed. The first one is selected.`,
      );
      return;
    }
    setPreview({
      steps,
      title: content.title || "Untitled",
      subtitle: doc.variants.length > 1 ? `${VARIANT_LABELS[variant.key].label} version` : "",
      startIndex: start,
    });
  }

  function previewVersion(v: StudioVersionDetail) {
    setHistoryOpen(false);
    const shown = v.doc.variants.find((x) => x.key === variant.key) ?? v.doc.variants[0];
    const which = v.doc.variants.length > 1 ? ` · ${VARIANT_LABELS[shown.key].label}` : "";
    setPreview({
      steps: shown.steps,
      title: v.title,
      subtitle: (v.name ?? `Saved ${new Date(v.updatedAt).toLocaleString()}`) + which,
      startIndex: 0,
    });
  }

  function restoreVersion(v: StudioVersionDetail) {
    editor.restore({ title: v.title, description: v.description, doc: v.doc });
    setHistoryOpen(false);
    setVariantKey("standard");
    say(`Restored ${v.name ? `“${v.name}”` : `the version from ${new Date(v.updatedAt).toLocaleString()}`}`, true);
  }

  const warnings = variantWarnings(variant);
  const stepErrorList = selectedStep ? (errorsByStep[selectedStep.id] ?? []) : [];
  const showAll = selectedStep ? revealed.has(selectedStep.id) : false;
  const errorFor = (path: string) => {
    if (!selectedStep) return undefined;
    if (!showAll && !touched.has(`${selectedStep.id}:${path}`)) return undefined;
    return stepErrorList.find((e) => e.path === path)?.message;
  };
  // Errors with nowhere to show in the form (e.g. about the whole step) are listed at the top.
  const unplaced = stepErrorList.filter((e) => !e.path);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/studio"
        className="flex w-fit items-center gap-1.5 font-body text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
      >
        <Icon name="arrow-left" size={16} />
        All drafts
      </Link>

      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 lg:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_12rem_8rem]">
          <Input
            label="Title"
            value={content.title}
            maxLength={TITLE_MAX_LENGTH}
            error={content.title.trim() ? undefined : "A title is required"}
            onChange={(e) => {
              const title = e.target.value;
              edit((c) => ({ ...c, title }), "title");
            }}
          />
          <Input
            label="Description"
            value={content.description}
            maxLength={DESCRIPTION_MAX_LENGTH}
            placeholder="One line on what this module teaches"
            onChange={(e) => {
              const description = e.target.value;
              edit((c) => ({ ...c, description }), "description");
            }}
          />
          <label className="block space-y-1.5">
            <span className="block font-body text-sm font-medium text-ink">Skill</span>
            <select
              value={doc.settings.skill}
              onChange={(e) => {
                const skill = e.target.value as StudioDoc["settings"]["skill"];
                edit((c) => ({ ...c, doc: { ...c.doc, settings: { ...c.doc.settings, skill } } }));
              }}
              className="h-[46px] w-full rounded-full border border-line bg-surface px-4 font-body text-sm text-ink focus:border-primary focus:outline-none"
            >
              <option value="">Not chosen yet</option>
              {SKILLS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <MinutesInput
            value={doc.settings.estimatedMinutes}
            onChange={(estimatedMinutes) =>
              edit((c) => ({ ...c, doc: { ...c.doc, settings: { ...c.doc.settings, estimatedMinutes } } }), "minutes")
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <SaveStatus state={editor.saveState} onRetry={() => void editor.save()} />
          <div className="flex-1" />
          <Button size="sm" variant="ghost" disabled={!editor.canUndo} onClick={editor.undo} title="Undo (Ctrl+Z)">
            Undo
          </Button>
          <Button size="sm" variant="ghost" disabled={!editor.canRedo} onClick={editor.redo} title="Redo (Ctrl+Shift+Z)">
            Redo
          </Button>
          <Button size="sm" variant="outline" onClick={() => setHistoryOpen(true)}>
            History
          </Button>
          <Button size="sm" disabled={steps.length === 0} onClick={() => startPreview(0)}>
            Preview
          </Button>
        </div>
      </section>

      {editor.saveState.kind === "conflict" && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-plume-500 bg-plume-100 px-4 py-3 font-body text-sm text-plume-700">
          <p className="flex-1">
            Someone else saved this draft while you were editing. Your changes aren&apos;t saved yet. Whichever you
            choose, the other version stays in History.
          </p>
          <Button size="sm" variant="outline" onClick={() => void editor.overwrite()}>
            Keep my version
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (window.confirm("Load their version? Your unsaved changes will be lost.")) void editor.reload();
            }}
          >
            Load theirs
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-1 border-b border-line">
        {doc.variants.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setVariantKey(v.key)}
            className={`-mb-px rounded-t-xl border px-4 py-2 font-body text-sm font-semibold ${
              v.key === variant.key
                ? "border-line border-b-bg bg-bg text-ink"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {VARIANT_LABELS[v.key].label}
            <span className="ml-1.5 font-normal text-ink-muted">{v.steps.length}</span>
          </button>
        ))}
        {doc.variants.length === 1 &&
          (addingAdvanced ? (
            <div className="mb-1.5 ml-2 flex flex-wrap items-center gap-1.5 font-body text-xs text-ink-soft">
              Start the advanced version
              <Button size="sm" variant="outline" onClick={() => addAdvanced(true)}>
                as a copy of Standard
              </Button>
              <Button size="sm" variant="outline" onClick={() => addAdvanced(false)}>
                empty
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAddingAdvanced(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingAdvanced(true)}
              className="mb-1.5 ml-2 font-body text-xs font-semibold text-primary hover:underline"
            >
              + Add an advanced version
            </button>
          ))}
        <div className="flex-1" />
        <p className="mb-2 hidden font-body text-xs text-ink-muted md:block">{VARIANT_LABELS[variant.key].hint}</p>
        {variant.key === "advanced" && (
          <button
            type="button"
            onClick={removeAdvanced}
            className="mb-2 ml-3 font-body text-xs font-semibold text-ink-muted hover:text-plume-500"
          >
            Remove advanced version
          </button>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="flex flex-col gap-1 rounded-2xl border border-ochre bg-ochre-soft px-4 py-3 font-body text-sm text-golden-700">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)_minmax(0,1.25fr)]">
        <Region title="Components" hint="Click to add after the selected step, or drag into place.">
          <ul className="flex flex-col gap-2">
            {STUDIO_COMPONENTS.map((c) => (
              <li key={c.type}>
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "copy";
                    e.dataTransfer.setData("text/plain", c.type);
                    setDrag({ kind: "component", type: c.type });
                  }}
                  onDragEnd={() => setDrag(null)}
                  onClick={() => insertStep(c.type, selectedIndex >= 0 ? selectedIndex + 1 : steps.length)}
                  className="w-full cursor-grab rounded-xl border border-line bg-bg p-3 text-left transition-colors hover:border-primary active:cursor-grabbing"
                >
                  <div className="font-body text-sm font-semibold">+ {c.label}</div>
                  <div className="mt-0.5 font-body text-xs text-ink-soft">{c.description}</div>
                </button>
              </li>
            ))}
          </ul>
        </Region>

        <Region title="Module flow" hint="The steps a learner goes through, top to bottom. Drag to reorder.">
          <StepFlow
            steps={steps}
            selectedId={selectedStep?.id ?? null}
            errorCounts={errorCounts}
            vars={vars}
            drag={drag}
            onDragChange={setDrag}
            onSelect={select}
            onMove={moveStep}
            onInsert={insertStep}
            onDuplicate={duplicateStep}
            onRemove={removeStep}
          />
        </Region>

        <Region
          title={selectedDef ? `Step ${selectedIndex + 1}: ${selectedDef.label}` : "Settings"}
          hint={selectedDef ? selectedDef.description : "Add a step to change its settings here."}
          actions={
            selectedStep && selectedDef ? (
              <Button size="sm" variant="outline" onClick={() => startPreview(selectedIndex)}>
                Preview from here
              </Button>
            ) : null
          }
        >
          {!selectedStep ? (
            <EmptyNote>Nothing to set up yet.</EmptyNote>
          ) : !selectedDef ? (
            <p className="font-body text-sm text-plume-500">
              Unknown component &quot;{selectedStep.type}&quot;. Remove this step.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {stepErrorList.length > 0 && !showAll && (
                <button
                  type="button"
                  onClick={() => setRevealed((r) => new Set(r).add(selectedStep.id))}
                  className="w-fit font-body text-xs font-semibold text-plume-500 hover:underline"
                >
                  Show the {stepErrorList.length === 1 ? "1 thing" : `${stepErrorList.length} things`} to fix
                </button>
              )}
              {showAll &&
                unplaced.map((e) => (
                  <p key={e.message} className="font-body text-sm text-plume-500">
                    {describePath(selectedStep.type, e.path) || e.message}
                  </p>
                ))}
              <PropsForm
                key={selectedStep.id}
                fields={selectedDef.fields}
                value={selectedStep.props}
                onChange={(props) =>
                  editSteps((all) => all.map((s) => (s.id === selectedStep.id ? { ...s, props } : s)), `props:${selectedStep.id}`)
                }
                errorFor={errorFor}
                available={availableAnswers(steps, selectedIndex)}
                onTouch={(path) =>
                  setTouched((t) => (t.has(`${selectedStep.id}:${path}`) ? t : new Set(t).add(`${selectedStep.id}:${path}`)))
                }
              />
            </div>
          )}
        </Region>
      </div>

      {historyOpen && (
        <VersionHistory
          moduleId={moduleId}
          refreshKey={editor.saveCount}
          hasUnsavedChanges={editor.dirty}
          flush={() => editor.save()}
          onPreview={previewVersion}
          onRestore={restoreVersion}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {notice && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-ink px-5 py-2.5 font-body text-sm text-bg shadow-lift"
        >
          <span>{notice.message}</span>
          {notice.undo && (
            <button
              type="button"
              onClick={() => {
                editor.undo();
                setNotice(null);
              }}
              className="font-semibold text-primary-soft underline-offset-2 hover:underline"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SaveStatus({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  switch (state.kind) {
    case "saved":
      return (
        <span className="flex items-center gap-1 font-body text-xs text-ink-muted">
          <Icon name="check" size={14} /> All changes saved
        </span>
      );
    case "pending":
      return <span className="font-body text-xs text-ink-muted">Unsaved changes…</span>;
    case "saving":
      return <span className="font-body text-xs text-ink-muted">Saving…</span>;
    case "blocked":
      return <span className="font-body text-xs text-plume-500">{state.message}</span>;
    case "conflict":
      return <span className="font-body text-xs text-plume-500">Not saved: someone else saved first</span>;
    case "error":
      return (
        <span className="flex items-center gap-2 font-body text-xs text-plume-500">
          Not saved: {state.message}
          <button type="button" onClick={onRetry} className="font-semibold underline-offset-2 hover:underline">
            Try again
          </button>
        </span>
      );
  }
}

/** Keeps its own text while typing, and only passes on whole numbers in range. */
function MinutesInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const n = Number(text);
  const valid = text.trim() !== "" && Number.isInteger(n) && n >= MINUTES_MIN && n <= MINUTES_MAX;
  return (
    <Input
      label="Minutes"
      type="number"
      min={MINUTES_MIN}
      max={MINUTES_MAX}
      value={text}
      error={valid ? undefined : `${MINUTES_MIN}–${MINUTES_MAX}`}
      onChange={(e) => {
        setText(e.target.value);
        const next = Number(e.target.value);
        if (e.target.value.trim() !== "" && Number.isInteger(next) && next >= MINUTES_MIN && next <= MINUTES_MAX) {
          onChange(next);
        }
      }}
      onBlur={() => setText(String(value))}
    />
  );
}

function Region({
  title,
  hint,
  actions,
  children,
}: {
  title: string;
  hint: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-[20rem] min-w-0 flex-col rounded-2xl border border-line bg-surface p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-bold tracking-[-0.02em]">{title}</h2>
          <p className="mt-0.5 font-body text-xs text-ink-soft">{hint}</p>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-line p-6 text-center font-body text-sm text-ink-muted">
      {children}
    </div>
  );
}
