"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { TurkeyCharacter, type TurkeyReaction } from "@/components/turkey/TurkeyCharacter";
import { useFlock } from "@/components/turkey/useFlock";
import { Button } from "@/components/ui/Button";
import { SCHOOL_SCRIPTS } from "@/lib/flock/schoolScripts";

const MIN_ANSWER_LENGTH = 10;
const WAIT_MS = 700;

type Line = { from: "turkey" | "me"; text: string };

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function SchoolPage() {
  const params = useParams();
  const turkeyId = params.turkeyId as string;
  const router = useRouter();
  const { status } = useSession();
  const { turkeys, loading, error } = useFlock();

  const turkey = turkeys.find((t) => t.id === turkeyId && t.hatched) ?? null;
  const steps = turkey ? SCHOOL_SCRIPTS[turkey.skill] : null;
  const name = turkey?.name ?? "Your turkey";

  const [lines, setLines] = useState<Line[]>([]);
  const [round, setRound] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [busy, setBusy] = useState(true);
  const [input, setInput] = useState("");
  const [reaction, setReaction] = useState<TurkeyReaction>("none");
  const [done, setDone] = useState<{ feathers: number } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(true);
  const started = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  // Open with the first question once the turkey is known.
  useEffect(() => {
    if (!steps || started.current) return;
    started.current = true;
    setLines([{ from: "turkey", text: steps[0].ask }]);
    setBusy(false);
  }, [steps]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [lines, done]);

  async function submit(allAnswers: string[]) {
    setSubmitError(null);
    setRetryable(true);
    setBusy(true);
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
      setBusy(false);
    }
  }

  async function send(raw: string) {
    const text = raw.trim();
    if (!steps || busy || text.length < MIN_ANSWER_LENGTH) return;
    setBusy(true);
    setInput("");
    setLines((l) => [...l, { from: "me", text }]);
    setReaction("listen");
    const next = [...answers, text];
    setAnswers(next);
    await wait(WAIT_MS);
    if (!mounted.current) return;
    setLines((l) => [...l, { from: "turkey", text: steps[round].reply }]);
    const nextRound = round + 1;
    setRound(nextRound);
    if (nextRound >= steps.length) {
      await wait(WAIT_MS);
      if (mounted.current) void submit(next);
      return;
    }
    await wait(WAIT_MS);
    if (!mounted.current) return;
    setLines((l) => [...l, { from: "turkey", text: steps[nextRound].ask }]);
    setBusy(false);
  }

  if (loading || status === "loading") {
    return <p className="px-4 py-16 text-center font-body text-sm text-ink-soft">Loading…</p>;
  }

  if (!turkey || !steps) {
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
  const currentChips = !busy && round < steps.length ? steps[round].chips : [];

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
          aria-label={`${Math.min(round, steps.length)} of ${steps.length} questions answered`}
        >
          {steps.map((_, i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < round ? "bg-primary" : "bg-line"}`} />
          ))}
        </div>
      </div>

      <div ref={logRef} className="mt-3 min-h-0 flex-1 space-y-2.5 overflow-y-auto" aria-live="polite">
        {lines.map((l, i) => (
          <div key={i} className={`flex animate-slide-up ${l.from === "me" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 font-body text-sm ${
                l.from === "me"
                  ? "rounded-br-md bg-ink text-bg"
                  : "rounded-bl-md border border-line bg-surface text-ink"
              }`}
            >
              {l.text}
            </div>
          </div>
        ))}
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

      {!done && !submitError && (
        <div className="pt-3">
          {currentChips.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {currentChips.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => void send(c)}
                  className="rounded-full border border-line bg-surface px-3.5 py-2 text-left font-body text-xs font-semibold text-ink hover:border-primary"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
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
