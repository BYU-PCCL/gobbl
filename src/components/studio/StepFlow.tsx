"use client";

import { useState } from "react";
import { getStudioComponent, summarizeStep } from "@/lib/studio/components";
import type { StudioStep } from "@/lib/studio/types";
import type { StepVariables } from "@/lib/studio/variables";

/** What's being dragged: a step already in the flow, or a component from the palette. */
export type DragItem = { kind: "step"; id: string } | { kind: "component"; type: string };

/**
 * The ordered steps of one variant. Steps can be dragged to reorder, and palette components
 * dropped between them; the arrow buttons do the same from the keyboard.
 *
 * Each step also shows the answers it saves and uses. Selecting a step outlines the matching
 * answers on the other steps, so it's easy to see what's connected.
 */
export function StepFlow({
  steps,
  selectedId,
  errorCounts,
  vars,
  drag,
  onDragChange,
  onSelect,
  onMove,
  onInsert,
  onDuplicate,
  onRemove,
}: {
  steps: StudioStep[];
  selectedId: string | null;
  /** Problems per step id; steps with none are left out. */
  errorCounts: Record<string, number>;
  /** What each step saves and uses, by step id (see variableMap). */
  vars: Record<string, StepVariables>;
  drag: DragItem | null;
  onDragChange: (drag: DragItem | null) => void;
  onSelect: (id: string) => void;
  /** Moves the step at `from` so it ends up at index `to`. */
  onMove: (from: number, to: number) => void;
  onInsert: (type: string, index: number) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  function drop() {
    if (drag && dropIndex !== null) {
      if (drag.kind === "component") {
        onInsert(drag.type, dropIndex);
      } else {
        const from = steps.findIndex((s) => s.id === drag.id);
        // Removing the step first shifts everything after it up by one.
        const to = from < dropIndex ? dropIndex - 1 : dropIndex;
        if (from >= 0 && to !== from) onMove(from, to);
      }
    }
    setDropIndex(null);
    onDragChange(null);
  }

  const selectedVars = selectedId ? vars[selectedId] : undefined;
  const linked = new Set([...(selectedVars?.saves.map((a) => a.name) ?? []), ...(selectedVars?.uses ?? [])]);
  // Names saved by the steps above the one being drawn; a use of any other name is broken.
  const savedSoFar = new Set<string>();

  const marker = (i: number) =>
    drag && dropIndex === i ? <div aria-hidden className="-my-1 h-0.5 rounded-full bg-primary" /> : null;

  if (steps.length === 0) {
    return (
      <div
        onDragOver={(e) => {
          if (!drag) return;
          e.preventDefault();
          setDropIndex(0);
        }}
        onDragLeave={() => setDropIndex(null)}
        onDrop={(e) => {
          e.preventDefault();
          drop();
        }}
        className={`flex flex-1 items-center justify-center rounded-xl border border-dashed p-6 text-center font-body text-sm text-ink-muted ${
          drag ? "border-primary bg-primary-soft/40" : "border-line"
        }`}
      >
        No steps yet. Click a component on the left, or drag one here.
      </div>
    );
  }

  return (
    <ol
      className="flex flex-1 flex-col gap-2"
      onDragOver={(e) => {
        // Below the last step counts as "at the end".
        if (!drag || e.target !== e.currentTarget) return;
        e.preventDefault();
        setDropIndex(steps.length);
      }}
      onDrop={(e) => {
        e.preventDefault();
        drop();
      }}
    >
      {steps.map((step, i) => {
        const def = getStudioComponent(step.type);
        const errors = errorCounts[step.id] ?? 0;
        const active = step.id === selectedId;
        const summary = summarizeStep(step);
        const dragging = drag?.kind === "step" && drag.id === step.id;
        const own = vars[step.id] ?? { saves: [], uses: [] };
        const uses = own.uses.map((name) => ({ name, broken: !savedSoFar.has(name) }));
        own.saves.forEach((a) => savedSoFar.add(a.name));
        return (
          <li key={step.id} className="flex flex-col gap-2">
            {marker(i)}
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", step.id);
                onDragChange({ kind: "step", id: step.id });
              }}
              onDragEnd={() => {
                setDropIndex(null);
                onDragChange(null);
              }}
              onDragOver={(e) => {
                if (!drag) return;
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                setDropIndex(e.clientY < rect.top + rect.height / 2 ? i : i + 1);
              }}
              className={`group rounded-xl border p-3 transition-opacity ${
                active ? "border-primary bg-primary-soft" : "border-line bg-bg hover:border-ink-muted/40"
              } ${dragging ? "opacity-40" : ""}`}
            >
              <div className="flex items-start gap-2">
                <span
                  aria-hidden
                  title="Drag to move"
                  className="mt-0.5 cursor-grab select-none font-mono text-xs leading-5 text-ink-muted active:cursor-grabbing"
                >
                  ⋮⋮
                </span>
                <button
                  type="button"
                  onClick={() => onSelect(step.id)}
                  className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                >
                  <span className="font-mono text-xs leading-5 text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-body text-sm font-semibold">{def?.label ?? step.type}</span>
                      {errors > 0 && (
                        <span className="rounded-full bg-plume-100 px-1.5 py-0.5 font-body text-[10px] font-semibold text-plume-700">
                          {errors} to fix
                        </span>
                      )}
                    </span>
                    {summary && <span className="mt-0.5 block truncate font-body text-xs text-ink-soft">{summary}</span>}
                    {(own.saves.length > 0 || uses.length > 0) && (
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {own.saves.map((a, j) => (
                          <AnswerChip key={`s${j}`} kind="saves" name={a.name} linked={!active && linked.has(a.name)} />
                        ))}
                        {uses.map((u) => (
                          <AnswerChip
                            key={`u${u.name}`}
                            kind="uses"
                            name={u.name}
                            broken={u.broken}
                            linked={!active && linked.has(u.name)}
                          />
                        ))}
                      </span>
                    )}
                  </span>
                </button>
                <div className="flex shrink-0 items-center opacity-60 transition-opacity group-hover:opacity-100">
                  <IconButton label="Move up" disabled={i === 0} onClick={() => onMove(i, i - 1)}>
                    ↑
                  </IconButton>
                  <IconButton label="Move down" disabled={i === steps.length - 1} onClick={() => onMove(i, i + 1)}>
                    ↓
                  </IconButton>
                  <IconButton label="Duplicate step" onClick={() => onDuplicate(step.id)}>
                    ⧉
                  </IconButton>
                  <IconButton label="Remove step" onClick={() => onRemove(step.id)}>
                    ×
                  </IconButton>
                </div>
              </div>
            </div>
          </li>
        );
      })}
      {marker(steps.length)}
    </ol>
  );
}

function AnswerChip({
  kind,
  name,
  broken = false,
  linked,
}: {
  kind: "saves" | "uses";
  name: string;
  broken?: boolean;
  linked: boolean;
}) {
  const tone = broken
    ? "bg-plume-100 text-plume-700"
    : kind === "saves"
      ? "bg-primary-soft text-gobbl-700"
      : "bg-surface-2 text-ink-soft";
  return (
    <span
      title={
        broken
          ? `Uses {${name}}, but no step above saves an answer by that name`
          : kind === "saves"
            ? `Saves the learner's answer as {${name}}`
            : `Fills in the answer saved as {${name}}`
      }
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] ${tone} ${
        linked ? "ring-2 ring-primary" : ""
      }`}
    >
      <span className="font-body font-semibold">{kind === "saves" ? "saves" : "uses"}</span>
      {name}
      {broken && <span aria-label="not found">⚠</span>}
    </span>
  );
}

export function IconButton({
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
