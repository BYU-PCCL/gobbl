"use client";

import { PRACTICE_ADDONS } from "@/components/skills/practice-addons";
import type { FieldSpec } from "@/lib/studio/components";

type Values = Record<string, unknown>;

const CONTROL =
  "w-full rounded-xl border border-line bg-surface px-3 py-2 font-body text-sm text-ink focus:border-primary focus:outline-none";

function Label({ spec, children }: { spec: FieldSpec; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-body text-xs font-semibold text-ink">
        {spec.label}
        {spec.required && <span className="text-plume-500"> *</span>}
      </span>
      {children}
      {spec.help && <span className="mt-1 block font-body text-xs text-ink-muted">{spec.help}</span>}
    </label>
  );
}

/** The settings form for one step, built entirely from the component's field specs. */
export function PropsForm({
  fields,
  value,
  onChange,
}: {
  fields: FieldSpec[];
  value: Values;
  onChange: (next: Values) => void;
}) {
  function set(key: string, next: unknown) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="flex flex-col gap-4">
      {fields.map((spec) => {
        const current = value[spec.key];

        switch (spec.kind) {
          case "text":
            return (
              <Label key={spec.key} spec={spec}>
                <input
                  className={CONTROL}
                  value={typeof current === "string" ? current : ""}
                  maxLength={spec.maxLength}
                  placeholder={spec.placeholder}
                  onChange={(e) => set(spec.key, e.target.value)}
                />
              </Label>
            );

          case "textarea":
            return (
              <Label key={spec.key} spec={spec}>
                <textarea
                  className={CONTROL}
                  rows={spec.rows ?? 3}
                  value={typeof current === "string" ? current : ""}
                  maxLength={spec.maxLength}
                  placeholder={spec.placeholder}
                  onChange={(e) => set(spec.key, e.target.value)}
                />
              </Label>
            );

          case "number":
            return (
              <Label key={spec.key} spec={spec}>
                <input
                  type="number"
                  className={CONTROL}
                  min={spec.min}
                  max={spec.max}
                  value={typeof current === "number" ? current : ""}
                  onChange={(e) => set(spec.key, e.target.value === "" ? undefined : Number(e.target.value))}
                />
              </Label>
            );

          case "select": {
            const options = spec.dynamicOptions === "practice-addons"
              ? [{ value: "", label: "None" }, ...Object.keys(PRACTICE_ADDONS).map((k) => ({ value: k, label: k }))]
              : spec.options;
            return (
              <Label key={spec.key} spec={spec}>
                <select
                  className={CONTROL}
                  value={typeof current === "string" ? current : ""}
                  onChange={(e) => set(spec.key, e.target.value)}
                >
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Label>
            );
          }

          case "boolean":
            return (
              <div key={spec.key}>
                <label className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-[var(--tw-color,currentColor)]"
                    checked={current === true}
                    onChange={(e) => set(spec.key, e.target.checked)}
                  />
                  <span className="font-body text-sm text-ink">{spec.label}</span>
                </label>
                {spec.help && <span className="mt-1 block pl-6 font-body text-xs text-ink-muted">{spec.help}</span>}
              </div>
            );

          case "list": {
            const items = Array.isArray(current) ? (current as Values[]) : [];
            return (
              <div key={spec.key}>
                <div className="mb-1.5 font-body text-xs font-semibold text-ink">{spec.label}</div>
                <div className="flex flex-col gap-3">
                  {items.map((item, i) => (
                    <div key={i} className="rounded-xl border border-line bg-bg p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                          {spec.itemLabel} {i + 1}
                        </span>
                        <button
                          type="button"
                          disabled={items.length <= spec.minItems}
                          onClick={() => set(spec.key, items.filter((_, j) => j !== i))}
                          className="font-body text-xs font-semibold text-ink-muted hover:text-plume-500 disabled:opacity-30 disabled:hover:text-ink-muted"
                        >
                          Remove
                        </button>
                      </div>
                      <PropsForm
                        fields={spec.itemFields}
                        value={item}
                        onChange={(next) => set(spec.key, items.map((it, j) => (j === i ? next : it)))}
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={items.length >= spec.maxItems}
                  onClick={() => set(spec.key, [...items, structuredClone(spec.itemDefault)])}
                  className="mt-2 font-body text-xs font-semibold text-primary hover:underline disabled:opacity-30 disabled:hover:no-underline"
                >
                  + Add {spec.itemLabel.toLowerCase()}
                </button>
              </div>
            );
          }
        }
      })}
    </div>
  );
}
