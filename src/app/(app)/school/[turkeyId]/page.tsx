"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { ActivityResults } from "@/components/activity/ActivityResults";
import { TranscriptSheet } from "@/components/conversation/TranscriptSheet";
import { MyTurkey } from "@/components/turkey/MyTurkey";
import { TurkeyCharacter, type TurkeyReaction } from "@/components/turkey/TurkeyCharacter";
import { useFlock } from "@/components/turkey/useFlock";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import {
  SCHOOL_MAX_MESSAGE_LENGTH,
  SCHOOL_MIN_ANSWER_LENGTH as MIN_ANSWER_LENGTH,
  SCHOOL_ROUNDS,
} from "@/lib/flock/config";
import type { ActivityRewards } from "@/lib/conversation";
import { activityHref } from "@/lib/flock/home";
import type { SchoolTurn } from "@/lib/flock/school";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const bubbleBase = "rounded-2xl border px-4 py-3 font-body text-sm leading-6 text-ink shadow-soft";

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

  const turkey = turkeys.find((t) => t.id === turkeyId && t.hatched) ?? null;
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
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const started = useRef(false);
  const mounted = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const answers = history.filter((t) => t.role === "teacher").map((t) => t.content);
  const busy = thinking || closing !== null || turkeyError !== null || history.length === 0;

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

  /** Ask the AI for the turkey's next line, given the lesson so far. */
  async function askTurkey(sofar: SchoolTurn[]) {
    setTurkeyError(null);
    setThinking(true);
    try {
      const res = await fetch(`/api/turkeys/${turkeyId}/school/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: sofar }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.message !== "string") throw new Error(data.error);
      if (!mounted.current) return;
      setThinking(false);
      if (data.done) {
        setClosing(data.message);
        await wait(1200);
        if (mounted.current) {
          void submit(sofar.filter((t) => t.role === "teacher").map((t) => t.content));
        }
      } else {
        setHistory([...sofar, { role: "turkey", content: data.message }]);
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
        throw new Error(data.error || "Something went wrong.");
      }
      if (!mounted.current) return;
      setReaction("cheer");
      setDone(data.rewards as ActivityRewards);
    } catch (e) {
      if (!mounted.current) return;
      setSubmitError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  function backToTurkey() {
    flock.select(turkeyId);
    router.push("/home");
  }

  function requestLeave() {
    if (answers.length > 0 && !done) setConfirmLeave(true);
    else backToTurkey();
  }

  async function send(raw: string) {
    const text = raw.trim();
    if (!turkey || busy || text.length < MIN_ANSWER_LENGTH || answers.length >= SCHOOL_ROUNDS) return;
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "";
    setReaction("listen");
    const next: SchoolTurn[] = [...history, { role: "teacher", content: text }];
    setHistory(next);
    await askTurkey(next);
  }

  if (done) {
    return (
      <ActivityResults kind="school" rewards={done} onContinue={backToTurkey} continueLabel={`Back to ${name}`}>
        {done.feathers === 0 && (
          <p className="text-center font-body text-sm text-ink-soft">
            No feathers for more lessons today, but {name} loved it.
          </p>
        )}
      </ActivityResults>
    );
  }

  if (loading || status === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
        <TurkeyCharacter stage={1} size={96} decorative />
        <p className="font-body text-sm text-ink-soft">Getting the classroom ready...</p>
      </div>
    );
  }

  if (!turkey) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-body text-base text-ink">{error ?? "We couldn't find that turkey."}</p>
        <Link href="/home" className="mt-4 inline-block font-semibold text-primary underline-offset-2 hover:underline">
          Back home
        </Link>
      </div>
    );
  }

  if (!turkey.unlocked.school) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="flex flex-col items-center rounded-2xl border border-line bg-surface p-6 text-center shadow-soft">
          <MyTurkey turkey={turkey} size={120} inScene />
          <h1 className="mt-3 font-display text-display-lg text-ink">{name} is too hungry to learn</h1>
          <p className="mt-1 font-body text-sm text-ink-soft">Feed {name} a lesson first, then come back to School.</p>
          <Button className="mt-5" onClick={() => router.push(activityHref("feed", turkey))}>
            Feed {name}
          </Button>
        </div>
      </div>
    );
  }

  const trimmedLength = input.trim().length;
  const remaining = MIN_ANSWER_LENGTH - trimmedLength;
  const lines: SchoolTurn[] = closing ? [...history, { role: "turkey", content: closing }] : history;
  const lastTurkeyLine = [...lines].reverse().find((l) => l.role === "turkey")?.content ?? null;
  const lastAnswer = [...history].reverse().find((l) => l.role === "teacher")?.content ?? null;
  const turkeyLine = closing ?? lastTurkeyLine;
  const showInput = !done && !submitError && closing === null;
  const sheetMessages = lines.map((l) => ({
    role: l.role === "teacher" ? ("user" as const) : ("assistant" as const),
    content: l.content,
  }));
  const downTail =
    "absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-line bg-surface";

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 pb-24 pt-2 lg:pb-4">
      <header>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Button variant="ghost" size="sm" onClick={requestLeave} className="-ml-1 shrink-0 px-2.5">
            <Icon name="arrow-left" size={16} strokeWidth={2} />
            Leave
          </Button>
          <h1 className="order-last w-full min-w-0 font-display text-base font-bold text-ink sm:order-none sm:w-auto sm:flex-1 sm:truncate">
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
          <div
            className="flex shrink-0 gap-1.5"
            role="img"
            aria-label={`${answers.length} of ${SCHOOL_ROUNDS} questions answered`}
          >
            {Array.from({ length: SCHOOL_ROUNDS }, (_, i) => (
              <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < answers.length ? "bg-primary" : "bg-line"}`} />
            ))}
          </div>
        </div>
        {confirmLeave && (
          <div
            role="group"
            aria-label="Leave School?"
            className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2.5"
          >
            <p className="mr-auto font-body text-sm text-ink">Leave School? This lesson won&apos;t count.</p>
            <Button size="sm" variant="outline" onClick={() => setConfirmLeave(false)}>
              Stay
            </Button>
            <Button size="sm" variant="danger" onClick={backToTurkey}>
              Leave
            </Button>
          </div>
        )}
      </header>

      <div className="mt-2 flex min-h-0 flex-1 gap-4">
        <section className="flex min-w-0 flex-1 flex-col items-center" aria-label="Lesson">
          <div className="flex w-full flex-1 flex-col items-center justify-center py-2">
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
                    <div className={`max-h-40 overflow-y-auto border-line bg-surface ${bubbleBase}`}>{turkeyLine}</div>
                    <span aria-hidden className={downTail} />
                  </div>
                )
              )}
            </div>

            <div className="mt-3 sm:hidden">
              <MyTurkey turkey={turkey} size={150} inScene reaction={reaction} onReactionEnd={() => setReaction("none")} />
            </div>
            <div className="mt-3 hidden sm:block">
              <MyTurkey turkey={turkey} size={200} inScene reaction={reaction} onReactionEnd={() => setReaction("none")} />
            </div>

            <div className="mt-3 flex min-h-[64px] w-full max-w-md flex-col items-center">
              {lastAnswer && (
                <div className="relative max-w-full animate-slide-up motion-reduce:animate-none">
                  <span
                    aria-hidden
                    className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-primary/30 bg-primary-soft"
                  />
                  <div className={`max-h-28 overflow-y-auto break-words border-primary/30 bg-primary-soft ${bubbleBase}`}>
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
              {submitError && (
                <div className="mt-2 space-y-2 text-center">
                  <p className="font-body text-sm text-plume-500">{submitError}</p>
                  {retryable ? (
                    <Button size="sm" onClick={() => void submit(answers)}>
                      Try again
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={backToTurkey}>
                      Back to {name}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {showInput && (
            <div className="w-full max-w-xl pt-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(input);
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  rows={1}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 88)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send(input);
                    }
                  }}
                  disabled={busy}
                  maxLength={SCHOOL_MAX_MESSAGE_LENGTH}
                  placeholder="In your own words..."
                  aria-label="Your answer"
                  className="max-h-[88px] min-h-11 min-w-0 flex-1 resize-none rounded-3xl border border-line bg-surface px-4 py-2.5 font-body text-sm leading-6 text-ink outline-none focus:border-primary disabled:opacity-60"
                />
                <Button type="submit" size="md" disabled={busy || trimmedLength < MIN_ANSWER_LENGTH}>
                  Send
                </Button>
              </form>
              <p className="mt-1.5 h-4 px-2 font-body text-[11px] text-ink-muted">
                {trimmedLength > 0 && remaining > 0
                  ? `Say a little more (${remaining} more character${remaining === 1 ? "" : "s"}).`
                  : ""}
              </p>
            </div>
          )}
        </section>

        {transcriptOpen && (
          <aside
            aria-label="Transcript"
            className="hidden w-80 shrink-0 flex-col rounded-2xl border border-line bg-surface lg:flex lg:max-h-[calc(100vh-9rem)]"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <h2 className="font-display text-base font-bold text-ink">Transcript</h2>
              <button
                type="button"
                onClick={() => setTranscriptOpen(false)}
                aria-label="Close transcript"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-2"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {lines.length === 0 && <p className="font-body text-sm text-ink-muted">Nothing said yet.</p>}
              {lines.map((l, i) => (
                <p key={i} className="font-body text-sm leading-6 text-ink">
                  <span className="mr-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                    {l.role === "teacher" ? "You:" : `${name}:`}
                  </span>
                  {l.content}
                </p>
              ))}
            </div>
          </aside>
        )}
      </div>

      <div className="lg:hidden">
        <TranscriptSheet
          open={transcriptOpen}
          onClose={() => setTranscriptOpen(false)}
          messages={sheetMessages}
          initials={name}
        />
      </div>
    </div>
  );
}
