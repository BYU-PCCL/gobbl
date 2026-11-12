import { ButtonLink } from "@/components/ui/Button";
import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-5 text-center">
      <TurkeyCharacter stage={1} size={96} decorative />
      <h1 className="font-display text-display-md text-ink">Nothing roosts here.</h1>
      <p className="font-body text-sm text-ink-soft">That page does not exist, or it has moved.</p>
      <ButtonLink href="/flock">Back to your flock</ButtonLink>
    </div>
  );
}
