import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Gobbl",
  description: "What Gobbl collects, who processes it, and how to delete it.",
};

const H2 = "mt-10 font-display text-2xl font-bold tracking-[-0.02em] text-ink";
const P = "mt-3 font-body text-base leading-relaxed text-ink-soft";
const UL = "mt-3 list-disc space-y-2 pl-6 font-body text-base leading-relaxed text-ink-soft";
const A = "font-semibold text-primary underline-offset-2 hover:underline";

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-bg">
      <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8">
        <Link href="/" className={`font-body text-sm ${A}`}>
          &larr; Back to Gobbl
        </Link>

        <h1 className="mt-6 font-display text-[40px] font-bold leading-none tracking-[-0.04em] text-ink">
          Privacy Policy
        </h1>
        <p className="mt-3 font-body text-sm text-ink-muted">Last updated: October 26, 2026</p>

        <p className={P}>
          Gobbl is a civil-discourse practice app. You debate political topics with an AI partner
          and get scored on how civil you are. This page explains what we collect, where it goes,
          and how to delete it.
        </p>

        <h2 className={H2}>What we collect</h2>
        <ul className={UL}>
          <li>
            Your username and a bcrypt hash of your password. We never store your password in
            plaintext.
          </li>
          <li>
            An optional onboarding survey: political self-identification, how often you discuss
            politics, and your top issue.
          </li>
          <li>The text of every debate message you send and every reply you receive.</li>
          <li>Civility scores and per-turn feedback.</li>
          <li>
            Progress data: XP, levels, badges, streaks, feather balance, and cosmetic items.
          </li>
        </ul>

        <h2 className={H2}>Third-party AI provider</h2>
        <p className={P}>
          Debate message text is sent to xAI (Grok) to generate your partner&apos;s replies and to
          score civility. We do not send your username. How xAI handles that text is governed by
          its own policy:{" "}
          <a href="https://x.ai/legal/privacy-policy" className={A} rel="noopener noreferrer">
            x.ai/legal/privacy-policy
          </a>
          .
        </p>

        <h2 className={H2}>How we use it</h2>
        <p className={P}>
          Only to run Gobbl and to improve its scoring prompts in aggregate. There is no
          advertising, no analytics SDKs, no tracking across apps, and we do not sell your data.
        </p>

        <h2 className={H2}>Where it is stored</h2>
        <p className={P}>
          Your data lives in a hosted Postgres database (Supabase) and is served through Vercel,
          both in the United States.
        </p>

        <h2 className={H2}>Retention and deletion</h2>
        <p className={P}>
          We keep your data while your account exists. You can delete your account and all
          associated data at any time from the Profile screen, on the web and in the iOS app.
          Deletion is immediate and permanent.
        </p>

        <h2 className={H2}>Children</h2>
        <p className={P}>Gobbl is not directed at children under 13.</p>

        <h2 className={H2}>Contact</h2>
        {/* TODO: replace [CONTACT EMAIL] before App Store submission */}
        <p className={P}>
          Questions about this policy: [CONTACT EMAIL]. For general help, see the{" "}
          <Link href="/support" className={A}>
            support page
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
