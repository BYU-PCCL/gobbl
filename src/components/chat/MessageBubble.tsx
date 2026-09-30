"use client";

import { Icon } from "../ui/Icon";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  civilityScore?: number | null;
  /** When true, show a small "+EVIDENCE / +EMPATHY / etc." tag below the user bubble. */
  highlightDimension?: string;
}

/**
 * Chat message bubble — Harvest direction.
 *
 * - User bubble: solid ink (near-black) with bg-colored text, rounded with a
 *   reduced bottom-right corner for the "tail" feel.
 * - Robert bubble: surface (white) with a hairline border, reduced
 *   bottom-left corner. Avatar leads as a tiny ochre disc.
 *
 * Civility callouts surface as a small forest "+EVIDENCE" badge under the
 * user's most recent message when the API returned a per-dimension boost.
 */
export function MessageBubble({
  role,
  content,
  civilityScore,
  highlightDimension,
}: MessageBubbleProps) {
  const isUser = role === "user";

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
        {civilityScore != null && !(isUser && highlightDimension) && (
          <div
            className={`mt-1 flex font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-muted ${
              isUser ? "justify-end" : "justify-start"
            }`}
          >
            Civility {Math.round(civilityScore * 10)}
          </div>
        )}
      </div>
    </div>
  );
}
