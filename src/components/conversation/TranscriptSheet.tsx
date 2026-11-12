"use client";

import { useEffect, useRef } from "react";
import type { ConvMsg } from "@/lib/conversation";
import { Sheet } from "@/components/ui/Sheet";

/** Every turn so far, newest at the bottom. */
export interface TranscriptSheetProps {
  open: boolean;
  onClose: () => void;
  messages: ConvMsg[];
  /** Who the other speaker is, as shown before each of their lines. */
  initials: string;
}

export function TranscriptSheet({ open, onClose, messages, initials }: TranscriptSheetProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [open, messages]);

  return (
    <Sheet open={open} onClose={onClose} title="Transcript" bodyClassName="space-y-3">
      {messages.length === 0 && <p className="font-body text-sm text-ink-muted">Nothing said yet.</p>}
      {messages.map((m, i) => (
        <p key={i} className="break-words font-body text-sm leading-6 text-ink">
          <span className="mr-1.5 font-mono text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
            {m.role === "user" ? "You:" : `${initials}:`}
          </span>
          {m.content}
        </p>
      ))}
      <div ref={endRef} />
    </Sheet>
  );
}
