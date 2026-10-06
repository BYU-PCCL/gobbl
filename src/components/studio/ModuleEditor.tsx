"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { fetchJson } from "@/lib/fetchJson";
import { STUDIO_COMPONENTS, getStudioComponent, moduleWarnings, validateStep } from "@/lib/studio/components";
import {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  type StudioModuleDetail,
  type StudioStep,
} from "@/lib/studio/types";
import { PropsForm } from "./PropsForm";
import { StudioPreview } from "./StudioPreview";

function newStepId(): string {
  return `step-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * The module editor: pick components from the palette, arrange them into a flow, change each
 * one's settings, then preview the whole module as a learner would see it.
 */
export function ModuleEditor({ moduleId }: { moduleId: string }) {
  const [draft, setDraft] = useState<StudioModuleDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<StudioStep[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    fetchJson<StudioModuleDetail>(`/api/studio/modules/${moduleId}`)
      .then((data) => {
        setDraft(data);
        setTitle(data.title);
        setDescription(data.description);
        setSteps(data.doc.steps);
      })
      .catch((e: Error) => setLoadError(e.message));
  }, [moduleId]);

  const docChanged = draft ? JSON.stringify(steps) !== JSON.stringify(draft.doc.steps) : false;
  const dirty =
    !!draft && (title.trim() !== draft.title || description.trim() !== draft.description || docChanged);

  // Closing the tab or reloading with unsaved changes would silently lose them.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (loadError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <p className="font-body text-sm text-ink-soft">{loadError}</p>
        <Link href="/studio" className="font-body text-sm font-semibold text-primary underline-offset-2 hover:underline">
          Back to drafts
        </Link>
      </div>
    );
  }

  if (!draft) {
    return <p className="font-body text-sm text-ink-muted">Loading module…</p>;
  }

  const stepErrors = steps.map(validateStep);
  const hasErrors = stepErrors.some((e) => e !== null);
  const warnings = moduleWarnings(steps);
  const selected = steps.find((s) => s.id === selectedId) ?? null;
  const selectedDef = selected ? getStudioComponent(selected.type) : undefined;
  const selectedError = selected ? stepErrors[steps.indexOf(selected)] : null;

  function addStep(type: string) {
    const def = getStudioComponent(type);
    if (!def) return;
    const step: StudioStep = { id: newStepId(), type, props: structuredClone(def.defaultProps) };
    setSteps((all) => [...all, step]);
    setSelectedId(step.id);
  }

  function moveStep(id: string, direction: -1 | 1) {
    setSteps((all) => {
      const i = all.findIndex((s) => s.id === id);
      const j = i + direction;
      if (i < 0 || j < 0 || j >= all.length) return all;
      const next = [...all];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function removeStep(id: string) {
    setSteps((all) => all.filter((s) => s.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }

  function updateProps(id: string, props: Record<string, unknown>) {
    setSteps((all) => all.map((s) => (s.id === id ? { ...s, props } : s)));
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setSaveError("");
    setConflict(false);
    // Only send what changed, and say which version this edit started from, so a save can
    // neither overwrite someone else's change to another field nor their save of the same one.
    const body: Record<string, unknown> = { expectedUpdatedAt: draft.updatedAt };
    if (title.trim() !== draft.title) body.title = title;
    if (description.trim() !== draft.description) body.description = description;
    if (docChanged) body.doc = { version: 1, steps };
    try {
      const res = await fetch(`/api/studio/modules/${moduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setConflict(true);
        setSaveError(data.error ?? "This draft was changed by someone else.");
        return;
      }
      if (!res.ok) {
        setSaveError(data.error ?? `Save failed (${res.status})`);
        return;
      }
      const updated = data as StudioModuleDetail;
      setDraft(updated);
      setTitle(updated.title);
      setDescription(updated.description);
      if (updated.doc) setSteps(updated.doc.steps);
    } catch {
      setSaveError("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  }

  if (view === "preview") {
    return <StudioPreview steps={steps} title={title || "Untitled"} onExit={() => setView("edit")} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/studio"
        onClick={(e) => {
          if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) e.preventDefault();
        }}
        className="flex w-fit items-center gap-1.5 font-body text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
      >
        <Icon name="arrow-left" size={16} />
        All drafts
      </Link>

      <section className="grid gap-4 rounded-2xl border border-line bg-surface p-4 lg:grid-cols-[1fr_auto] lg:items-end lg:p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <Input label="Title" value={title} maxLength={TITLE_MAX_LENGTH} onChange={(e) => setTitle(e.target.value)} />
          <Input
            label="Description"
            value={description}
            maxLength={DESCRIPTION_MAX_LENGTH}
            placeholder="One line on what this module teaches"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="max-w-xs font-body text-xs text-ink-muted">
            {saveError ? (
              <span className="text-plume-500">{saveError}</span>
            ) : hasErrors ? (
              "Fix the highlighted steps to save"
            ) : dirty ? (
              "Unsaved changes"
            ) : (
              "Saved"
            )}
          </span>
          {conflict && (
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload
            </Button>
          )}
          <Button variant="outline" disabled={hasErrors || steps.length === 0} onClick={() => setView("preview")}>
            Preview
          </Button>
          <Button onClick={save} loading={saving} disabled={!dirty || !title.trim() || hasErrors}>
            Save
          </Button>
        </div>
      </section>

      {warnings.length > 0 && (
        <div className="flex flex-col gap-1 rounded-2xl border border-ochre bg-ochre-soft px-4 py-3 font-body text-sm text-golden-700">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[16rem_1fr_22rem]">
        <Region title="Components" hint="Click one to add it to the end of the flow.">
          <ul className="flex flex-col gap-2">
            {STUDIO_COMPONENTS.map((c) => (
              <li key={c.type}>
                <button
                  type="button"
                  onClick={() => addStep(c.type)}
                  className="w-full rounded-xl border border-line bg-bg p-3 text-left transition-colors hover:border-primary"
                >
                  <div className="font-body text-sm font-semibold">+ {c.label}</div>
                  <div className="mt-0.5 font-body text-xs text-ink-soft">{c.description}</div>
                </button>
              </li>
            ))}
          </ul>
        </Region>

        <Region title="Module flow" hint="The steps a learner goes through, top to bottom.">
          {steps.length === 0 ? (
            <EmptyNote>No steps yet. Add a component from the left.</EmptyNote>
          ) : (
            <ol className="flex flex-col gap-2">
              {steps.map((step, i) => {
                const def = getStudioComponent(step.type);
                const error = stepErrors[i];
                const active = step.id === selectedId;
                return (
                  <li
                    key={step.id}
                    className={`rounded-xl border p-3 ${active ? "border-primary bg-primary-soft" : "border-line bg-bg"}`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedId(step.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className="font-mono text-xs text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
                        <span className="truncate font-body text-sm font-semibold">{def?.label ?? step.type}</span>
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <IconButton label="Move up" disabled={i === 0} onClick={() => moveStep(step.id, -1)}>
                          ↑
                        </IconButton>
                        <IconButton
                          label="Move down"
                          disabled={i === steps.length - 1}
                          onClick={() => moveStep(step.id, 1)}
                        >
                          ↓
                        </IconButton>
                        <IconButton label="Remove step" onClick={() => removeStep(step.id)}>
                          ×
                        </IconButton>
                      </div>
                    </div>
                    {error && <p className="mt-1.5 font-body text-xs text-plume-500">{error}</p>}
                  </li>
                );
              })}
            </ol>
          )}
        </Region>

        <Region title="Settings" hint={selectedDef ? selectedDef.description : "Select a step to change its settings."}>
          {!selected ? (
            <EmptyNote>Nothing selected.</EmptyNote>
          ) : !selectedDef ? (
            <p className="font-body text-sm text-plume-500">
              Unknown component &quot;{selected.type}&quot;. Remove this step.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {selectedError && <p className="font-body text-sm text-plume-500">{selectedError}</p>}
              <PropsForm
                fields={selectedDef.fields}
                value={selected.props}
                onChange={(props) => updateProps(selected.id, props)}
              />
            </div>
          )}
        </Region>
      </div>
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-lg font-body text-sm text-ink-soft hover:bg-surface-2 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function Region({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="flex min-h-[20rem] flex-col rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-display text-base font-bold tracking-[-0.02em]">{title}</h2>
      <p className="mb-4 mt-0.5 font-body text-xs text-ink-soft">{hint}</p>
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
