"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { fetchJson } from "@/lib/fetchJson";
import { TITLE_MAX_LENGTH, type StudioModuleSummary } from "@/lib/studio/types";

const JSON_HEADERS = { "Content-Type": "application/json" };

function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** The Studio home: every draft, shared across Studio users. */
export function DraftList() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<StudioModuleSummary[] | null>(null);
  const [error, setError] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    fetchJson<StudioModuleSummary[]>("/api/studio/modules")
      .then((data) => {
        setDrafts(data);
        setError("");
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  async function createDraft(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || creating) return;
    setCreating(true);
    try {
      const created = await fetchJson<{ id: string }>("/api/studio/modules", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ title }),
      });
      router.push(`/studio/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
      setCreating(false);
    }
  }

  async function renameDraft(id: string, title: string) {
    await fetchJson(`/api/studio/modules/${id}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ title }),
    });
    load();
  }

  async function deleteDraft(id: string) {
    await fetchJson(`/api/studio/modules/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-body text-sm font-semibold text-primary">Module Studio</p>
        <h1 className="mt-1.5 font-display text-[32px] font-bold leading-none tracking-[-0.03em] lg:text-[44px]">
          Module drafts
        </h1>
        <p className="mt-2 max-w-xl font-body text-sm text-ink-soft">
          Drafts here are shared with everyone who has Studio access. Nothing in Studio changes Gobbl itself.
        </p>
      </div>

      <form onSubmit={createDraft} className="flex max-w-xl items-end gap-2">
        <div className="flex-1">
          <Input
            label="New module"
            placeholder="Module title"
            value={newTitle}
            maxLength={TITLE_MAX_LENGTH}
            onChange={(e) => setNewTitle(e.target.value)}
          />
        </div>
        <Button type="submit" loading={creating} disabled={!newTitle.trim()}>
          Create
        </Button>
      </form>

      {error && <p className="font-body text-sm text-plume-500">{error}</p>}

      {drafts === null && !error && <p className="font-body text-sm text-ink-muted">Loading drafts…</p>}

      {drafts?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center">
          <p className="font-display text-lg font-bold tracking-[-0.02em]">No drafts yet</p>
          <p className="mt-1 font-body text-sm text-ink-soft">Give your first module a title above to start.</p>
        </div>
      )}

      {drafts && drafts.length > 0 && (
        <ul className="grid gap-3 lg:grid-cols-2">
          {drafts.map((d) => (
            <DraftRow key={d.id} draft={d} onRename={renameDraft} onDelete={deleteDraft} onError={setError} />
          ))}
        </ul>
      )}
    </div>
  );
}

function DraftRow({
  draft,
  onRename,
  onDelete,
  onError,
}: {
  draft: StudioModuleSummary;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [mode, setMode] = useState<"view" | "rename" | "confirm-delete">("view");
  const [title, setTitle] = useState(draft.title);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      setMode("view");
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-2xl border border-line bg-surface p-4 lg:p-5">
      {mode === "rename" ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) run(() => onRename(draft.id, title.trim()));
          }}
        >
          <div className="flex-1">
            <Input
              autoFocus
              aria-label="Module title"
              value={title}
              maxLength={TITLE_MAX_LENGTH}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" loading={busy} disabled={!title.trim()}>
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setTitle(draft.title);
              setMode("view");
            }}
          >
            Cancel
          </Button>
        </form>
      ) : (
        <>
          <Link
            href={`/studio/${draft.id}`}
            className="font-display text-lg font-bold tracking-[-0.02em] underline-offset-2 hover:underline"
          >
            {draft.title}
          </Link>
          {draft.description && <p className="mt-1 font-body text-sm text-ink-soft">{draft.description}</p>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="font-body text-xs text-ink-muted">
              Created by {draft.createdBy}. Updated {formatUpdated(draft.updatedAt)}
            </span>
            {mode === "confirm-delete" ? (
              <div className="flex items-center gap-2">
                <span className="font-body text-xs text-ink-soft">Delete this draft for everyone?</span>
                <Button size="sm" variant="danger" loading={busy} onClick={() => run(() => onDelete(draft.id))}>
                  Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMode("view")}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => setMode("rename")}>
                  Rename
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMode("confirm-delete")}>
                  Delete
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </li>
  );
}
