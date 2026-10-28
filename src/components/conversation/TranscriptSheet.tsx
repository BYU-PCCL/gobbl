"use client";

import { useEffect, useRef } from "react";
import type { ConvMsg } from "@/lib/conversation";
import { Icon } from "@/components/ui/Icon";

/** Bottom sheet with every turn so far, newest at the bottom. Escape or the close button dismisses. */
export interface TranscriptSheetProps {
  open: boolean;
  onClose: () => void;
  messages: ConvMsg[];
  initials: string;
}

export function TranscriptSheet({ open, onClose, messages, initials }: TranscriptSheetProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, messages]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/50 animate-fade-in motion-reduce:animate-none" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Transcript"
        className="relative flex max-h-[80%] w-full max-w-3xl flex-col rounded-t-3xl bg-bg shadow-lift animate-slide-up motion-reduce:animate-none"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-display text-lg font-bold tracking-[-0.02em]">Transcript</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close transcript"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-2"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
          {messages.length === 0 && <p className="font-body text-sm text-ink-muted">Nothing said yet.</p>}
          {messages.map((m, i) => (
            <p key={i} className="font-body text-sm leading-6 text-ink">
              <span className="mr-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                {m.role === "user" ? "You:" : `${initials}:`}
              </span>
              {m.content}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
