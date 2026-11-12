"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { ActivityResults } from "@/components/activity/ActivityResults";
import { Composer } from "@/components/conversation/Composer";
import { TranscriptSheet } from "@/components/conversation/TranscriptSheet";
import { MyTurkey } from "@/components/turkey/MyTurkey";
import type { TurkeyReaction } from "@/components/turkey/TurkeyCharacter";
import { useFlock } from "@/components/turkey/useFlock";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { LeaveConfirm } from "@/components/ui/LeaveConfirm";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  SCHOOL_MAX_MESSAGE_LENGTH,
  SCHOOL_MIN_ANSWER_LENGTH as MIN_ANSWER_LENGTH,
  SCHOOL_ROUNDS,
} from "@/lib/flock/config";
import type { ActivityRewards } from "@/lib/conversation";
import { fetchJson } from "@/lib/fetchJson";
import { activityHref } from "@/lib/flock/home";
import type { SchoolTurn } from "@/lib/flock/school";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const bubbleBase = "rounded-2xl border px-4 py-3 font-body text-sm leading-6 text-ink shadow-soft";
const TURN_TIMEOUT_MS = 30000;
const TEXTAREA_MAX_HEIGHT_PX = 120;

/** Scrollable, padded, centred container for every non-lesson state in the focus view. */
function Page({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-md px-4 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),2rem)] sm:px-8">
        {children}
      </div>
    </div>
  );
}

/** Picks the turkey's size from the screen so only one MyTurkey ever mounts. */
function useTurkeySize() {
  const [size, setSize] = useState(150);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const vv = window.visualViewport;
    const update = () => {
      const h = vv?.height ?? window.innerHeight;
      setSize(h < 560 ? 96 : mq.matches ? 200 : 150);
    };
    update();
    mq.addEventListener("change", update);
    vv?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      mq.removeEventListener("change", update);
      vv?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return size;
}

/** True from the lg breakpoint up, where the transcript is a side panel instead of a sheet. */
function useIsLg() {
  const [lg, setLg] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setLg(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return lg;
}

/**
 * School: your turkey is a curious student (an AI) asking you, the teacher,
 * simple questions about its skill. After SCHOOL_ROUNDS answers it says what
 * it learned, and the lesson is recorded (Cheer refill, feathers, growth).
 */
export default function SchoolPage() {
  const params = useParams();
  const turkeyId = params.turkeyId as string;
  const router = useRouter();
  const { status } = useSession();
  const flock = useFlock();
  const { turkeys, loading, error } = flock;
  const turkeySize = useTurkeySize();
  const isLg = useIsLg();

  const found = turkeys.find((t) => t.id === turkeyId) ?? null;
  const turkey = found && found.hatched ? found : null;
  const name = turkey?.name ?? "Your turkey";

  // The lesson so far (sent to the server for the turkey's next line), plus its closing words.
  const [history, setHistory] = useState<SchoolTurn[]>([]);
  const [closing, setClosing] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [turkeyError, setTurkeyError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [reaction, setReaction] = useState<TurkeyReaction>("none");
  const [done, setDone] = useState<ActivityRewards | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const started = useRef(false);
  const mounted = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const answers = history.filter((t) => t.role === "teacher").map((t) => t.content);
  const busy = thinking || closing !== null || turkeyError !== null || history.length === 0;
  const lessonStarted = answers.length > 0 && !done;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  // The turkey opens the lesson once it's known (and only if it is fed enough to learn).
  useEffect(() => {
    if (!turkey || !turkey.unlocked.school || started.current) return;
    started.current = true;
    void askTurkey([]);
    // askTurkey only reads stable values (turkeyId, name) besides its argument.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turkey]);

  // Warn before the tab is closed or reloaded mid-lesson.
  useEffect(() => {
    if (!lessonStarted) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [lessonStarted]);

  // Auto-grow the answer box.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`;
    el.style.overflowY = el.scrollHeight > TEXTAREA_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, [input]);

  /** Ask the AI for the turkey's next line, given the lesson so far. */
  async function askTurkey(sofar: SchoolTurn[]) {
    setTurkeyError(null);
    setThinking(true);
    try {
      const data = await fetchJson<{ message?: unknown; done?: boolean }>(`/api/turkeys/${turkeyId}/school/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: sofar }),
        timeoutMs: TURN_TIMEOUT_MS,
      });
      if (typeof data.message !== "string") throw new Error("Bad reply");
      const message = data.message;
      if (!mounted.current) return;
      setThinking(false);
      if (data.done) {
        setClosing(message);
        await wait(1200);
        if (mounted.current) {
          void submit(sofar.filter((t) => t.role === "teacher").map((t) => t.content));
        }
      } else {
        setHistory([...sofar, { role: "turkey", content: message }]);
      }
    } catch {
      if (!mounted.current) return;
      setThinking(false);
      setTurkeyError(`${name} is feeling sleepy. Try again in a moment.`);
    }
  }

  async function submit(allAnswers: string[]) {
    setSubmitError(null);
    setRetryable(true);
    setSaving(true);
    try {
      const res = await fetch(`/api/turkeys/${turkeyId}/school`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: allAnswers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // A 4xx will not succeed on retry; only network errors and 5xx are retryable.
        if (mounted.current) setRetryable(res.status >= 500);
        throw new Error("save failed");
      }
      if (!mounted.current) return;
      setReaction("cheer");
      setDone(data.rewards as ActivityRewards);
    } catch {
      if (!mounted.current) return;
      setSubmitError("save failed");
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  function backToTurkey() {
    flock.select(turkeyId);
    router.push("/home");
  }

  function requestLeave() {
    if (lessonStarted) setConfirmLeave(true);
    else backToTurkey();
  }

  async function send() {
    const text = input.trim();
    if (!turkey || busy || text.length < MIN_ANSWER_LENGTH || answers.length >= SCHOOL_ROUNDS) return;
    setInput("");
    setReaction("listen");
    const next: SchoolTurn[] = [...history, { role: "teacher", content: text }];
    setHistory(next);
    await askTurkey(next);
  }

  if (done) {
    return (
      <div className="h-full overflow-y-auto pt-[env(safe-area-inset-top)]">
        <ActivityResults kind="school" padded rewards={done} onContinue={backToTurkey} continueLabel={`Back to ${name}`}>
          <div className="space-y-3 text-center">
            {closing && <p className="font-body text-base italic leading-6 text-ink">&ldquo;{closing}&rdquo;</p>}
            {done.feathers === 0 && (
              <p className="font-body text-sm text-ink-soft">No feathers for more lessons today, but {name} loved it.</p>
            )}
          </div>
        </ActivityResults>
      </div>
    );
  }

  if (loading || status === "loading") {
    return (
      <Page>
        <LoadingState message="Getting the classroom ready..." />
      </Page>
    );
  }

  if (!turkey) {
    if (!found && error) {
      return (
        <Page>
          <div className="py-12 text-center">
            <p className="font-body text-base text-ink">We could not load your flock.</p>
            <Button className="mt-4" onClick={() => void flock.reload()}>
              Try again
            </Button>
          </div>
        </Page>
      );
    }
    return (
      <Page>
        <div className="py-12 text-center">
          <p className="font-body text-base text-ink">
            {found ? "This egg has not hatched yet." : "We couldn't find that turkey."}
          </p>
          <ButtonLink href="/flock" className="mt-4">
            Back to your flock
          </ButtonLink>
        </div>
      </Page>
    );
  }

  if (!turkey.unlocked.school) {
    return (
      <Page>
        <div className="flex flex-col items-center rounded-2xl border border-line bg-surface p-6 text-center shadow-soft">
          <MyTurkey turkey={turkey} size={120} inScene />
          <h1 className="mt-3 font-display text-display-md text-ink">{name} is too hungry to learn</h1>
          <p className="mt-1 font-body text-sm text-ink-soft">Feed {name} a lesson first, then come back to School.</p>
          <ButtonLink href={activityHref("feed", turkey)} className="mt-5">
            Feed {name}
          </ButtonLink>
        </div>
      </Page>
    );
  }

  const trimmedLength = input.trim().length;
  const remaining = MIN_ANSWER_LENGTH - trimmedLength;
  const lines: SchoolTurn[] = closing ? [...history, { role: "turkey", content: closing }] : history;
  const lastTurkeyLine = [...lines].reverse().find((l) => l.role === "turkey")?.content ?? null;
  const lastAnswer = [...history].reverse().find((l) => l.role === "teacher")?.content ?? null;
  const turkeyLine = closing ?? lastTurkeyLine;
  const showInput = !submitError && closing === null;
  const savingNow = closing !== null && !submitError;
  const sheetMessages = lines.map((l) => ({
    role: l.role === "teacher" ? ("user" as const) : ("assistant" as const),
    content: l.content,
  }));
  const downTail =
    "absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-line bg-surface";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="px-4 pt-[max(env(safe-area-inset-top),0.75rem)] sm:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-2 gap-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={requestLeave}
            disabled={savingNow}
            className="-ml-1 shrink-0 px-2.5"
          >
            <Icon name="arrow-left" size={16} strokeWidth={2} />
            Leave
          </Button>
          <h1 className="order-last w-full min-w-0 font-display text-display-sm text-ink sm:order-none sm:w-auto sm:flex-1 sm:truncate">
            School &middot; Teach {name} about {turkey.skillLabel}
          </h1>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto shrink-0 sm:ml-0"
            aria-pressed={transcriptOpen}
            onClick={() => setTranscriptOpen((o) => !o)}
          >
            Transcript
          </Button>
          <div className="flex shrink-0 items-center gap-2">
            <div
              className="flex gap-1.5"
              role="img"
              aria-label={`${answers.length} of ${SCHOOL_ROUNDS} questions answered`}
            >
              {Array.from({ length: SCHOOL_ROUNDS }, (_, i) => (
                <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < answers.length ? "bg-primary" : "bg-line"}`} />
              ))}
            </div>
            <span aria-hidden className="font-body text-xs font-semibold text-ink-soft">
              {answers.length} of {SCHOOL_ROUNDS}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-2 flex min-h-0 w-full max-w-5xl flex-1 gap-4 px-4 sm:px-8">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col items-center overflow-y-auto" aria-label="Lesson">
          <div className="my-auto flex w-full flex-col items-center py-2">
            <div className="flex min-h-[96px] w-full max-w-md flex-col items-center justify-end" aria-live="polite">
              {thinking && closing === null ? (
                <div className="relative">
                  <div className={`${bubbleBase} border-line bg-surface`} aria-label={`${name} is thinking`}>
                    <span className="inline-flex gap-1" aria-hidden>
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-muted" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-muted [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-muted [animation-delay:300ms]" />
                    </span>
                  </div>
                  <span aria-hidden className={downTail} />
                </div>
              ) : (
                turkeyLine && (
                  <div className="relative max-w-full animate-slide-up motion-reduce:animate-none">
                    <div className={`max-h-[40vh] overflow-y-auto break-words border-line bg-surface ${bubbleBase}`}>
                      {turkeyLine}
                    </div>
                    <span aria-hidden className={downTail} />
                  </div>
                )
              )}
            </div>

            <div className="mt-3">
              <MyTurkey
                turkey={turkey}
                size={turkeySize}
                inScene
                reaction={reaction}
                onReactionEnd={() => setReaction("none")}
              />
            </div>

            <div className="mt-3 flex min-h-[64px] w-full max-w-md flex-col items-center">
              {lastAnswer && (
                <div className="relative max-w-full animate-slide-up motion-reduce:animate-none">
                  <span
                    aria-hidden
                    className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-primary/30 bg-primary-soft"
                  />
                  <div
                    className={`max-h-[40vh] overflow-y-auto break-words border-primary/30 bg-primary-soft ${bubbleBase}`}
                  >
                    {lastAnswer}
                  </div>
                </div>
              )}
              {turkeyError && (
                <div className="mt-2 space-y-2 text-center">
                  <p className="font-body text-sm text-ink-soft">{turkeyError}</p>
                  <Button size="sm" onClick={() => void askTurkey(history)}>
                    Try again
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {transcriptOpen && isLg && (
          <aside
            aria-label="Transcript"
            className="mb-2 hidden max-h-full min-h-0 w-80 shrink-0 flex-col self-stretch rounded-2xl border border-line bg-surface lg:flex"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-1.5">
              <h2 className="font-display text-base font-bold text-ink">Transcript</h2>
              <button
                type="button"
                onClick={() => setTranscriptOpen(false)}
                aria-label="Close transcript"
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-2"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {lines.length === 0 && <p className="font-body text-sm text-ink-muted">Nothing said yet.</p>}
              {lines.map((l, i) => (
                <p key={i} className="break-words font-body text-sm leading-6 text-ink">
                  <span className="mr-1.5 font-mono text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
                    {l.role === "teacher" ? "You:" : `${name}:`}
                  </span>
                  {l.content}
                </p>
              ))}
            </div>
          </aside>
        )}
      </div>

      <div className="px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 sm:px-8">
        <div className="mx-auto w-full max-w-xl">
          {showInput && (
            <>
              <Composer
                value={input}
                onChange={setInput}
                onSubmit={() => void send()}
                busy={busy}
                maxChars={SCHOOL_MAX_MESSAGE_LENGTH}
                placeholder="In your own words..."
                ariaLabel="Your answer"
                textareaRef={inputRef}
              />
              <p className="mt-1 h-4 px-2 font-body text-xs text-ink-muted">
                {trimmedLength > 0 && remaining > 0
                  ? `Say a little more (${remaining} more character${remaining === 1 ? "" : "s"}).`
                  : ""}
              </p>
            </>
          )}
          {savingNow && (
            <div role="status" className="flex justify-center py-1">
              <Button size="md" variant="outline" loading>
                Saving the lesson&hellip;
              </Button>
            </div>
          )}
          {submitError && (
            <div role="alert" className="space-y-3 py-1 text-center">
              <p className="font-body text-sm text-danger">
                {retryable
                  ? "We could not save this lesson. Check your connection and try again."
                  : "We could not save this lesson, so it will not count."}
              </p>
              {retryable ? (
                <Button size="md" loading={saving} onClick={() => void submit(answers)}>
                  Try again
                </Button>
              ) : (
                <Button size="md" variant="outline" onClick={backToTurkey}>
                  Back to {name}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <TranscriptSheet
        open={transcriptOpen && !isLg}
        onClose={() => setTranscriptOpen(false)}
        messages={sheetMessages}
        initials={name}
      />

      <LeaveConfirm
        open={confirmLeave}
        title="Leave School?"
        body="This lesson won't count."
        onStay={() => setConfirmLeave(false)}
        onLeave={() => {
          setConfirmLeave(false);
          backToTurkey();
        }}
      />
    </div>
  );
}
