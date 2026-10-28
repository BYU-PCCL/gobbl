"use client";

/** Three quiet dots shown inside the partner's bubble while their reply loads. Static under reduced motion. */
export function TypingDots({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 py-1 ${className}`} role="status" aria-label="Typing">
      <span className="h-1.5 w-1.5 rounded-full bg-ink-muted animate-pulse motion-reduce:animate-none" />
      <span className="h-1.5 w-1.5 rounded-full bg-ink-muted opacity-60 animate-pulse motion-reduce:animate-none" style={{ animationDelay: "150ms" }} />
      <span className="h-1.5 w-1.5 rounded-full bg-ink-muted opacity-30 animate-pulse motion-reduce:animate-none" style={{ animationDelay: "300ms" }} />
    </span>
  );
}
