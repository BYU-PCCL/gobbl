"use client";

import { InputHTMLAttributes, forwardRef, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, leadingIcon, trailingIcon, className = "", id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const noteId = hint || error ? `${inputId}-note` : undefined;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block font-body text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <div
          className={`relative flex items-center rounded-full border bg-surface
            transition-[border-color,box-shadow] duration-150
            focus-within:ring-4
            ${error
              ? "border-danger focus-within:border-danger focus-within:ring-danger/20"
              : "border-line focus-within:border-primary focus-within:ring-primary/20"}
            dark:bg-roost-800 dark:border-roost-700`}
        >
          {leadingIcon && (
            <span className="pl-4 text-ink-muted" aria-hidden>
              {leadingIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={noteId}
            className={`w-full bg-transparent px-4 py-3 font-body text-base text-ink sm:text-sm
              placeholder:text-ink-muted focus:outline-none
              ${className}`}
            {...props}
          />
          {trailingIcon && (
            <span className="pr-4 text-ink-muted" aria-hidden>
              {trailingIcon}
            </span>
          )}
        </div>
        {hint && !error && (
          <p id={noteId} className="font-body text-xs text-ink-soft">{hint}</p>
        )}
        {error && (
          <p id={noteId} role="alert" className="font-body text-xs text-danger">{error}</p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
