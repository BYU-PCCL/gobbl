"use client";

import { Button, ButtonLink } from "@/components/ui/Button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-display text-display-md text-ink">Something went wrong.</h1>
      <p className="font-body text-sm text-ink-soft">This page hit a problem. Your progress is saved.</p>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/flock" variant="outline">
          Back to your flock
        </ButtonLink>
      </div>
    </div>
  );
}
