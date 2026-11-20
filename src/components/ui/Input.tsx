"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  /** Decorative; hidden from assistive tech. For a control (e.g. a show-password button) use trailingAction. */
  trailingIcon?: React.ReactNode;
  /** An interactive element rendered inside the field's trailing edge, such as a toggle button. */
  trailingAction?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, leadingIcon, trailingIcon, trailingAction, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block font-body text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <div
          className={`relative flex items-center rounded-full border bg-surface
            transition-[border-color,box-shadow] duration-150
            focus-within:ring-4
            ${error
              ? "border-plume-500 focus-within:border-plume-500 focus-within:ring-plume-500/20"
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
            className={`w-full bg-transparent px-4 py-3 font-body text-sm text-ink
              placeholder:text-ink-muted focus:outline-none
              ${className}`}
            {...props}
          />
          {trailingIcon && (
            <span className="pr-4 text-ink-muted" aria-hidden>
              {trailingIcon}
            </span>
          )}
          {trailingAction && <span className="flex items-center pr-1.5">{trailingAction}</span>}
        </div>
        {hint && !error && (
          <p className="font-body text-xs text-ink-soft">{hint}</p>
        )}
        {error && (
          <p className="font-body text-xs text-plume-500">{error}</p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
