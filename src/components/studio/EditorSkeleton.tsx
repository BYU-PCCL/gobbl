"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { fetchJson } from "@/lib/fetchJson";
import { STUDIO_COMPONENTS, getStudioComponent } from "@/lib/studio/components";
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH, type StudioModuleDetail } from "@/lib/studio/types";

/**
 * The module editor. For now it edits the title and description and lays out
 * the three regions the editor will grow into: palette, canvas, preview.
 */
export function EditorSkeleton({ moduleId }: { moduleId: string }) {
  const [draft, setDraft] = useState<StudioModuleDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetchJson<StudioModuleDetail>(`/api/studio/modules/${moduleId}`)
      .then((data) => {
        setDraft(data);
        setTitle(data.title);
        setDescription(data.description);
      })
      .catch((e: Error) => setLoadError(e.message));
  }, [moduleId]);

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

  const dirty = title.trim() !== draft.title || description.trim() !== draft.description;

  async function save() {
    setSaving(true);
    setSaveError("");
    try {
      const updated = await fetchJson<StudioModuleDetail>(`/api/studio/modules/${moduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      setDraft(updated);
      setTitle(updated.title);
      setDescription(updated.description);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/studio"
        className="flex w-fit items-center gap-1.5 font-body text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
      >
        <Icon name="arrow-left" size={16} />
        All drafts
      </Link>

      <section className="grid gap-4 rounded-2xl border border-line bg-surface p-4 lg:grid-cols-[1fr_auto] lg:items-end lg:p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <Input
            label="Title"
            value={title}
            maxLength={TITLE_MAX_LENGTH}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            label="Description"
            value={description}
            maxLength={DESCRIPTION_MAX_LENGTH}
            placeholder="One line on what this module teaches"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="font-body text-xs text-ink-muted">
            {saveError ? <span className="text-plume-500">{saveError}</span> : dirty ? "Unsaved changes" : "Saved"}
          </span>
          <Button onClick={save} loading={saving} disabled={!dirty || !title.trim()}>
            Save
          </Button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[16rem_1fr_18rem]">
        <Region title="Components" hint="Building blocks you can add to a module.">
          {STUDIO_COMPONENTS.length === 0 ? (
            <EmptyNote>Components are coming soon.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-2">
              {STUDIO_COMPONENTS.map((c) => (
                <li key={c.type} className="rounded-xl border border-line bg-bg p-3">
                  <div className="font-body text-sm font-semibold">{c.label}</div>
                  <div className="mt-0.5 font-body text-xs text-ink-soft">{c.description}</div>
                </li>
              ))}
            </ul>
          )}
        </Region>

        <Region title="Module flow" hint="The steps a learner goes through, top to bottom.">
          {draft.doc.steps.length === 0 ? (
            <EmptyNote>This module has no steps yet.</EmptyNote>
          ) : (
            <ol className="flex flex-col gap-2">
              {draft.doc.steps.map((step, i) => (
                <li key={step.id} className="flex items-center gap-3 rounded-xl border border-line bg-bg p-3">
                  <span className="font-mono text-xs text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-body text-sm font-semibold">
                    {getStudioComponent(step.type)?.label ?? step.type}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Region>

        <Region title="Preview" hint="Walk through the module as a learner would see it in Gobbl.">
          <Button variant="outline" disabled className="w-full">
            Preview module
          </Button>
          <p className="mt-2 font-body text-xs text-ink-muted">Preview is coming soon.</p>
        </Region>
      </div>
    </div>
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
