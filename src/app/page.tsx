"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { TurkeyCharacter } from "@/components/turkey/TurkeyCharacter";
import { STAGE_NAMES } from "@/lib/flock/growth";
import { ACCOUNT_MISSING_REASON, SIGN_OUT_REASON_PARAM } from "@/lib/signOutReasons";

const STAGES = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/** Each stage stands a little taller than the last, so the row reads as growth. */
function stageSize(stage: number) {
  return 44 + (stage - 1) * 14;
}

const PROMISES = [
  {
    title: "Hatch a turkey",
    body: "Pick an egg tied to a skill like listening or reason-giving. Teach it its first lesson and it hatches into a turkey of your own.",
  },
  {
    title: "Take care of it",
    body: "Feed it with short lessons, teach it back at school, then take it to the park to talk things over with other turkeys. When you're away it gets a little droopy, and it's always happy to see you.",
  },
  {
    title: "Grow your skills",
    body: "Each turkey grows through eight stages as you practice its skill together. Feathers buy new eggs and outfits.",
  },
];

function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <TurkeyCharacter stage={5} size={28} crop="head" decorative />
      <span className="font-display text-2xl font-bold tracking-[-0.04em]">Gobbl</span>
    </span>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="mx-auto flex w-full max-w-6xl items-center px-5 py-5 sm:px-8">
        <Wordmark />
      </header>
      <main className="flex flex-1 items-center justify-center">
        <LoadingState message="One moment..." />
      </main>
    </div>
  );
}

/** useSearchParams needs a Suspense boundary, so the page body lives in LandingPage below. */
export default function LandingPageRoute() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LandingPage />
    </Suspense>
  );
}

function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  // Set when the app signed the user out itself because their account no longer exists.
  const params = useSearchParams();
  const accountMissing = params.get(SIGN_OUT_REASON_PARAM) === ACCOUNT_MISSING_REASON;
  // The URL drives the view so browser back returns to the landing page and each form is linkable.
  const modeParam = params.get("mode");
  const mode: "landing" | "login" | "register" =
    modeParam === "login" || modeParam === "register"
      ? modeParam
      : accountMissing
        ? "login"
        : "landing";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  // The one place that leaves this page once signed in (after sign-in, sign-up, or a return visit).
  useEffect(() => {
    if (session) router.replace("/flock");
  }, [session, router]);

  // Clear stale messages when the view changes.
  const keepError = useRef(false);
  useEffect(() => {
    if (keepError.current) {
      keepError.current = false;
      return;
    }
    setError("");
    setPasswordError("");
  }, [mode]);

  if (status === "loading" || session) {
    return <LoadingScreen />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { username, password, redirect: false });
    if (res?.error) {
      setLoading(false);
      setError("That username and password don't match. Check them and try again.");
    }
    // On success the session effect above navigates; keep the button loading until then.
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPasswordError("");
    if (password.length < 6) {
      setPasswordError("Use at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Your account couldn't be created. Try again in a moment.");
        setLoading(false);
        return;
      }
      const signedIn = await signIn("credentials", { username, password, redirect: false });
      if (signedIn?.error) {
        keepError.current = true;
        router.replace("/?mode=login");
        setError("Your account was created. Sign in to continue.");
        setLoading(false);
      }
      // On success the session effect above navigates.
      return;
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setLoading(false);
  };

  const switchMode = (next: "landing" | "login" | "register") => {
    router.push(next === "landing" ? "/" : `/?mode=${next}`);
  };

  if (mode !== "landing") {
    const isLogin = mode === "login";
    return (
      <div className="flex min-h-dvh flex-col bg-bg">
        <header className="mx-auto flex w-full max-w-6xl items-center px-5 py-5 sm:px-8">
          <button
            type="button"
            aria-label="Gobbl home"
            onClick={() => switchMode("landing")}
            className="rounded-xl"
          >
            <Wordmark />
          </button>
        </header>

        <main className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
          <div className="w-full max-w-sm animate-fade-in">
            <Link
              href="/"
              className="-ml-3 mb-4 inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-body text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
            >
              <Icon name="arrow-left" size={16} strokeWidth={2} />
              Back
            </Link>
            <div className="mb-8">
              <TurkeyCharacter stage={isLogin ? 5 : 1} size={isLogin ? 96 : 72} decorative />
              <h1 className="mt-4 font-display text-display-lg text-ink">
                {isLogin ? "Welcome back." : "Create your account."}
              </h1>
              <p className="mt-2 font-body text-sm text-ink-soft">
                {isLogin
                  ? "Sign in to pick up where you left off."
                  : "A few quick questions, then you pick your first egg."}
              </p>
            </div>

            {accountMissing && (
              <p
                role="status"
                className="mb-6 rounded-xl border border-line bg-surface px-4 py-3 font-body text-sm text-ink-soft"
              >
                We couldn&apos;t find your account, so you&apos;ve been signed out. Sign in again,
                or create a new account if yours was never moved over.
              </p>
            )}

            <form onSubmit={isLogin ? handleLogin : handleRegister} noValidate className="space-y-4">
              <Input
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isLogin ? "Your username" : "Pick a username"}
                autoComplete="username"
                required
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? "Your password" : "At least 6 characters"}
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                minLength={isLogin ? undefined : 6}
                hint={isLogin ? undefined : "Use at least 6 characters."}
                error={passwordError || undefined}
              />
              {error && (
                <p role="alert" className="font-body text-sm text-danger">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading} loading={loading}>
                {isLogin ? "Sign in" : "Create account"}
              </Button>
            </form>

            <p className="mt-6 font-body text-sm text-ink-soft">
              {isLogin ? "New here? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => switchMode(isLogin ? "register" : "login")}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                {isLogin ? "Create an account" : "Sign in"}
              </button>
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Wordmark />
        <button
          type="button"
          onClick={() => switchMode("login")}
          className="inline-flex h-11 items-center rounded-full px-4 font-body text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          Sign in
        </button>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-10 pt-10 sm:px-8 lg:pb-14 lg:pt-20">
          <h1 className="break-words font-display text-display-2xl leading-[0.9] tracking-[-0.045em] text-ink sm:text-[84px] lg:text-[120px]">
            Talk turkey.
            <br />
            Build bridges.
          </h1>
          <p className="mt-6 max-w-xl font-body text-base leading-relaxed text-ink-soft lg:text-lg">
            Hatch a turkey, take care of it, and grow your skills along the way.
            Each turkey is tied to a civil-discourse skill you practice together.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={() => switchMode("register")} className="shadow-lift">
              Get started
            </Button>
            <Button size="lg" variant="secondary" onClick={() => switchMode("login")}>
              I have an account
            </Button>
          </div>
        </section>

        {/* Growth line: the eight stages standing on one ground line */}
        <section aria-label="The eight turkey stages" className="border-b border-line">
          <div className="relative mx-auto w-full max-w-6xl">
          <div
            tabIndex={0}
            role="group"
            aria-label="The eight turkey stages, scroll sideways to see them all"
            className="overflow-x-auto px-5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 sm:px-8"
          >
            <ol className="flex min-w-max items-end gap-5 pt-6 sm:gap-8 lg:min-w-0 lg:justify-between lg:gap-0">
              {STAGES.map((stage) => (
                <li key={stage} className="flex flex-col items-center">
                  <TurkeyCharacter stage={stage} size={stageSize(stage)} animate={stage === 8} decorative />
                  <span className="mt-2 pb-3 font-body text-xs font-semibold text-ink-muted">
                    {STAGE_NAMES[stage]}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-bg to-transparent lg:hidden"
          />
          </div>
        </section>

        {/* What you do here */}
        <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-3 lg:py-16">
          {PROMISES.map((p) => (
            <div key={p.title}>
              <h2 className="font-display text-xl font-bold tracking-[-0.02em]">{p.title}</h2>
              <p className="mt-2 max-w-sm font-body text-sm leading-relaxed text-ink-soft">{p.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className="font-body text-sm text-ink-muted">Gobbl. Civil discourse practice.</span>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className="inline-flex items-center gap-1.5 self-start font-body text-sm font-semibold text-primary"
          >
            Hatch your first turkey
            <Icon name="chevron-right" size={14} strokeWidth={2} />
          </button>
        </div>
      </footer>
    </div>
  );
}
