"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Shown as the heading and used as the dialog's accessible name. */
  title: string;
  children: ReactNode;
  /** false for a choice the user has to make: no close button, Escape and backdrop do nothing. */
  dismissible?: boolean;
  /** Extra classes for the scrolling body. */
  bodyClassName?: string;
}

/**
 * The one modal surface: a bottom sheet on phones, a centred card from sm up.
 * Rendered in a portal above the hotbar. Focus moves in on open, stays inside while
 * open, and goes back to whatever opened it on close.
 */
export function Sheet({ open, onClose, title, children, dismissible = true, bodyClassName = "" }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === firstItem || !panel.contains(active))) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && (active === lastItem || !panel.contains(active))) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      opener?.focus();
    };
  }, [open, onClose, dismissible]);

  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-ink/50 animate-fade-in motion-reduce:animate-none"
        onClick={dismissible ? onClose : undefined}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex max-h-[85%] w-full max-w-lg flex-col overscroll-contain rounded-t-3xl bg-bg shadow-lift animate-slide-up focus:outline-none motion-reduce:animate-none sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          <h2 className="font-display text-display-sm text-ink">{title}</h2>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-surface-2"
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
        <div
          className={`min-h-0 flex-1 overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-1 ${bodyClassName}`}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
