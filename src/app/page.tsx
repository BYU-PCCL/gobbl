"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { FlatTurkey, FlatTurkeyGlyph, TURKEY_STAGE_LABELS, type TurkeyStage } from "@/components/gamification/FlatTurkey";

const STAGES: TurkeyStage[] = [1, 2, 3, 4, 5, 6, 7, 8];

/** Each stage stands a little taller than the last, so the row reads as growth. */
function stageSize(stage: number) {
  return 44 + (stage - 1) * 14;
}

const PROMISES = [
  {
    title: "Talk with someone who disagrees",
    body: "Your AI partner holds the opposite view on the topic you pick, and pushes back as hard as you choose.",
  },
  {
    title: "Get scored on civility, not winning",
    body: "Every message is scored for tone, evidence, empathy, constructive framing and listening.",
  },
  {
    title: "Grow your turkey",
    body: "XP from good conversations evolves your turkey through eight stages. Feathers buy it an outfit.",
  },
];

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<"landing" | "login" | "register">("landing");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) router.push("/dashboard");
  }, [session, router]);

  if (status === "loading" || session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <FlatTurkey stage={1} size="md" animate />
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { username, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("That username and password don't match. Check them and try again.");
    } else {
      router.push("/dashboard");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
      await signIn("credentials", { username, password, redirect: false });
      router.push("/dashboard");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setLoading(false);
  };

  const switchMode = (next: "landing" | "login" | "register") => {
    setMode(next);
    setError("");
  };

  if (mode !== "landing") {
    const isLogin = mode === "login";
    return (
      <div className="flex min-h-dvh flex-col bg-bg">
        <header className="mx-auto flex w-full max-w-6xl items-center px-5 py-5 sm:px-8">
          <button
            type="button"
            onClick={() => switchMode("landing")}
            className="flex items-center gap-2 rounded-xl"
          >
            <FlatTurkeyGlyph size={28} />
            <span className="font-display text-2xl font-bold tracking-[-0.04em]">Gobbl</span>
          </button>
        </header>

        <main className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
          <div className="w-full max-w-sm animate-fade-in">
            <div className="mb-8">
              <FlatTurkey stage={isLogin ? 5 : 1} size={isLogin ? 96 : 72} />
              <h1 className="mt-4 font-display text-[32px] font-bold leading-none tracking-[-0.03em]">
                {isLogin ? "Welcome back." : "Hatch your turkey."}
              </h1>
              <p className="mt-2 font-body text-sm text-ink-soft">
                {isLogin
                  ? "Sign in to pick up where you left off."
                  : "Every Thunderbird starts as an egg. Pick a username to begin."}
              </p>
            </div>

            <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
              <Input
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isLogin ? "Your username" : "Pick a name for your turkey"}
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
              />
              {error && (
                <p role="alert" className="font-body text-sm text-plume-500">
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
        <div className="flex items-center gap-2">
          <FlatTurkeyGlyph size={28} />
          <span className="font-display text-2xl font-bold tracking-[-0.04em]">Gobbl</span>
        </div>
        <button
          type="button"
          onClick={() => switchMode("login")}
          className="rounded-full px-4 py-2 font-body text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          Sign in
        </button>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-10 pt-10 sm:px-8 lg:pb-14 lg:pt-20">
          <h1 className="font-display text-[56px] font-bold leading-[0.9] tracking-[-0.045em] text-ink sm:text-[84px] lg:text-[120px]">
            Talk turkey.
            <br />
            Build bridges.
          </h1>
          <p className="mt-6 max-w-xl font-body text-base leading-relaxed text-ink-soft lg:text-lg">
            Practice political conversations with an AI partner who sees things differently.
            You&apos;re scored on how civil you are, not on whether you win.
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
          <div className="mx-auto w-full max-w-6xl overflow-x-auto px-5 sm:px-8">
            <ol className="flex min-w-max items-end gap-5 pt-6 sm:gap-8 lg:min-w-0 lg:justify-between lg:gap-0">
              {STAGES.map((stage) => (
                <li key={stage} className="flex flex-col items-center">
                  <FlatTurkey stage={stage} size={stageSize(stage)} animate={stage === 8} />
                  <span className="mt-2 pb-3 font-body text-xs font-semibold text-ink-muted">
                    {TURKEY_STAGE_LABELS[stage]}
                  </span>
                </li>
              ))}
            </ol>
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
            Start your first conversation
            <Icon name="chevron-right" size={14} strokeWidth={2} />
          </button>
        </div>
      </footer>
    </div>
  );
}
