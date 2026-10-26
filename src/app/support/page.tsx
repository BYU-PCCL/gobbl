import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support | Gobbl",
  description: "Get help with Gobbl and read answers to common questions.",
};

const A = "font-semibold text-primary underline-offset-2 hover:underline";

const FAQ = [
  {
    q: "What are feathers, and can I buy them?",
    a: "Feathers are the in-app currency you earn from good conversations and spend on outfits for your turkey. They are earn-only. Nothing in Gobbl is for sale.",
  },
  {
    q: "How is civility scored?",
    a: "Each message is scored on four dimensions: participation, reason and expression, mutual exchange and listening, and interrogating preconceptions. You are scored on how you talk, not on whether you win.",
  },
  {
    q: "Why does the AI disagree with me?",
    a: "On purpose. Your partner is deliberately assigned the opposing view on the topic you pick, so you can practice staying civil with someone who sees it differently.",
  },
  {
    q: "What is the Daily Gobble?",
    a: "One shared topic per day, the same for everyone. Completing it earns bonus XP and feathers.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Profile, then Delete account. This works on the web and in the iOS app. Deletion is immediate and permanent, and removes all your data.",
  },
  {
    q: "Why did I get signed out?",
    a: "Sessions last 30 days, after which you sign in again. You can also be signed out if your account was removed.",
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-dvh bg-bg">
      <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8">
        <Link href="/" className={`font-body text-sm ${A}`}>
          &larr; Back to Gobbl
        </Link>

        <h1 className="mt-6 font-display text-[40px] font-bold leading-none tracking-[-0.04em] text-ink">
          Support
        </h1>
        <p className="mt-4 font-body text-base leading-relaxed text-ink-soft">
          Gobbl helps you practice civil conversation with an AI partner who disagrees with you.
          If something is broken or confusing, we want to hear about it.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold tracking-[-0.02em] text-ink">
          Contact us
        </h2>
        {/* TODO: replace [CONTACT EMAIL] before App Store submission */}
        <p className="mt-3 font-body text-base leading-relaxed text-ink-soft">
          Email [CONTACT EMAIL] and include your username (never your password) and a short
          description of the problem.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold tracking-[-0.02em] text-ink">
          Frequently asked questions
        </h2>
        <dl className="mt-4 space-y-6">
          {FAQ.map((item) => (
            <div key={item.q}>
              <dt className="font-display text-lg font-bold tracking-[-0.01em] text-ink">
                {item.q}
              </dt>
              <dd className="mt-1 font-body text-base leading-relaxed text-ink-soft">{item.a}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-10 font-body text-base leading-relaxed text-ink-soft">
          Read how we handle your data in our{" "}
          <Link href="/privacy" className={A}>
            Privacy Policy
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
