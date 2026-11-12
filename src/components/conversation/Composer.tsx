"use client";

import type { Ref } from "react";
import { Icon } from "@/components/ui/Icon";

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** Waiting on a reply: the text stays put and Send is off. */
  busy?: boolean;
  maxChars: number;
  placeholder?: string;
  ariaLabel?: string;
  textareaRef?: Ref<HTMLTextAreaElement>;
  onFocus?: () => void;
}

/**
 * The message box used by every conversation (School and the Park).
 *
 * While waiting the field is read-only, not disabled: disabling a focused field closes
 * the phone keyboard, and the layout would jump on every turn.
 */
export function Composer({
  value,
  onChange,
  onSubmit,
  busy = false,
  maxChars,
  placeholder = "Your reply…",
  ariaLabel = "Your message",
  textareaRef,
  onFocus,
}: ComposerProps) {
  const canSend = !busy && value.trim().length > 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSubmit();
      }}
      className="flex items-end gap-2 rounded-2xl border border-line bg-surface py-1.5 pl-4 pr-1.5 focus-within:border-primary"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxChars))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSubmit();
            }
          }}
          onFocus={onFocus}
          rows={1}
          placeholder={placeholder}
          aria-label={ariaLabel}
          readOnly={busy}
          aria-busy={busy}
          // 16px on phones: anything smaller makes iOS zoom the page when the field is focused.
          className={`min-h-[32px] w-full resize-none bg-transparent py-2 font-body text-base text-ink placeholder:text-ink-muted focus:outline-none sm:text-sm ${
            busy ? "opacity-60" : ""
          }`}
        />
        {value.length > maxChars * 0.8 && (
          <span
            className={`mb-1 self-end font-mono text-xs ${value.length >= maxChars ? "text-danger" : "text-ink-muted"}`}
          >
            {value.length}/{maxChars}
          </span>
        )}
      </div>
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Send"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-bg transition-opacity disabled:opacity-30"
      >
        <Icon name="arrow-right" size={18} strokeWidth={2} />
      </button>
    </form>
  );
}
