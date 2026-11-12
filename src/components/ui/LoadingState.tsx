import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";

/**
 * The one loading screen: an egg and a short line saying what is on its way.
 * `compact` is for a loader inside a page that already shows its heading.
 */
export function LoadingState({ message = "One moment...", compact = false }: { message?: string; compact?: boolean }) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-3 text-center font-body text-sm text-ink-soft ${
        compact ? "py-16" : "min-h-[60vh]"
      }`}
    >
      <TurkeyCharacter stage={1} size={96} decorative />
      <span>{message}</span>
    </div>
  );
}
