"use client";

import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";
import type { TurkeySkillKey } from "@/lib/flock/skills";

export interface FriendEntry {
  id: string;
  username: string;
  streak: number;
  totalDebates: number;
  isCurrentUser: boolean;
  turkey: { skill: string; name: string | null; hatched: boolean; stage: number } | null;
}

interface FriendsListProps {
  data: FriendEntry[];
}

function FriendTurkey({ turkey }: { turkey: FriendEntry["turkey"] }) {
  if (!turkey) return <TurkeyCharacter stage={1} size={44} animate={false} decorative />;
  return (
    <TurkeyCharacter
      stage={turkey.stage}
      skill={turkey.skill as TurkeySkillKey}
      size={44}
      animate={false}
      decorative
    />
  );
}

export function FriendsList({ data }: FriendsListProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line py-12 text-center">
        <p className="font-body text-sm text-ink-soft">
          Nobody else is here yet. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
      {data.map((entry) => (
        <li
          key={entry.id}
          aria-current={entry.isCurrentUser ? "true" : undefined}
          className={`flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 ${
            entry.isCurrentUser ? "bg-primary-soft/60" : ""
          }`}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center">
            <FriendTurkey turkey={entry.turkey} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-body text-sm font-semibold text-ink">
              {entry.username}
              {entry.isCurrentUser && <span className="ml-1.5 font-normal text-primary">You</span>}
            </div>
            {entry.turkey?.name && (
              <div className="truncate font-body text-xs text-ink-soft">{entry.turkey.name}</div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-4 text-right">
            <div>
              <div className="font-mono text-sm font-semibold text-ink num-tabular">
                {entry.streak}
                <span className="ml-0.5 text-xs font-normal text-ink-muted">d</span>
              </div>
              <div className="font-body text-[11px] text-ink-muted">Streak</div>
            </div>
            <div className="hidden sm:block">
              <div className="font-mono text-sm font-semibold text-ink num-tabular">{entry.totalDebates}</div>
              <div className="font-body text-[11px] text-ink-muted">Conversations</div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
