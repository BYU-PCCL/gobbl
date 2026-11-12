"use client";

import { Button } from "./Button";
import { Sheet } from "./Sheet";

export interface LeaveConfirmProps {
  open: boolean;
  /** e.g. "Leave School?" */
  title: string;
  /** What is lost, in one sentence. */
  body: string;
  onStay: () => void;
  onLeave: () => void;
  stayLabel?: string;
  leaveLabel?: string;
}

/** Asked before leaving an activity when leaving loses something. Staying is the default action. */
export function LeaveConfirm({
  open,
  title,
  body,
  onStay,
  onLeave,
  stayLabel = "Stay",
  leaveLabel = "Leave",
}: LeaveConfirmProps) {
  return (
    <Sheet open={open} onClose={onStay} title={title}>
      <p className="font-body text-sm leading-6 text-ink-soft">{body}</p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
        <Button onClick={onStay} data-autofocus className="sm:flex-1">
          {stayLabel}
        </Button>
        <Button variant="outline" onClick={onLeave} className="sm:flex-1">
          {leaveLabel}
        </Button>
      </div>
    </Sheet>
  );
}
