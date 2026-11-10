"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { TurkeyCharacter, type TurkeyReaction } from "@/components/turkey/TurkeyCharacter";
import { useFlock } from "@/components/turkey/useFlock";
import { Button } from "@/components/ui/Button";
import { SCHOOL_MIN_ANSWER_LENGTH as MIN_ANSWER_LENGTH, SCHOOL_ROUNDS } from "@/lib/flock/config";
import type { SchoolTurn } from "@/lib/flock/school";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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
  const { turkeys, loading, error } = useFlock();

  const turkey = turkeys.find((t) => t.id === turkeyId && t.hatched) ?? null;
  const name = turkey?.name ?? "Your turkey";

  // The lesson so far (sent to the server for the turkey's next line), plus its closing words.
  const [history, setHistory] = useState<SchoolTurn[]>([]);
  const [closing, setClosing] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [turkeyError, setTurkeyError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [reaction, setReaction] = useState<TurkeyReaction>("none");
  const [done, setDone] = useState<{ feathers: number } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(true);
  const started = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);

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

  // The turkey opens the lesson once it's known.
  useEffect(() => {
    if (!turkey || started.current) return;
    started.current = true;
    void askTurkey([]);
    // askTurkey only reads stable values (turkeyId, name) besides its argument.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turkey]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [history, closing, thinking, done]);

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
      setDone({ feathers: data.feathersEarned ?? 0 });
      await wait(2800);
      if (mounted.current) router.push("/home");
    } catch (e) {
      if (!mounted.current) return;
      setSubmitError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  async function send(raw: string) {
    const text = raw.trim();
    if (!turkey || busy || text.length < MIN_ANSWER_LENGTH || answers.length >= SCHOOL_ROUNDS) return;
    setInput("");
    setReaction("listen");
    const next: SchoolTurn[] = [...history, { role: "teacher", content: text }];
    setHistory(next);
    await askTurkey(next);
  }

  if (loading || status === "loading") {
    return <p className="px-4 py-16 text-center font-body text-sm text-ink-soft">Loading…</p>;
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

  const trimmedLength = input.trim().length;
  const remaining = MIN_ANSWER_LENGTH - trimmedLength;
  const lines: SchoolTurn[] = closing ? [...history, { role: "turkey", content: closing }] : history;

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-4 pb-24 pt-2 lg:pb-4">
      <div className="flex flex-col items-center">
        <TurkeyCharacter
          stage={turkey.stage}
          mood={turkey.mood}
          skill={turkey.skill}
          reaction={reaction}
          onReactionEnd={() => setReaction("none")}
          size={120}
          label={name}
        />
        <h1 className="font-display text-display-lg text-ink">School</h1>
        <p className="font-body text-sm text-ink-soft">
          Teach {name} about {turkey.skillLabel}.
        </p>
        <div
          className="mt-2 flex gap-2"
          role="img"
          aria-label={`${answers.length} of ${SCHOOL_ROUNDS} questions answered`}
        >
          {Array.from({ length: SCHOOL_ROUNDS }, (_, i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < answers.length ? "bg-primary" : "bg-line"}`} />
          ))}
        </div>
      </div>

      <div ref={logRef} className="mt-3 min-h-0 flex-1 space-y-2.5 overflow-y-auto" aria-live="polite">
        {lines.map((l, i) => (
          <div key={i} className={`flex animate-slide-up ${l.role === "teacher" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 font-body text-sm ${
                l.role === "teacher"
                  ? "rounded-br-md bg-ink text-bg"
                  : "rounded-bl-md border border-line bg-surface text-ink"
              }`}
            >
              {l.content}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-2.5 font-body text-sm text-ink-muted"
              aria-label={`${name} is thinking`}
            >
              …
            </div>
          </div>
        )}
        {turkeyError && (
          <div className="space-y-2 text-center">
            <p className="font-body text-sm text-ink-soft">{turkeyError}</p>
            <Button size="sm" onClick={() => void askTurkey(history)}>
              Try again
            </Button>
          </div>
        )}
        {done && (
          <div className="rounded-2xl bg-primary-soft p-4 text-center font-body text-sm font-semibold text-gobbl-700">
            {done.feathers > 0
              ? `+${done.feathers} feathers`
              : `Lesson done. No feathers for more lessons today, but ${name} loved it.`}
          </div>
        )}
        {submitError && (
          <div className="space-y-2 text-center">
            <p className="font-body text-sm text-plume-500">{submitError}</p>
            {retryable ? (
              <Button size="sm" onClick={() => void submit(answers)}>
                Try again
              </Button>
            ) : (
              <Link href="/home" className="inline-block font-semibold text-primary underline-offset-2 hover:underline">
                Back home
              </Link>
            )}
          </div>
        )}
      </div>

      {!done && !submitError && closing === null && (
        <div className="pt-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
              maxLength={300}
              placeholder={`Teach ${name} in your own words…`}
              aria-label="Your answer"
              className="h-11 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 font-body text-sm text-ink outline-none focus:border-primary disabled:opacity-60"
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
    </div>
  );
}
