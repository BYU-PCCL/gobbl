"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { fetchJson } from "@/lib/fetchJson";
import {
  VERSION_NAME_MAX_LENGTH,
  type StudioVersionDetail,
  type StudioVersionSummary,
} from "@/lib/studio/types";

const JSON_HEADERS = { "Content-Type": "application/json" };

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
}

function describeCounts(v: StudioVersionSummary): string {
  const parts = [`${v.stepCounts.standard ?? 0} steps`];
  if (v.stepCounts.advanced !== undefined) parts.push(`${v.stepCounts.advanced} advanced`);
  return parts.join(", ");
}

/**
 * A draft's saved versions, newest first. Every save lands in history (quick saves by one
 * person are grouped into one entry), and any version can be previewed or brought back.
 */
export function VersionHistory({
  moduleId,
  refreshKey,
  hasUnsavedChanges,
  flush,
  onPreview,
  onRestore,
  onClose,
}: {
  moduleId: string;
  /** Changes whenever the draft is saved, so the list stays current. */
  refreshKey: number;
  hasUnsavedChanges: boolean;
  /** Saves any pending changes, so naming a version names what's on screen. */
  flush: () => Promise<void>;
  onPreview: (version: StudioVersionDetail) => void;
  onRestore: (version: StudioVersionDetail) => void;
  onClose: () => void;
}) {
  const [versions, setVersions] = useState<StudioVersionSummary[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [naming, setNaming] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJson<StudioVersionSummary[]>(`/api/studio/modules/${moduleId}/versions`)
      .then((data) => {
        if (!cancelled) {
          setVersions(data);
          setError("");
        }
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [moduleId, refreshKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function open(id: string, then: (v: StudioVersionDetail) => void) {
    setBusyId(id);
    setError("");
    try {
      then(await fetchJson<StudioVersionDetail>(`/api/studio/modules/${moduleId}/versions/${id}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function nameCurrent(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setNaming(true);
    setError("");
    try {
      await flush();
      const created = await fetchJson<StudioVersionSummary>(`/api/studio/modules/${moduleId}/versions`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ name }),
      });
      setVersions((all) => [created, ...(all ?? []).filter((v) => v.id !== created.id)]);
      setNewName("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setNaming(false);
    }
  }

  async function rename(id: string, name: string) {
    setBusyId(id);
    setError("");
    try {
      const updated = await fetchJson<StudioVersionSummary>(`/api/studio/modules/${moduleId}/versions/${id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ name }),
      });
      setVersions((all) => (all ?? []).map((v) => (v.id === id ? updated : v)));
      setRenaming(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-ink/20" onClick={onClose}>
      <aside
        role="dialog"
        aria-label="Version history"
        className="flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start gap-3 border-b border-line p-4">
          <div className="flex-1">
            <h2 className="font-display text-lg font-bold tracking-[-0.02em]">Version history</h2>
            <p className="mt-0.5 font-body text-xs text-ink-soft">
              Every save is kept. Restoring a version puts it in the editor, and you can undo that.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-soft hover:bg-surface-2 hover:text-ink"
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        <form onSubmit={nameCurrent} className="flex items-end gap-2 border-b border-line p-4">
          <label className="flex-1">
            <span className="mb-1 block font-body text-xs font-semibold text-ink">Name the current version</span>
            <input
              value={newName}
              maxLength={VERSION_NAME_MAX_LENGTH}
              placeholder="e.g. Sent for review"
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-xl border border-line bg-bg px-3 py-2 font-body text-sm text-ink focus:border-primary focus:outline-none"
            />
          </label>
          <Button type="submit" size="sm" loading={naming} disabled={!newName.trim()}>
            Save
          </Button>
        </form>

        {error && <p className="px-4 pt-3 font-body text-sm text-plume-500">{error}</p>}

        <ol className="flex-1 overflow-y-auto p-4">
          {hasUnsavedChanges && (
            <li className="mb-3 rounded-xl border border-dashed border-line p-3 font-body text-xs text-ink-muted">
              You have changes that haven&apos;t saved yet. They&apos;ll appear here once they do.
            </li>
          )}
          {versions === null && !error && <p className="font-body text-sm text-ink-muted">Loading…</p>}
          {versions?.length === 0 && (
            <p className="font-body text-sm text-ink-muted">No saved versions yet. They appear after the first save.</p>
          )}
          {versions?.map((v, i) => (
            <li key={v.id} className="relative border-l-2 border-line pb-4 pl-4 last:pb-0">
              <span
                className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-surface ${
                  v.name ? "bg-primary" : "bg-ink-muted"
                }`}
              />
              {renaming?.id === v.id ? (
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void rename(v.id, renaming.name);
                  }}
                >
                  <input
                    autoFocus
                    value={renaming.name}
                    maxLength={VERSION_NAME_MAX_LENGTH}
                    placeholder="Name (empty to remove)"
                    onChange={(e) => setRenaming({ id: v.id, name: e.target.value })}
                    className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-2 py-1 font-body text-sm focus:border-primary focus:outline-none"
                  />
                  <Button type="submit" size="sm" loading={busyId === v.id}>
                    Save
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setRenaming(null)}>
                    Cancel
                  </Button>
                </form>
              ) : (
                <div className="font-body text-sm font-semibold">
                  {v.name ?? formatWhen(v.updatedAt)}
                  {i === 0 && <span className="ml-2 font-normal text-ink-muted">· current</span>}
                </div>
              )}
              <div className="mt-0.5 font-body text-xs text-ink-muted">
                {v.name ? `${formatWhen(v.updatedAt)} · ` : ""}
                {v.savedBy} · {describeCounts(v)}
                {i > 0 && versions[i - 1] && v.title !== versions[i - 1].title ? ` · titled “${v.title}”` : ""}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                <Button size="sm" variant="ghost" disabled={busyId !== null} onClick={() => open(v.id, onPreview)}>
                  Preview
                </Button>
                {i > 0 && (
                  <Button size="sm" variant="ghost" disabled={busyId !== null} onClick={() => open(v.id, onRestore)}>
                    Restore
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busyId !== null}
                  onClick={() => setRenaming({ id: v.id, name: v.name ?? "" })}
                >
                  {v.name ? "Rename" : "Name"}
                </Button>
              </div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
