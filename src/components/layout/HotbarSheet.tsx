"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { MyTurkey } from "@/components/turkey/MyTurkey";
import { activityHref, lockedReason, type HomeActivity } from "@/lib/flock/home";
import type { TurkeyView } from "@/lib/flock/view";
import type { ResolvedNavItem } from "./navItems";

const WHO: Record<HomeActivity, string> = {
  feed: "Who's eating?",
  school: "Who's going to School?",
  park: "Who's off to the Park?",
};

/**
 * What a hotbar tab opens when it cannot simply navigate:
 *   locked: why it is shut, and a button for the step that opens it;
 *   choose: which turkey to take, when the coop has several.
 */
export function HotbarSheet({
  item,
  hatched,
  select,
  onClose,
}: {
  item: ResolvedNavItem | null;
  hatched: TurkeyView[];
  select: (id: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const activity = item?.activity;

  if (!item || !activity) return null;

  if (item.mode === "locked") {
    return (
      <Sheet open onClose={onClose} title={item.lockedTitle ?? `${item.label} is not open yet`}>
        <p className="font-body text-sm leading-6 text-ink-soft">{item.lockedReason}</p>
        {item.lockedCta && (
          <ButtonLink href={item.lockedCta.href} onClick={onClose} size="lg" className="mt-5 w-full" data-autofocus>
            {item.lockedCta.label}
          </ButtonLink>
        )}
      </Sheet>
    );
  }

  if (item.mode !== "choose") return null;

  return (
    <Sheet open onClose={onClose} title={WHO[activity]}>
      <ul className="space-y-2">
        {hatched.map((t) => {
          const name = t.name?.trim() || "Your turkey";
          const shut = lockedReason(activity, t);
          const row = "flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2 text-left transition-colors hover:border-ink-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30";
          const face = (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft">
              <MyTurkey turkey={t} size={32} crop="head" decorative />
            </span>
          );
          if (shut) {
            // Not open for this one yet: the row takes it to the step that opens it.
            return (
              <li key={t.id}>
                <Link
                  href={activityHref(shut.step, t)}
                  onClick={() => {
                    select(t.id);
                    onClose();
                  }}
                  className={row}
                >
                  {face}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-body text-sm font-semibold text-ink">{name}</span>
                    <span className="block font-body text-xs text-ink-muted">
                      {shut.step === "feed" ? "Needs a lesson first" : "Needs School first"}
                    </span>
                  </span>
                  <span className="shrink-0 font-body text-xs font-semibold text-primary">{shut.step === "feed" ? "Feed" : "School"}</span>
                </Link>
              </li>
            );
          }
          return (
            <li key={t.id}>
              <button
                type="button"
                className={row}
                onClick={() => {
                  select(t.id);
                  onClose();
                  router.push(activityHref(activity, t));
                }}
              >
                {face}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-body text-sm font-semibold text-ink">{name}</span>
                  <span className="block truncate font-body text-xs text-ink-soft">
                    {t.stageName} · {t.skillLabel}
                  </span>
                </span>
                <Icon name="chevron-right" size={18} />
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
