"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import type { StudioDoc, StudioModuleDetail } from "@/lib/studio/types";

/** Everything an author edits, as one value: what undo, redo and autosave work on. */
export interface DraftContent {
  title: string;
  description: string;
  doc: StudioDoc;
}

const AUTOSAVE_MS = 1200;
/** Edits with the same key closer together than this are one undo step (e.g. typing a word). */
const COALESCE_MS = 1000;
const UNDO_LIMIT = 100;

interface History {
  past: DraftContent[];
  present: DraftContent;
  future: DraftContent[];
  lastKey: string | null;
  lastAt: number;
}

type HistoryAction =
  | { type: "edit"; update: (c: DraftContent) => DraftContent; key: string | null; at: number }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; content: DraftContent };

function historyReducer(h: History, action: HistoryAction): History {
  switch (action.type) {
    case "edit": {
      const next = action.update(h.present);
      if (next === h.present) return h;
      const merge = action.key !== null && action.key === h.lastKey && action.at - h.lastAt < COALESCE_MS;
      return {
        past: merge ? h.past : [...h.past, h.present].slice(-UNDO_LIMIT),
        present: next,
        future: [],
        lastKey: action.key,
        lastAt: action.at,
      };
    }
    case "undo":
      if (h.past.length === 0) return h;
      return {
        past: h.past.slice(0, -1),
        present: h.past[h.past.length - 1],
        future: [h.present, ...h.future],
        lastKey: null,
        lastAt: 0,
      };
    case "redo":
      if (h.future.length === 0) return h;
      return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1), lastKey: null, lastAt: 0 };
    case "reset":
      return { past: [], present: action.content, future: [], lastKey: null, lastAt: 0 };
  }
}

// Placeholder until the draft loads; nothing renders it.
const INITIAL_HISTORY: History = {
  past: [],
  present: { title: "", description: "", doc: { version: 2, settings: { skill: "", estimatedMinutes: 10 }, variants: [] } },
  future: [],
  lastKey: null,
  lastAt: 0,
};

function sameContent(a: DraftContent, b: DraftContent): boolean {
  return (
    a.title.trim() === b.title.trim() &&
    a.description.trim() === b.description.trim() &&
    JSON.stringify(a.doc) === JSON.stringify(b.doc)
  );
}

function contentOf(d: StudioModuleDetail): DraftContent {
  return { title: d.title, description: d.description, doc: d.doc };
}

export type SaveState =
  | { kind: "saved" }
  | { kind: "pending" }
  | { kind: "saving" }
  | { kind: "error"; message: string }
  | { kind: "conflict" }
  | { kind: "blocked"; message: string };

/**
 * Loads a draft and keeps it saved. Every change goes through `edit`, which records it for
 * undo; a short pause after the last change saves it. Saves say which version they started
 * from, so two people editing at once get a conflict instead of silently overwriting.
 */
export function useDraftEditor(moduleId: string) {
  const [loadError, setLoadError] = useState("");
  const [loaded, setLoaded] = useState<StudioModuleDetail | null>(null);
  const [history, dispatch] = useReducer(historyReducer, INITIAL_HISTORY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [conflict, setConflict] = useState(false);
  /** Bumped after every successful save, so the history panel knows to refresh. */
  const [saveCount, setSaveCount] = useState(0);

  // What the server has, and the updatedAt it had then. Refs, because a save that finishes
  // while the author keeps typing must compare against the latest state, not a stale render's.
  const savedRef = useRef<DraftContent | null>(null);
  const updatedAtRef = useRef("");
  const presentRef = useRef(history.present);
  presentRef.current = history.present;
  const savingRef = useRef<Promise<void> | null>(null);
  const forceNewVersionRef = useRef(false);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const data = await fetchJson<StudioModuleDetail>(`/api/studio/modules/${moduleId}`);
      savedRef.current = contentOf(data);
      updatedAtRef.current = data.updatedAt;
      setLoaded(data);
      setConflict(false);
      setSaveError("");
      dispatch({ type: "reset", content: contentOf(data) });
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [moduleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const present = history.present;
  const dirty = loaded !== null && savedRef.current !== null && !sameContent(present, savedRef.current);
  const titleMissing = !present.title.trim();

  const save = useCallback(
    async ({ overwrite = false }: { overwrite?: boolean } = {}): Promise<void> => {
      // One save at a time; a later call waits for the one in flight, then saves what's left.
      if (savingRef.current) await savingRef.current;
      const saved = savedRef.current;
      const content = presentRef.current;
      if (!saved || (!overwrite && sameContent(content, saved)) || !content.title.trim()) return;

      // Normally only what changed, so a save can't undo someone else's edit to another field.
      // Overwriting sends everything, so the server ends up exactly as this editor shows.
      const body: Record<string, unknown> = {};
      if (overwrite) Object.assign(body, content);
      else body.expectedUpdatedAt = updatedAtRef.current;
      if (content.title.trim() !== saved.title.trim()) body.title = content.title;
      if (content.description.trim() !== saved.description.trim()) body.description = content.description;
      if (JSON.stringify(content.doc) !== JSON.stringify(saved.doc)) body.doc = content.doc;
      if (forceNewVersionRef.current) body.newVersion = true;

      const run = (async () => {
        setSaving(true);
        try {
          const res = await fetch(`/api/studio/modules/${moduleId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json().catch(() => ({}));
          if (res.status === 409) {
            setConflict(true);
            return;
          }
          if (!res.ok) {
            setSaveError(data.error ?? `Save failed (${res.status})`);
            return;
          }
          savedRef.current = content;
          updatedAtRef.current = (data as StudioModuleDetail).updatedAt;
          forceNewVersionRef.current = false;
          setConflict(false);
          setSaveError("");
          setSaveCount((n) => n + 1);
        } catch {
          setSaveError("Couldn't reach the server.");
        } finally {
          setSaving(false);
          savingRef.current = null;
        }
      })();
      savingRef.current = run;
      await run;
    },
    [moduleId],
  );

  // Autosave a moment after the last change. Paused during a conflict or after a failed save
  // until the next edit, so a broken connection doesn't hammer the server.
  useEffect(() => {
    if (!dirty || conflict || titleMissing || saveError) return;
    const timer = setTimeout(() => void save(), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [present, dirty, conflict, titleMissing, saveError, save]);

  const edit = useCallback((update: (c: DraftContent) => DraftContent, key: string | null = null) => {
    setSaveError("");
    dispatch({ type: "edit", update, key, at: Date.now() });
  }, []);

  /** Replaces the editor's content with an old version. Undoable, and saved as a new version. */
  const restore = useCallback((content: DraftContent) => {
    forceNewVersionRef.current = true;
    setSaveError("");
    dispatch({ type: "edit", update: () => content, key: null, at: Date.now() });
  }, []);

  let saveState: SaveState;
  if (conflict) saveState = { kind: "conflict" };
  else if (saving) saveState = { kind: "saving" };
  else if (saveError) saveState = { kind: "error", message: saveError };
  else if (dirty && titleMissing) saveState = { kind: "blocked", message: "Add a title to save" };
  else if (dirty) saveState = { kind: "pending" };
  else saveState = { kind: "saved" };

  return {
    loadError,
    loaded,
    content: present,
    dirty,
    saveState,
    saveCount,
    edit,
    restore,
    undo: () => dispatch({ type: "undo" }),
    redo: () => dispatch({ type: "redo" }),
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    save,
    /** Throws away local changes and loads what the server has now. */
    reload: load,
    /** Saves over whatever the server has (their version stays in history). */
    overwrite: () => save({ overwrite: true }),
  };
}
