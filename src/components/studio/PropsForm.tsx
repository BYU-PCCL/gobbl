"use client";

import { useRef } from "react";
import { PRACTICE_ADDONS } from "@/components/skills/practice-addons";
import { isFieldShown, toAnswerName, type FieldSpec } from "@/lib/studio/components";
import type { AvailableAnswer } from "@/lib/studio/variables";

type Values = Record<string, unknown>;

const CONTROL =
  "w-full rounded-xl border bg-surface px-3 py-2 font-body text-sm text-ink focus:border-primary focus:outline-none";
const CUSTOM = "__custom__";

const control = (error?: string) => `${CONTROL} ${error ? "border-plume-500" : "border-line"}`;

function ErrorText({ error }: { error?: string }) {
  return error ? <span className="mt-1 block font-body text-xs text-plume-500">{error}</span> : null;
}

function Label({
  spec,
  error,
  help,
  children,
}: {
  spec: FieldSpec;
  error?: string;
  help?: string;
  children: React.ReactNode;
}) {
  const hint = help ?? spec.help;
  return (
    <label className="block">
      <span className="mb-1 block font-body text-xs font-semibold text-ink">
        {spec.label}
        {spec.required && <span className="text-plume-500"> *</span>}
      </span>
      {children}
      <ErrorText error={error} />
      {hint && <span className="mt-1 block font-body text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

/** Lists whose items are one line of text (plus maybe a radio) get a compact row each. */
function isRowList(spec: Extract<FieldSpec, { kind: "list" }>): boolean {
  const inputs = spec.itemFields.filter((f) => f.kind !== "boolean");
  return inputs.length === 1 && inputs[0].kind === "text";
}

function SmallButton({
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
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-body text-sm text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

/**
 * A text box with an "Insert answer" menu under it (when earlier steps save answers), which
 * puts {name} where the cursor was.
 */
function TextBox({
  multiline,
  available,
  value,
  onChange,
  className,
  rows,
  maxLength,
  placeholder,
  onBlur,
}: {
  multiline: boolean;
  available: AvailableAnswer[];
  value: string;
  onChange: (next: string) => void;
  className: string;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  onBlur: () => void;
}) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  function insert(name: string) {
    const el = ref.current;
    // An input keeps its selection after losing focus, so this is where the cursor last was.
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const token = `{${name}}`;
    onChange(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  const shared = {
    ref,
    className,
    value,
    maxLength,
    placeholder,
    onBlur,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
  };
  // Two answers can share a name (that's flagged as an error); list each name once.
  const names = available.filter((a, i) => available.findIndex((b) => b.name === a.name) === i);

  return (
    <>
      {multiline ? <textarea rows={rows} {...shared} /> : <input {...shared} />}
      {names.length > 0 && (
        <select
          aria-label="Insert an earlier answer"
          value=""
          onChange={(e) => e.target.value && insert(e.target.value)}
          className="mt-1 max-w-full rounded-lg border border-line bg-surface px-2 py-1 font-body text-xs text-primary hover:border-primary focus:border-primary focus:outline-none"
        >
          <option value="">+ Insert an earlier answer…</option>
          {names.map((a) => (
            <option key={a.name} value={a.name}>
              {`{${a.name}} · step ${a.stepIndex + 1} ${a.stepLabel}: ${clip(a.label, 50)}`}
            </option>
          ))}
        </select>
      )}
    </>
  );
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export interface PropsFormProps {
  fields: FieldSpec[];
  value: Values;
  onChange: (next: Values) => void;
  /** The error to show for a field path ("questions.0.prompt"), if any should show yet. */
  errorFor: (path: string) => string | undefined;
  /** Called when the author leaves a field, so its errors start showing. */
  onTouch: (path: string) => void;
  /** Path of `value` within the step's settings, ending in "." (empty at the top). */
  prefix?: string;
  /** Answers from earlier steps this step's text can use. */
  available?: AvailableAnswer[];
}

/** The settings form for one step, built entirely from the component's field specs. */
export function PropsForm({ fields, value, onChange, errorFor, onTouch, prefix = "", available = [] }: PropsFormProps) {
  function set(key: string, next: unknown) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="flex flex-col gap-4">
      {fields.map((spec) => {
        if (!isFieldShown(spec, value)) return null;
        const path = prefix + spec.key;
        const current = value[spec.key];
        const error = errorFor(path);
        const touch = () => onTouch(path);

        switch (spec.kind) {
          case "text": {
            const text = typeof current === "string" ? current : "";
            const presets = spec.presets;
            const custom = presets ? !presets.some((p) => p.value === text) : true;
            return (
              <Label key={spec.key} spec={spec} error={error}>
                {presets && (
                  <select
                    className={control()}
                    value={custom ? CUSTOM : text}
                    onChange={(e) => set(spec.key, e.target.value === CUSTOM ? "" : e.target.value)}
                  >
                    {presets.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                    <option value={CUSTOM}>Write my own…</option>
                  </select>
                )}
                {custom && (
                  <TextBox
                    multiline={false}
                    available={available}
                    className={`${control(error)} ${presets ? "mt-2" : ""}`}
                    value={text}
                    maxLength={spec.maxLength}
                    placeholder={spec.placeholder ?? (presets ? "Write the topic" : undefined)}
                    onChange={(next) => set(spec.key, next)}
                    onBlur={touch}
                  />
                )}
              </Label>
            );
          }

          case "textarea":
            return (
              <Label key={spec.key} spec={spec} error={error}>
                <TextBox
                  multiline
                  available={available}
                  className={control(error)}
                  rows={spec.rows ?? 3}
                  value={typeof current === "string" ? current : ""}
                  maxLength={spec.maxLength}
                  placeholder={spec.placeholder}
                  onChange={(next) => set(spec.key, next)}
                  onBlur={touch}
                />
              </Label>
            );

          case "answerName":
            return (
              <Label key={spec.key} spec={spec} error={error}>
                <span className="flex items-center gap-1 font-mono text-sm text-ink-muted">
                  {"{"}
                  <input
                    className={`${control(error)} max-w-[16rem] py-1.5 font-mono`}
                    value={typeof current === "string" ? current : ""}
                    maxLength={30}
                    placeholder="e.g. goal"
                    spellCheck={false}
                    onChange={(e) => set(spec.key, toAnswerName(e.target.value))}
                    onBlur={touch}
                  />
                  {"}"}
                </span>
              </Label>
            );

          case "number":
            return (
              <Label key={spec.key} spec={spec} error={error}>
                <input
                  type="number"
                  className={control(error)}
                  min={spec.min}
                  max={spec.max}
                  value={typeof current === "number" ? current : ""}
                  onChange={(e) => set(spec.key, e.target.value === "" ? undefined : Number(e.target.value))}
                  onBlur={touch}
                />
              </Label>
            );

          case "select": {
            const addons = spec.dynamicOptions === "practice-addons";
            const options = addons
              ? [
                  { value: "", label: "None" },
                  ...Object.entries(PRACTICE_ADDONS).map(([k, a]) => ({ value: k, label: a.label })),
                ]
              : spec.options;
            const selectedValue = typeof current === "string" ? current : "";
            const help = addons ? (PRACTICE_ADDONS[selectedValue]?.description ?? spec.help) : spec.help;
            return (
              <Label key={spec.key} spec={spec} error={error} help={help}>
                <select
                  className={control(error)}
                  value={selectedValue}
                  onChange={(e) => set(spec.key, e.target.value)}
                  onBlur={touch}
                >
                  {!addons && !options.some((o) => o.value === selectedValue) && <option value="">Choose…</option>}
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
                    className="mt-0.5 h-4 w-4 accent-primary"
                    checked={current === true}
                    onChange={(e) => set(spec.key, e.target.checked)}
                  />
                  <span className="font-body text-sm text-ink">{spec.label}</span>
                </label>
                {spec.help && <span className="mt-1 block pl-6 font-body text-xs text-ink-muted">{spec.help}</span>}
                <ErrorText error={error} />
              </div>
            );

          case "list": {
            const items = Array.isArray(current) ? (current as Values[]) : [];
            const exclusive = spec.itemFields.filter((f) => f.kind === "boolean" && f.exclusive);

            const setItems = (next: Values[]) => set(spec.key, next);
            const move = (i: number, j: number) => {
              const next = [...items];
              [next[i], next[j]] = [next[j], next[i]];
              setItems(next);
            };
            const remove = (i: number) => setItems(items.filter((_, j) => j !== i));
            const change = (i: number, item: Values) => {
              let next = items.map((it, j) => (j === i ? item : it));
              // Turning an exclusive option on turns it off on every other item.
              for (const f of exclusive) {
                if (item[f.key] === true && items[i][f.key] !== true) {
                  next = next.map((it, j) => (j === i ? it : { ...it, [f.key]: false }));
                }
              }
              setItems(next);
            };
            const reorder = (i: number) => (
              <>
                <SmallButton label={`Move ${spec.itemLabel.toLowerCase()} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                  ↑
                </SmallButton>
                <SmallButton
                  label={`Move ${spec.itemLabel.toLowerCase()} down`}
                  disabled={i === items.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  ↓
                </SmallButton>
                <SmallButton
                  label={`Remove ${spec.itemLabel.toLowerCase()}`}
                  disabled={items.length <= spec.minItems}
                  onClick={() => remove(i)}
                >
                  ×
                </SmallButton>
              </>
            );

            return (
              <div key={spec.key}>
                <div className="mb-1.5 font-body text-xs font-semibold text-ink">{spec.label}</div>
                {spec.help && <p className="-mt-1 mb-1.5 font-body text-xs text-ink-muted">{spec.help}</p>}

                {isRowList(spec) ? (
                  <ul className="flex flex-col gap-1.5">
                    {items.map((item, i) => {
                      const textSpec = spec.itemFields.find((f) => f.kind === "text")!;
                      const textPath = `${path}.${i}.${textSpec.key}`;
                      const textError = errorFor(textPath);
                      return (
                        <li key={i}>
                          <div className="flex items-center gap-1.5">
                            {exclusive.map((f) => (
                              <input
                                key={f.key}
                                type="radio"
                                name={`${path}-${f.key}`}
                                aria-label={`${f.label}: ${spec.itemLabel} ${i + 1}`}
                                title={f.label}
                                className="h-4 w-4 shrink-0 accent-primary"
                                checked={item[f.key] === true}
                                onChange={() => change(i, { ...item, [f.key]: true })}
                              />
                            ))}
                            <input
                              className={`${control(textError)} py-1.5`}
                              aria-label={`${spec.itemLabel} ${i + 1}`}
                              placeholder={`${spec.itemLabel} ${i + 1}`}
                              value={typeof item[textSpec.key] === "string" ? (item[textSpec.key] as string) : ""}
                              maxLength={textSpec.kind === "text" ? textSpec.maxLength : undefined}
                              onChange={(e) => change(i, { ...item, [textSpec.key]: e.target.value })}
                              onBlur={() => onTouch(textPath)}
                            />
                            {reorder(i)}
                          </div>
                          <ErrorText error={textError} />
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex flex-col gap-3">
                    {items.map((item, i) => (
                      <div key={i} className="rounded-xl border border-line bg-bg p-3">
                        <div className="mb-2 flex items-center gap-1">
                          <span className="flex-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                            {spec.itemLabel} {i + 1}
                          </span>
                          {reorder(i)}
                        </div>
                        <PropsForm
                          fields={spec.itemFields}
                          value={item}
                          onChange={(next) => change(i, next)}
                          errorFor={errorFor}
                          onTouch={onTouch}
                          prefix={`${path}.${i}.`}
                          available={available}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <ErrorText error={error} />
                <button
                  type="button"
                  disabled={items.length >= spec.maxItems}
                  onClick={() => setItems([...items, structuredClone(spec.itemDefault)])}
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
