# Gobbl — Talk Turkey. Build Bridges.

A gamified civil discourse training app where you practice respectful political debate with AI. Grow your turkey from an Egg to a Thunderbird as you master civil discourse.

## Quick Start

```bash
npm install
npm run db:push     # Creates the tables and enables RLS on them
npm run db:seed     # Creates 5 sample users
npm run dev         # http://localhost:3000
```

## Features

- **AI Debate Arena** — Discuss real political topics with AI at 3 difficulty levels (Friendly Cluck, Spirited Strut, Full Gobble)
- **Civility Scoring** — Scored on 5 dimensions: respectful tone, evidence-based reasoning, empathy, constructive framing, and active listening
- **Feathers & Levels** — Earn feathers and evolve from Egg to Thunderbird across 8 levels
- **Turkey Badges** — 8 turkey-themed badges for milestones like First Gobble, Migration Streak, and Flock Leader
- **Daily Gobble** — A new topic every day with bonus feathers
- **The Flock** — Leaderboard to see who's strutting their stuff

## AI System — SAIL Lab Integration

Gobbl uses the SAIL Lab behavioral AI system powered by the Grok API. The AI character ("Robert") has:
- **Political belief presets** you choose per debate (left through right) on the arena setup screen
- **8 behavioral parameters** (Participation, Expression, Reason-Giving, Listening, Self-Interrogation, Disagreement, Abrasiveness, Persuadability) — configured per difficulty level
- **Difficulty-to-preset mapping**: Friendly Cluck (warm, listens well), Spirited Strut (engaged, direct), Full Gobble (confrontational, immovable)

Conversations always use Grok with the full SAIL prompt (beliefs + sliders). **Robert requires `GROK_API_KEY`** — without it, the chat shows a configuration message instead of debate text.

## Civility scoring without an API key

If `GROK_API_KEY` is not set, civility scores still use a simple heuristic so you can click through the UI; for real scoring, add a key as below.

To enable Robert and Grok-based civility scoring:
1. Get an API key from [console.x.ai](https://console.x.ai)
2. Add it to `.env.local`: `GROK_API_KEY=xai-...`

## Sample Accounts

After `npm run db:seed`, log in with any of these (password: `password123`):
- CivilSam, DebateDana, ReasonRick, EmpathyElla, BridgeBot

## Deploy to Vercel

The repo is set up for [Vercel](https://vercel.com): connect your GitHub repo, then add these **Environment Variables** in the project settings (Production and Preview):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase transaction pooler connection string (port 6543, ending in `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase session pooler connection string (port 5432), used by `prisma db push` during the build |
| `GROK_API_KEY` | xAI API key (`xai-...`) |
| `GROK_MODEL` | Optional. Defaults to `grok-4-1-fast-reasoning` (Grok 4 fast reasoning). Override if xAI renames models. |
| `GROK_CIVILITY_MODEL` | Optional. Defaults to `grok-3-fast`. Used only for civility JSON scoring (faster than the main reasoning model). |
| `NEXTAUTH_SECRET` | Random secret (32+ chars), e.g. `openssl rand -base64 32` — use a new value for production |
| `NEXTAUTH_URL` | Your site URL, e.g. `https://your-project.vercel.app` |

The build runs `prisma generate`, `npm run db:push` (schema push plus enabling RLS on every table, since Supabase exposes the `public` schema through its Data API), then `next build`, so the schema is applied on each deploy. Do not commit `.env` or `.env.local`.

Repository: [github.com/bostonjsharp/gobbl-app](https://github.com/bostonjsharp/gobbl-app)

## Tech Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS with custom turkey-themed palette
- Prisma + PostgreSQL ([Supabase](https://supabase.com))
- Grok API (xAI) with SAIL Lab prompt architecture
- NextAuth.js
