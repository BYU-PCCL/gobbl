# Persona Pools per Difficulty Tier — Design

**Date:** 2026-05-26
**Status:** Design (pre-implementation)
**Branch:** `ui-overhaul` (or a follow-up feature branch)

## Goal

Replace the current "one persona per difficulty" model with a **pool of 5 personas per tier (15 total)**. Each persona is a distinct character with gender-neutral initials and an ANES-grounded backstory. At the start of each debate, the system randomly assigns one persona from the chosen tier's pool. The user never sees a persona picker; they only see the persona's initials once the chat opens.

This keeps the user's tier choice (Friendly Cluck / Spirited Strut / Full Gobble) as the primary control while giving repeat users meaningful variety inside each tier.

## Non-goals

- **No user-facing persona picker.** Selection is automatic and hidden by design.
- **No persona-history UI for the user.** `personaId` is stored on the Debate for backend analysis only.
- **No dynamic sampling from a live ANES dataset.** The 15 personas are hand-authored from ANES archetypes; the dataset is reference material, not runtime input.
- **No changes to scoring, XP, feathers, badges, or the `DIFFICULTIES` metadata in `lib/gamification.ts`.**

## Architecture

### Persona pool — static TypeScript config

New file: `src/lib/personas/pool.ts`.

```ts
import { BeliefKey } from "@/lib/prompts/beliefs";
import { ParameterName, ParameterLevel } from "@/lib/prompts/parameters";

export type Tier = "Friendly Cluck" | "Spirited Strut" | "Full Gobble";

export interface Persona {
  id: string;              // stable slug, e.g. "med-jk"
  initials: string;        // gender-neutral, 2 letters, dotted (e.g. "J.K.")
  tier: Tier;
  beliefKey: BeliefKey;    // selects from existing BELIEFS map
  backstory: string;       // 2–4 sentences, ANES-grounded
  params: Record<ParameterName, ParameterLevel>;
}

export const PERSONAS: Persona[] = [
  /* 15 entries, hand-authored. See "Authoring" below — initial seeding is deferred. */
];
```

The same file exports two helpers:

```ts
export function pickPersona(tier: Tier): Persona;
export function getPersonaById(id: string): Persona | null;
```

`pickPersona` filters `PERSONAS` by tier and returns a uniformly random entry. `getPersonaById` is used by the chat API to rebuild the system prompt from the debate's stored `personaId`.

### Validation at module load

`pool.ts` includes a `validatePool()` function called at the bottom of the module:

- Every persona's `params` must fall inside its tier's allowed ranges (see "Tier ranges" below).
- Every tier must have exactly 5 personas.
- All `id` values must be unique.
- All `initials` values must be unique.

If any check fails, `validatePool()` throws a descriptive error. This means a malformed pool fails immediately on server boot in dev, not on the first debate that happens to roll the bad persona.

### Tier ranges (spine + flavor model)

Each tier defines an allowed range for each parameter. Some parameters ("spine") are tightly bounded and shift with difficulty; others ("flavor") range freely and create personality variation within a tier.

| Parameter           | Friendly Cluck | Spirited Strut | Full Gobble | Role   |
| ------------------- | -------------- | -------------- | ----------- | ------ |
| abrasiveness        | 1              | 2–3            | 4–5         | spine  |
| listening           | 4–5            | 2–4            | 1–2         | spine  |
| persuadability      | 3–5            | 2–3            | 1–2         | spine  |
| self_interrogation  | 3–5            | 2–3            | 1–2         | spine  |
| disagreement        | 2–3            | 3–4            | 4–5         | spine  |
| participation       | 2–5            | 2–5            | 2–5         | flavor |
| expression          | 2–5            | 2–5            | 2–5         | flavor |
| reason_giving       | 2–5            | 2–5            | 2–5         | flavor |

The ranges live in a `TIER_RANGES` constant in `pool.ts` so `validatePool()` can read them. Adjusting the spine later means editing this one table.

### Schema changes (Prisma)

Two changes to `prisma/schema.prisma`:

**1. Add `personaId` to `Debate`:**

```prisma
model Debate {
  // ...existing fields...
  personaId    String?    // nullable; old debates remain valid
  personaRatings PersonaRating[]
}
```

**2. New `PersonaRating` model (temporary — see "Removal plan" below):**

```prisma
model PersonaRating {
  id         String   @id @default(cuid())
  userId     String
  debateId   String
  personaId  String
  rating     Int      // 1–10
  createdAt  DateTime @default(now())
  debate     Debate   @relation(fields: [debateId], references: [id])
  @@unique([userId, debateId])
}
```

One rating per (user, debate). The `personaId` is denormalized onto the rating row so the table is self-contained for analysis and can be exported / queried without joining `Debate`.

### Prompt builder

`src/lib/prompts/builder.ts` is rewritten:

- `buildSystemPrompt(difficulty, beliefKey)` → `buildSystemPrompt(persona: Persona)`.
- Belief text and the 8 parameter texts are pulled from `persona.beliefKey` and `persona.params`.
- The `Full Gobble` addendum still fires when `persona.tier === "Full Gobble"`.

`src/lib/prompts/template.ts` is updated:

- `"You are a man named Robert."` → `"You are a person known to the user as {name}."`
- All hard-coded `"Robert"` references in the template become `{name}` placeholders.
- A new `{backstory}` placeholder is inserted directly after the identity line, filled from `persona.backstory`.
- The "Robert behaves like a real person…" prose stays but uses `{name}` instead of "Robert".

`src/lib/prompts/presets.ts` is **deleted**. Its only consumer is `builder.ts`, which no longer needs it.

### `lib/ai.ts` changes

Both `getAIOpening(topic, difficulty, beliefKey)` and `getAIResponse(messages, topic, difficulty, beliefKey)` are updated to take a `Persona` instead of `(difficulty, beliefKey)`. They forward it to `buildSystemPrompt(persona)`. Callers (`POST /api/debates` and `POST /api/chat`) are updated accordingly.

### API changes

**`POST /api/debates`** (`src/app/api/debates/route.ts`):

- Reads the `difficulty` from the request body as before.
- Calls `pickPersona(difficulty)` to roll a persona.
- Writes the resulting `persona.id` to the new debate's `personaId` column.
- Passes the rolled persona to `getAIOpening(topic, persona)`.
- Returns the new debate's `id`, topic, difficulty, opening message (existing behavior) plus `personaInitials: persona.initials` so the chat page can render the header without a second fetch on debate creation. Existing debates load via `GET /api/debates?id=…` (see below).

**`POST /api/chat`** (`src/app/api/chat/route.ts`):

- Already loads the debate. After loading, calls `getPersonaById(debate.personaId)`.
- If `personaId` is null (legacy debate from before this change) or no longer exists in the pool, falls back to `pickPersona(debate.difficulty)` for that turn only — no write-back, just a graceful degrade so old debates don't 500.
- Passes the persona to `getAIResponse(messages, topic, persona)`.

**`GET /api/debates?id=…`** (existing handler in the same `route.ts`):

- Continues to return the full `Debate` row including `messages`. Add `personaInitials` to the response by resolving `debate.personaId` through `getPersonaById` before serializing (null if absent). The chat page (`src/app/(app)/chat/[id]/page.tsx`) reads this for its header.

**New: `POST /api/persona-rating`** *(temporary — see "Removal plan")*:

- Body: `{ debateId, rating }` (1–10 int).
- Looks up the debate, confirms it belongs to the session user and is `completed`.
- Upserts a `PersonaRating` row keyed by `(userId, debateId)`.

### Chat UI

**`src/app/(app)/chat/[id]/page.tsx`** (this is where the chat header actually lives, not `ChatInterface.tsx`):

- The header currently hardcodes the name `"Robert"` (around line 100). Replace with the persona's `initials` from the `GET /api/debates?id=…` response (`debate.personaInitials`). Fall back to `"Robert"` if `personaInitials` is null so legacy debates still render.
- The `DebateData` interface in this file gains an optional `personaInitials: string | null` field.
- No changes to message rendering, civility meter, topic pill, or the rest of the chat flow.

**`ChatInterface.tsx`** (`src/components/chat/ChatInterface.tsx`):

- No changes required for the persona name (the header is rendered by the page wrapper, not this component).
- Only touched by the temporary rating section if it lives here; the spec places that in `ScoreSummary` instead, so this component is untouched.

**`ScoreSummary.tsx`** *(temporary section — see "Removal plan")*:

- After the existing summary content, renders a "How did this persona feel?" card with a 1–10 scale (10 buttons in a row, mobile-friendly). Skippable — there is a clear "Skip" affordance, and the card is dismissible.
- Submitting calls `POST /api/persona-rating`. On success the card collapses to a small confirmation line.
- One rating per debate; if the user has already rated, the card is hidden on subsequent renders.

### Setup page

`src/app/(app)/chat/page.tsx` is **unchanged**. The user still picks a tier with the existing `DifficultyPicker`-style UI. Nothing about the rolled persona is revealed pre-chat — that matches the "auto-random hidden" decision.

## Migration plan

1. Prisma migration: `add_persona_id_and_rating` adds `Debate.personaId` (nullable) and creates `PersonaRating`. No backfill needed; legacy debates stay null.
2. Code changes can be merged before the persona pool is fully authored — as long as `PERSONAS` is non-empty for every tier, `pickPersona` works. The 15-persona authoring happens in a follow-up pass.

## Authoring (deferred)

The first 15 personas need to be hand-authored from ANES archetypes. This work depends on settling the ANES source first (which study year, which variables to pull, and the dataset format the user can share). It is **out of scope for this spec** and tracked as a follow-up before the feature is shipped to users.

The implementation can land empty or with placeholder personas, gated behind a feature flag or simply not surfaced to users, until authoring completes. To avoid a half-shipped state, the recommended sequence is: spec → implementation plan → schema + code merged → personas authored → feature exposed.

## Removal plan (rating system)

The rating system is a calibration tool for the project owner, not a permanent user feature. Every file the rating system touches is annotated with a comment so future removal is mechanical.

**Annotation marker:** `// [persona-rating: temporary]`

**Files touched (to remove):**

- `prisma/schema.prisma` — delete the `PersonaRating` model and the `personaRatings` relation on `Debate`. Run `prisma migrate dev --name remove_persona_rating`.
- `src/app/api/persona-rating/route.ts` — delete the file.
- `src/components/chat/ScoreSummary.tsx` — remove the rating card JSX and its associated state/handler, all marked with the annotation.
- Any rating-related imports in `ChatInterface.tsx` or its parent page, also marked.

**`personaId` on Debate stays.** It is the permanent backend-tracking field and is independent of the rating system.

A grep for `[persona-rating: temporary]` should return zero results once removal is complete.

## Cost, model selection, and theme alignment

**Model selection.** The spec adds no new LLM calls. `getAIOpening` and `getAIResponse` keep their current model (`GROK_MODEL`) and request shape — only the prompt content changes. The pool, the picker, and the rating system are pure local code with zero token cost.

**Token budget.** The new `{backstory}` field is constrained to 2–4 sentences (~50–120 tokens). Spread across 15 personas, that's a one-time prompt growth of ≤150 tokens per system message — within current `max_tokens` headroom (400 for opening/response calls). No prompt-caching changes required.

**Implementation work delegated to agents** (when authoring is planned later) **must use the cheapest model capable of the task** — per the user's standing preference, pass an explicit `model` override on `Agent` calls (e.g. `haiku` for pool-authoring scaffolding, persona-data extraction, validation-helper writing; `sonnet` only if reasoning depth is needed; never `opus` for these tasks).

**Theme alignment.** Every new UI surface (the temporary rating card, any chat-header tweak) must use the existing design tokens already in use across the app:

- Font stack: `font-display` (headings), `font-body` (prose), `font-mono` (labels/eyebrows).
- Color tokens: `primary`, `primary-soft`, `ink`, `ink-soft`, `ink-muted`, `surface`, `surface-2`, `bg`, `line`, `forest-*`, `plume-*`, `ochre`. No raw hex values.
- Rounded scale: `rounded-xl` / `rounded-2xl` for cards, `rounded-full` for pills/buttons.
- Spacing scale: existing `p-*`, `gap-*`, `px-*`, `py-*` tokens. No bespoke values.
- The rating card matches the visual treatment of the existing `Robert opposes you today` info card in `src/app/(app)/chat/page.tsx` (rounded-2xl, soft tinted background, icon + body text + optional action).
- The 1–10 scale uses the existing `Chip` component (`src/components/ui/Chip.tsx`) or matches its styling for the 10 selectable values.

These constraints are explicit so the implementation plan can be reviewed against them and so the rating UI doesn't drift from the rest of the app.

## Risks and trade-offs

- **Identity dissolution at tier boundaries.** A Friendly Cluck with high flavor params (chatty + opinionated + well-reasoned but kindly) could feel like a soft Spirited Strut. We're accepting that overlap deliberately — it's how variety happens — and using the rating system to detect if it becomes a problem.
- **Authoring quality is the hidden lever.** Even with sound ranges, two personas with identical params can feel identical if their backstories and beliefs aren't differentiated. Backstory and `beliefKey` selection matter as much as the parameter mix.
- **The validation helper is opinionated.** If `validatePool()` throws on boot, the app won't start. That's intentional during development. If this becomes annoying we can downgrade to a warning, but failing fast catches more bugs.
- **Legacy debates have `personaId = null`.** The chat API's fallback (`pickPersona(debate.difficulty)`) means resuming an old debate will roll a fresh random persona for that turn, which could be inconsistent with the original conversation. Acceptable because resuming old debates is a rare path and the alternative is hard-coding a "legacy Robert" persona.

## Out of scope

- ANES sourcing / data pipeline.
- User-facing persona history, picker, or "play again with same persona" features.
- Adjustments to the 8 underlying parameter texts in `parameters.ts`.
- Fixing the typos in `beliefs.ts` (`libral`, `moderite`) — unrelated.
- Any changes to gamification, scoring, or badges.

## Open decisions

### How should partners be assigned to users? (flagged 2026-09-30, undecided)

**Current behavior.** Partners are now chosen from the tier's personas on the *opposite side* from the user's onboarding belief (`pickOpposingPersona` in `src/lib/personas/pool.ts`); center and no-survey users face the right. Because each persona has one fixed `beliefKey`, the pool's ideology mix decides who can be drawn:

| User | Friendly Cluck | Spirited Strut | Full Gobble |
|---|---|---|---|
| Left / lean-left / center / no survey | easy-ts only | med-bh, med-pv, med-rt | hard-dm, hard-sb, hard-mp |
| Lean-right / right | easy-rk, easy-cn | med-jk, med-eg | hard-na, hard-cv |

So left-leaning and center users always get the same easy partner, and the two center personas (easy-am, easy-jl) are never drawn.

**Options.**
- **A. Rebalance the pool** — flip a couple of personas' ideologies so every tier has 2+ per side. Smallest change; users still see only 2–3 of 5 personas per tier.
- **B. Grow the pool** — 6–8 per tier, balanced by side. More variety, more authoring and poli-sci review.
- **C. Decouple ideology from persona** — personas become temperaments (backstory + dials); each debate's ideology comes from flipping the user's belief. Every user sees all 5 personas per tier, always opposed. Requires ideology-neutral backstories (fits the ANES rewrite) and gives up hand-pairing temperament with ideology. *Recommended.*
- **D. Let users pick the partner's side** on the setup screen (default: flipped). Combines with any of the above.

**Also needed:** what center users face — always the right (today), a random side per debate, or a center partner.

**Owner:** product + poli-sci.
