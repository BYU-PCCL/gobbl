"use client";

import { useState } from "react";
import { Icon } from "../ui/Icon";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  civilityScore?: number | null;
  /** The scorer's one-sentence reason for the score; revealed on tap or hover of the score. */
  feedback?: string | null;
  /** When true, show a small "+EVIDENCE / +EMPATHY / etc." tag below the user bubble. */
  highlightDimension?: string;
}

/**
 * Chat message bubble — Harvest direction.
 *
 * - User bubble: solid ink (near-black) with bg-colored text, rounded with a
 *   reduced bottom-right corner for the "tail" feel.
 * - Partner bubble: surface (white) with a hairline border, reduced
 *   bottom-left corner. Avatar leads as a tiny ochre disc.
 *
 * The civility score under a bubble is a button when the scorer gave a reason:
 * tap (or hover with a mouse) to read it. Same reveal pattern as the results
 * page's dimension rows.
 */
export function MessageBubble({
  role,
  content,
  civilityScore,
  feedback,
  highlightDimension,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const showFeedback = Boolean(feedback) && (pinned || hovered);
  const scoreLabel = civilityScore != null ? `Civility ${Math.round(civilityScore * 10)}` : null;

  return (
    <div className={`flex animate-slide-up ${isUser ? "justify-end" : "justify-start"} gap-2`}>
      {!isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft">
          <Icon name="feather" size={16} />
        </div>
      )}
      <div className="max-w-[78%] lg:max-w-[70%]">
        <div
          className={`whitespace-pre-wrap rounded-2xl px-3.5 py-3 font-body text-[13.5px] leading-snug lg:text-[15px] lg:leading-relaxed ${
            isUser
              ? "bg-ink text-bg rounded-br-md shadow-soft"
              : "border border-line bg-surface text-ink rounded-bl-md"
          }`}
        >
          {content}
        </div>
        {isUser && highlightDimension && (
          <div className="mt-1 flex justify-end gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 13l4 4 10-10" stroke="rgb(31 73 55)" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-forest-600">
              +{highlightDimension}
            </span>
          </div>
        )}
        {scoreLabel && !(isUser && highlightDimension) && (
          <div className={`mt-1 flex flex-col ${isUser ? "items-end" : "items-start"}`}>
            {feedback ? (
              <button
                type="button"
                onClick={() => setPinned((p) => !p)}
                onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
                onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
                aria-expanded={showFeedback}
                aria-label={`${scoreLabel}. Show why`}
                className="flex items-center gap-1 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-muted underline decoration-dotted underline-offset-2"
              >
                {scoreLabel}
                <span aria-hidden className="text-[8px]">{showFeedback ? "x" : "?"}</span>
              </button>
            ) : (
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                {scoreLabel}
              </span>
            )}
            {showFeedback && (
              <p className="mt-1 max-w-[20rem] rounded-xl border border-line bg-surface px-3 py-2 font-body text-xs leading-snug text-ink-soft">
                {feedback}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
