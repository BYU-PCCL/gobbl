# Gobbl API client contract

This document describes what the Next.js API routes under `src/app/api/**/route.ts` do today. Native clients (iOS, later Android) are built from it.

Conventions used in the tables: `string?` means the field can be `null`. "ISO" means an ISO 8601 date-time string, for example `2026-10-26T14:03:11.000Z`. Where the code does not pin a type down, the table says "unspecified".

## 1. Overview

- **Base URL**: the deployed Next.js app, for example `https://<host>`. All paths below are relative to it.
- **Bodies**: requests and responses are JSON (`Content-Type: application/json`). The one exception is `DELETE /api/user`, which returns `204` with no body on success.
- **Errors**: `{ "error": string, "code"?: string }` plus the HTTP status. Some errors carry extra fields (`featherBalance`, `unlockAt`, `debateId`, `currentStage`, `fieldErrors`); these are listed per endpoint. Switch on `code` when present, otherwise on status. Do not parse `error` text.
- **Dates**: ISO 8601 strings in UTC. The exception is `today.date` in `/api/config`, a `YYYY-MM-DD` UTC date key.
- **Evolution policy**: additive only. New response fields may appear at any time, so clients must ignore unknown fields and tolerate unknown enum-like strings. Breaking changes will be published under `/api/v2`.
- **Timeouts**: `POST /api/chat`, `POST /api/debates`, `POST /api/debates/[id]/analyze` and `POST /api/modules/[key]/advance` make blocking AI calls (function limit 60 s). Use a client timeout of at least 60 s for them.
- **Unhandled failures**: any route can also return a framework-generated `500` that does not have the documented JSON shape (for example `POST /api/chat` with a non-JSON body). Treat a non-2xx response that fails to decode as a generic failure.

## 2. Authentication

Two transports are supported by every authenticated endpoint.

1. **Web**: a NextAuth session cookie. Native clients do not use it.
2. **Native**: bearer token.
   - `POST /api/mobile/auth/login` or `POST /api/mobile/auth/register` returns `{ accessToken, expiresAt, user }`.
   - Send `Authorization: Bearer <accessToken>` on every other authenticated call.
   - The token lifetime is 30 days (`MOBILE_TOKEN_MAX_AGE_SECONDS` in `src/lib/mobileToken.ts`). There is no refresh endpoint; when the token expires, log in again.
   - If an `Authorization` header is present but invalid (wrong scheme, missing token, tampered or expired token), the request gets `401`. It is NOT retried against cookies (`src/lib/session.ts`).

Client rules:

- Any `401` on an authenticated endpoint means: sign the user out and show login.
- `404` from `GET /api/user` means the account no longer exists: sign the user out too.
- Unauthenticated responses are `401 { "error": "Unauthorized" }` (no `code`).

### POST /api/mobile/auth/login

Request body:

| Field | Type | Notes |
|---|---|---|
| `username` | string | required, non-empty |
| `password` | string | required, non-empty |

Success `200`:

| Field | Type | Notes |
|---|---|---|
| `accessToken` | string | opaque; use as the bearer token |
| `expiresAt` | string (ISO) | 30 days from issue |
| `user.id` | string | |
| `user.username` | string | |
| `user.onboardingCompletedAt` | string? (ISO) | null until the onboarding survey is done |

Errors:

| Status | Body | When |
|---|---|---|
| 400 | `{ error: "Invalid JSON" }` | body is not JSON |
| 400 | `{ error: "Username and password are required" }` | missing, empty or non-string fields |
| 401 | `{ error: "Invalid username or password" }` | unknown user or wrong password |

### POST /api/mobile/auth/register

Request body: `{ username: string, password: string }`. Rules: username 3-20 characters, password at least 6 characters.

Success `200`: same shape as login (the new account is signed in).

Errors:

| Status | Body | When |
|---|---|---|
| 400 | `{ error: "Invalid JSON" }` | body is not JSON |
| 400 | `{ error }` | validation: "Username and password are required", "Username must be 3-20 characters" or "Password must be at least 6 characters" |
| 409 | `{ error: "Username already taken" }` | duplicate username |
| 500 | `{ error: "Registration failed" }` | unexpected failure |

## 3. Public endpoints

### GET /api/config

No authentication. Everything a client needs that lives only in server TypeScript. Response header: `Cache-Control: public, s-maxage=300, stale-while-revalidate=3600`. `today` rolls over at UTC midnight, so a CDN copy can be stale for a few minutes after the boundary. Clients may keep their own stale copy for offline starts, and should refetch on launch and when the UTC day changes. The route has no input and no error responses.

Top-level fields:

| Field | Type | Notes |
|---|---|---|
| `configVersion` | integer | currently `1`; bumped when a field's meaning changes |
| `minClientVersion` | object | currently `{ "ios": "1.0.0" }`; a client older than its platform's value should force an app update. Only the `ios` key exists today |
| `rules` | object | see below |
| `today` | object | `{ date: string, dailyTopic: Topic }`; `date` is `YYYY-MM-DD` (UTC) |
| `topics` | `Topic[]` | all debate topics |
| `categories` | `string[]` | Economy, Healthcare, Immigration, Climate, Education, Technology, Justice, Civil Rights |
| `difficulties` | `Difficulty[]` | the three tiers |
| `levels` | `LevelDef[]` | ascending by level |
| `badges` | `BadgeDefinition[]` | |
| `shop` | object | `{ slots: ShopSlot[], catalog: ShopItem[] }` |
| `avatarAnchors` | object | `Record<stage, StageAnchors>`, see below |
| `survey` | object | `{ questions: SurveyQuestion[] }` |
| `ideologyOptions` | `IdeologyOption[]` | |
| `civility` | object | `{ dimensions: CivilityDimensionInfo[] }` |

`rules`:

| Field | Type | Current value | Meaning |
|---|---|---|---|
| `maxTurns` | integer | 8 | max user messages per debate |
| `maxMessageChars` | integer | 500 | max characters per user message |
| `dailyBonusXp` | integer | 25 | XP added to a completed Daily Gobble |
| `dailyBonusFeathers` | integer | 30 | feathers added to a completed Daily Gobble |

`Topic`:

| Field | Type | Notes |
|---|---|---|
| `id` | string | for example `min-wage` |
| `title` | string | |
| `description` | string | |
| `category` | string | one of `categories` |
| `prompt` | string | one-sided framing paragraph shown to the user |

`Difficulty` (element of `difficulties`):

| Field | Type | Notes |
|---|---|---|
| `key` | string | `Friendly Cluck`, `Spirited Strut` or `Full Gobble`. This is the value sent as `difficulty` |
| `label` | string | |
| `multiplier` | number | 1.0, 1.25, 1.5 (XP and feather multiplier) |
| `description` | string | |

`LevelDef`:

| Field | Type | Notes |
|---|---|---|
| `level` | integer | 1-8 |
| `name` | string | Egg, Hatchling, Poult, Youngster, Tom, Gobbler, Grand Gobbler, Thunderbird |
| `xpRequired` | integer | cumulative XP to reach the level (0, 200, 500, 1000, 2000, 4000, 7000, 11000) |
| `description` | string | |

`BadgeDefinition`:

| Field | Type | Notes |
|---|---|---|
| `key` | string | matches keys in `badges` / `newBadges` elsewhere: `first-gobble`, `free-range`, `warm-nest`, `migration-streak`, `flock-leader`, `golden-drumstick`, `sharp-beak`, `roosting-ritual` |
| `name` | string | |
| `description` | string | |

`ShopSlot` is one of `"hat" | "face" | "neck" | "chest" | "cape" | "background"`. `shop.slots` lists them in display order: background, cape, hat, face, neck, chest.

`ShopItem`:

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | |
| `slot` | ShopSlot | |
| `cost` | integer | feathers |
| `accent` | string | hex colour, for example `#1F4937` |
| `accentBg` | string | hex colour |
| `isNew` | boolean | key is omitted (not null) when the item is not new |
| `unlockAt` | integer | minimum user level; key is omitted when there is no gate. Currently `wings` and `cosmic` are 6 |

`avatarAnchors`: an object keyed by avatar stage number, as a string (currently `"3"` and `"4"`; other stages have no entry and use offset `{x:0,y:0}`). Each value is `StageAnchors`: an object with optional `hat`, `face`, `neck`, `chest`, `cape` keys (never `background`), each `{ x: number, y: number }`. The unit of the offsets and the mapping from user level to avatar stage are not defined in the server code (a code comment calls the values "starting estimates").

`SurveyQuestion` is a union discriminated by `type`:

| `type` | Fields |
|---|---|
| `"single-choice"` | `key: string`, `prompt: string`, `options: { value: string, label: string }[]` |
| `"short-text"` | `key: string`, `prompt: string`, `maxLength: integer` |

The current onboarding survey has three single-choice questions: `political_affiliation`, `discuss_frequency`, `top_issue`.

`IdeologyOption`: `{ key: "left" | "lean-left" | "center" | "lean-right" | "right", label: string, description: string }`.

`CivilityDimensionInfo`: `{ key: "participation" | "selfExpressionReason" | "mutualExchange" | "interrogation", label: string, description: string }`.

### POST /api/register

Web-only signup. Creates the account and returns no token; native clients use `/api/mobile/auth/register` instead.

Request: `{ username: string, password: string }` (same rules as the mobile endpoint).

Success `200`: `{ id: string, username: string }`.

Errors: `400 { error }` (validation message), `409 { error: "Username already taken" }`, `500 { error: "Registration failed" }` (this also covers a non-JSON body).

## 4. Authenticated endpoints

All endpoints in this section require authentication (bearer token for native clients) and return `401 { error: "Unauthorized" }` otherwise. That `401` is not repeated in each table.

### Shared shapes

`CivilityDimensions` (scores are numbers on a 0-10 scale as used by the scoring prompts; the code does not clamp them):

| Field | Type |
|---|---|
| `participation` | number |
| `selfExpressionReason` | number |
| `mutualExchange` | number |
| `interrogation` | number |

`EquippedCosmetics`: object with any subset of the keys `hat`, `face`, `neck`, `chest`, `cape`, `background`, each a shop item id (string) whose item belongs to that slot. Missing key means nothing equipped. Always an object, never null.

`LevelInfo` (from `getLevelInfo(xp)`): a `LevelDef` (`level`, `name`, `xpRequired`, `description`) plus:

| Field | Type | Notes |
|---|---|---|
| `xpForNext` | integer | XP span of the current level; `0` at max level |
| `xpProgress` | integer | XP gained inside the current level (equals `xpForNext` at max level) |
| `progressPercent` | number | 0-100; `100` at max level |

`MessageDTO`:

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `role` | string | `"user"` or `"assistant"` |
| `content` | string | |
| `civilityScore` | number? | null if not scored yet (partner messages are scored asynchronously after the reply and appear on reload) |
| `dimensions` | CivilityDimensions? | null when absent or legacy |
| `createdAt` | string (ISO) | |

`DebateSummaryDTO`:

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `topic` | string | |
| `category` | string | defaults to `"General"` |
| `difficulty` | string | normally one of the three tier keys; older rows may hold legacy values (`Friendly`, `Challenging`, `Devil's Advocate`) |
| `beliefKey` | string | the partner's political lean: `left`, `lean-left`, `center`, `lean-right`, `right` |
| `personaInitials` | string? | null if the partner is unknown |
| `isDaily` | boolean | |
| `isTraining` | boolean | true for module practice debates |
| `trainingMode` | string? | module key for training debates |
| `allowProfanity` | boolean | |
| `completed` | boolean | |
| `overallScore` | number? | null until completed |
| `xpEarned` | integer | 0 until completed |
| `feathersEarned` | integer | 0 until completed |
| `createdAt` | string (ISO) | |
| `completedAt` | string? (ISO) | |

`DebateDTO` = `DebateSummaryDTO` plus:

| Field | Type | Notes |
|---|---|---|
| `analysis` | `TurnFeedback[]?` | null until `POST /api/debates/[id]/analyze` has run |
| `messages` | `MessageDTO[]` | oldest first |

`TurnFeedback`: `{ turn: integer, wellDone: string, tryInstead: string }`.

---

### GET /api/user

Current user's profile. No parameters.

Success `200`:

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `username` | string | |
| `xp` | integer | |
| `featherBalance` | integer | spendable currency |
| `level` | integer | |
| `levelInfo` | LevelInfo | computed from `xp` |
| `equippedCosmetics` | EquippedCosmetics | |
| `ownedItemIds` | string[] | shop item ids owned |
| `civilityScore` | number | rolling average of recent debate scores; 0 initially |
| `currentStreak` | integer | |
| `longestStreak` | integer | |
| `dailyCompleted` | boolean | whether a daily debate exists today (see note) |
| `badges` | string[] | badge keys earned |
| `beliefKey` | string? | user's lean derived from the survey (`left`, `lean-left`, `center`, `lean-right`, `right`); null before onboarding or if "prefer not to say" |
| `recentDebates` | RecentDebate[] | up to 10 completed debates, newest first |
| `createdAt` | string (ISO) | |
| `onboardingCompletedAt` | string? (ISO) | |

`RecentDebate`:

| Field | Type |
|---|---|
| `id` | string |
| `topic` | string |
| `category` | string |
| `difficulty` | string |
| `score` | number? |
| `xpEarned` | integer |
| `feathersEarned` | integer |
| `completedAt` | string? (ISO) |

Note: `dailyCompleted` is computed over the server's local calendar day (the server process timezone), whereas `POST /api/debates` enforces the Daily Gobble on the UTC day. On a UTC-hosted server they coincide. The "already done today" rule that matters is the `DAILY_DONE` error from `POST /api/debates`.

Errors:

| Status | Body | When |
|---|---|---|
| 404 | `{ error: "User not found" }` | account no longer exists: sign out |

### DELETE /api/user

Permanently deletes the account and all its data.

Request body: `{ "confirm": "DELETE" }` (exact string).

Success: `204`, empty body. After this, discard the token and sign out.

Errors:

| Status | Code | Body | When |
|---|---|---|---|
| 400 | `CONFIRM_REQUIRED` | `{ error, code }` | body missing, not JSON, or `confirm` is not `"DELETE"` |
| 500 | none | `{ error: "Couldn't delete the account" }` | transaction failed |

### POST /api/onboarding/survey

Submits the onboarding survey. Can be completed once per account.

Request body: `{ responses: { [questionKey: string]: string } }`. Every question from `config.survey.questions` needs a valid answer: for `single-choice`, one of the option `value`s; for `short-text`, 1..`maxLength` characters.

Success `200`: `{ onboardingCompletedAt: string (ISO) }`.

Errors:

| Status | Body | When |
|---|---|---|
| 400 | `{ error: "Invalid JSON" }` | body is not JSON |
| 400 | `{ error: "Validation failed", fieldErrors: { [questionKey]: "Required" } }` | any question missing or invalid; the value is always the literal `"Required"` |
| 404 | `{ error: "User not found" }` | account gone |
| 409 | `{ error: "Survey already completed" }` | already submitted (no `code`) |

### GET /api/personas/preview

Picks the debate partner for a tier ahead of time, so the setup screen can show their initials and lean. The pick is random and opposes the user's survey lean where known. Pass the returned `id` as `personaId` to `POST /api/debates` to keep the partner (honored only if still valid for the tier and opposing the user).

Query: `tier` (required): `Friendly Cluck`, `Spirited Strut` or `Full Gobble` (URL-encode spaces).

Success `200`:

| Field | Type | Notes |
|---|---|---|
| `id` | string | persona id |
| `initials` | string | |
| `beliefKey` | string | `left`, `lean-left`, `center`, `lean-right`, `right` |

Errors: `400 { error: "Invalid tier" }`.

### POST /api/debates

Creates a debate and returns the partner's opening message (blocking AI call).

Request body (all fields optional in JSON terms; `topic` is required unless `isDaily` is true):

| Field | Type | Notes |
|---|---|---|
| `topic` | string | free text. Conventionally `"<title> — <description>"` of a config topic (the server's own `formatTopicForDebate`). Ignored when `isDaily` |
| `category` | string | defaults to `"General"`. Ignored when `isDaily` |
| `difficulty` | string | a tier key; anything else becomes `Friendly Cluck` |
| `personaId` | string | from `/api/personas/preview` |
| `isDaily` | boolean | see Daily Gobble rules below |
| `allowProfanity` | boolean | honored only when the tier is `Full Gobble` |

Daily Gobble (`isDaily: true`): the server overrides `topic` and `category` with today's topic (the one in `config.today.dailyTopic`). One daily debate per user per UTC day.

- No daily debate yet today: a new one is created (normal success response).
- Today's daily exists and is not completed: it is resumed, response includes `resumed: true`.
- Today's daily is already completed: `409` with `code: "DAILY_DONE"`.

Success `200` (new debate):

| Field | Type | Notes |
|---|---|---|
| `id` | string | debate id; use it in `/api/chat` |
| `topic` | string | |
| `difficulty` | string | the tier actually used |
| `personaInitials` | string | |
| `openingMessage` | string | the partner's first message |

Success `200` (resumed daily): same five fields, plus `resumed: true`. `personaInitials` is `string?` here (null if the persona is unknown) and `openingMessage` is `""` if no assistant message exists.

Errors:

| Status | Code | Body | When |
|---|---|---|---|
| 400 | none | `{ error: "Invalid request" }` | body is not JSON |
| 400 | none | `{ error: "A topic is required" }` | no `topic` on a non-daily request |
| 409 | `DAILY_DONE` | `{ error, code, debateId }` | today's daily is already completed; `debateId` is that debate |
| 502 | none | `{ error: "Couldn't start the debate — please try again" }` | the AI opening or DB write failed |

### GET /api/debates

Two forms.

**List form** (no `id`): the user's 20 most recent debates, newest first. Includes unfinished and training debates. Success `200`: `DebateSummaryDTO[]` (a bare JSON array).

**Detail form** `?id=<debateId>`: one debate with its full transcript. Success `200`: `DebateDTO`.

Errors (detail form only): `404 { error: "Debate not found" }` (also returned for another user's debate).

### POST /api/chat

One endpoint for sending a turn and for finishing a debate.

Request body:

| Field | Type | Notes |
|---|---|---|
| `debateId` | string | required |
| `message` | string | the user's turn. Required unless `finish` is true. Whitespace-only counts as empty |
| `finish` | boolean | see below |

Behaviours:

1. **Normal turn** (`message` set, `finish` falsy): the message is scored, the partner replies. Returns the per-turn response.
2. **Send and finish** (`message` set, `finish: true`): the message is scored and recorded, no partner reply is generated, the debate is finished. Returns the finish response.
3. **Wrap up** (`finish: true`, no message): no message is recorded; the debate is finished. Returns the finish response. This is also what happens when a turn is sent with `finish: true` after the turn limit is reached.

Per-turn success `200`:

| Field | Type | Notes |
|---|---|---|
| `aiResponse` | string | the partner's reply |
| `aiCivility` | null | always `null` today (partner scoring is asynchronous and saved on the message) |
| `civility` | object | score of the user's message: `{ dimensions: CivilityDimensions, overall: number, feedback: string }` |
| `turnNumber` | integer | the user's turn count including this one, 1-based |
| `maxTurns` | integer | the turn limit (8) |

Finish success `200`:

| Field | Type | Notes |
|---|---|---|
| `finished` | boolean | always `true` |
| `overallScore` | number | holistic score for the whole conversation |
| `dimensions` | CivilityDimensions | holistic dimension scores |
| `xp` | object | `{ base: integer, difficultyBonus: integer, dailyBonus: integer, streakMultiplier: number, total: integer }` |
| `feathers` | object | `{ base: integer, difficultyBonus: integer, dailyBonus: integer, total: integer }` |
| `previousLevel` | integer | level before this debate |
| `newLevel` | integer | level after; compare with `previousLevel` to show a level-up |
| `newBadges` | string[] | badge keys earned just now (may be empty) |
| `streak` | integer | the user's current streak after this debate |
| `civilityScore` | number | the user's new rolling civility average |
| `equippedCosmetics` | EquippedCosmetics | for rendering the results avatar |

XP formula, for display only: `total = round((base + difficultyBonus + dailyBonus) * streakMultiplier)`. Feathers: `total = base + difficultyBonus + dailyBonus`. The server computes both; do not recompute on the client.

Errors:

| Status | Code | Body | When |
|---|---|---|---|
| 400 | none | `{ error: "Message is empty" }` | no message and no `finish` |
| 400 | `MESSAGE_TOO_LONG` | `{ error, code }` | `message.length` exceeds `maxMessageChars` (500) |
| 404 | none | `{ error: "Debate not found" }` | unknown id or not the user's debate (also `User not found` during finish, if the account vanished) |
| 409 | `ALREADY_COMPLETED` | `{ error, code }` | the debate is already finished (re-posting finish does not re-award anything) |
| 409 | `MAX_TURNS` | `{ error, code }` | the user already sent `maxTurns` messages; send a `finish` request instead |

### POST /api/debates/[id]/analyze

Turn-by-turn feedback for a finished debate. The result is cached on the debate, so repeat calls return the same analysis and are cheap. The id is in the path; no request body.

Success `200`: `{ analysis: TurnFeedback[] }` (`turn` is the 1-based user turn number).

Errors:

| Status | Body | When |
|---|---|---|
| 404 | `{ error: "Debate not found" }` | unknown id or not the user's |
| 409 | `{ error: "Finish the conversation before analyzing it" }` | debate not completed (no `code`) |
| 502 | `{ error: "Analysis isn't available right now — try again in a moment" }` | AI failure; safe to retry |

### GET /api/leaderboard

Top 50 users.

Query:

| Param | Values | Notes |
|---|---|---|
| `sort` | `xp` (default), `civility`, `streak` | `streak` sorts by `longestStreak`. Any other value falls back to `xp` |
| `period` | any | accepted but ignored today; results are always all-time |

Success `200`: an array of entries, rank 1 first.

| Field | Type | Notes |
|---|---|---|
| `rank` | integer | 1-based position in this response |
| `id` | string | |
| `username` | string | |
| `xp` | integer | |
| `level` | integer | |
| `civilityScore` | number | rounded to 1 decimal |
| `streak` | integer | current streak |
| `longestStreak` | integer | |
| `totalDebates` | integer | completed debates |
| `isCurrentUser` | boolean | |
| `equippedCosmetics` | EquippedCosmetics | |

The signed-in user appears only if in the top 50. No error responses beyond 401.

### GET /api/modules

Lists the skill modules with the user's progress.

Success `200`: array of:

| Field | Type | Notes |
|---|---|---|
| `key` | string | module key used in `/api/modules/[key]/...` (for example `participation`, `active-listening`, `self-expression`, `reason-giving`, `cognitive-dissonance`) |
| `skill` | string | one of `participation`, `selfExpression`, `reasonGiving`, `listening`, `selfInterrogation`, `cognitiveDissonance` (the declared union; tolerate unknown values) |
| `title` | string | |
| `description` | string | |
| `estimatedMinutes` | integer | |
| `variants` | `{ key: "standard" or "advanced", stepCount: integer }[]` | |
| `hasAdvancedVariant` | boolean | |
| `timesCompleted` | integer | |
| `progress` | object? | latest session, or null if never started: `{ sessionId: string, stage: string, variant: string, inProgress: boolean }`. `stage` is the current step id, or `"complete"` when all steps are done but the session was not finalized |

### POST /api/modules/[key]/start

Starts a module run, or resumes the one in progress.

Request body (optional): `{ variant?: "standard" | "advanced" }`. Anything other than `"advanced"` means `"standard"`. Ignored when resuming.

Success `200`:

| Field | Type | Notes |
|---|---|---|
| `sessionId` | string | |
| `variant` | string | `"standard"` or `"advanced"` |
| `step` | ModuleStep? | the current step. Null only for a resumed run that finished its last step but was not completed: call `/complete` |
| `moduleTitle` | string | |
| `stepIndex` | integer? | 0-based index of `step` in the variant; null when `step` is null |
| `stepCount` | integer | steps in the variant |
| `resumed` | boolean | present and `true` only when resuming an in-progress run |

Errors: `404 { error: "Module not found" }`.

`ModuleStep` is a union discriminated by `kind`:

| `kind` | Fields |
|---|---|
| `"diagnostic"` | `id: string`, `questions: SurveyQuestion[]` (same union as in config) |
| `"content"` | `id: string`, `blocks: { heading: string, body: string }[]` |
| `"practice"` | `id: string`, `topic: string`, `difficulty: string`, `maxTurns?: integer` |
| `"reflection"` | `id: string`, `prompt: string`, `maxLength: integer` |

`maxTurns` on a practice step is optional and its enforcement is not visible in the routes (the chat endpoint always applies the global `maxTurns`); treat it as a display hint only.

### POST /api/modules/[key]/advance

Reproduced from the contract at the top of `src/app/api/modules/[key]/advance/route.ts`.

Submits the user's work for the CURRENT step of a skill-module session and moves the session to the next step. Steps must be taken in order.

Request body (JSON): `{ sessionId: string, stepId: string, answer?: unknown, action?: string }`

- `sessionId` / `stepId`: from the start response (`sessionId`, `step.id`) or the previous advance response (`nextStep.id`). `stepId` must equal the session's current stage, otherwise `409 { error: "Not the current step", currentStage }`.

What to send, per `step.kind`:

| `step.kind` | What to send |
|---|---|
| `diagnostic` | `answer` = object keyed by question key, one string value for EVERY entry in `step.questions` (`{ [question.key]: string }`); each value must pass the question's validation. Otherwise `400 "Please answer every question"`. No `action`. |
| `content` | nothing. `answer` and `action` are ignored. |
| `reflection` | `answer` = string, trimmed, 1..`step.maxLength` characters. Otherwise 400. No `action`. |
| `practice` | two calls, see below. |

Practice, two calls:

1. Call WITHOUT `action: "finish"` (omit `action`, no `answer`). Creates (or, on re-entry/reload, reuses) the training debate for this step and returns `{ debateId }` only. The session does NOT advance. Run the chat on that debate (`/api/chat`).
2. Once that debate is completed (`completed` true), call again with `action: "finish"` (no `answer`). If the debate is not completed: `409 "Finish the conversation before continuing"`. On success the session advances.

A variant supports at most two practice steps (400 otherwise).

Response on an advancing call (200):

| Field | Type | Notes |
|---|---|---|
| `nextStep` | ModuleStep? | next step object; null when the last step was done |
| `moduleTitle` | string | |
| `stepIndex` | integer? | 0-based index of `nextStep` in the variant; null if `nextStep` is null |
| `stepCount` | integer | total steps in the variant |
| `debateId` | string | only after a practice `finish` |

`nextStep: null` means every step is done; the session stage is now `"complete"` and the client should call the module's complete endpoint to finalize it.

Response to the first practice call (200): `{ debateId: string }` only (no `nextStep`, no step metadata).

Errors: 401 unauthenticated; 404 module/session/step not found; 400 invalid JSON or invalid answer; 409 session already completed, not the current step, or practice debate not finished. Exact bodies (none carry a `code`):

| Status | Body | When |
|---|---|---|
| 400 | `{ error: "Invalid JSON" }` | body is not JSON |
| 400 | `{ error: "Please answer every question" }` | bad diagnostic answer |
| 400 | `{ error: "Reflection must be 1-<maxLength> characters" }` | bad reflection |
| 400 | `{ error: "Modules support at most two practice steps" }` | third practice step in a variant |
| 404 | `{ error: "Module not found" }` | unknown module key |
| 404 | `{ error: "Session not found" }` | unknown session, not the user's, or for another module |
| 404 | `{ error: "Step not found" }` | `stepId` is not in the session's variant |
| 409 | `{ error: "Session already completed" }` | |
| 409 | `{ error: "Not the current step", currentStage: string }` | out-of-order submission or lost a race |
| 409 | `{ error: "Finish the conversation before continuing" }` | practice `finish` before the debate is completed |

### POST /api/modules/[key]/complete

Finalizes a module session whose steps are all done and pays out a flat completion bonus of 30 feathers (the practice debates' own XP and feathers were already awarded by `/api/chat`).

Request body: `{ sessionId: string }`.

Success `200`:

| Field | Type | Notes |
|---|---|---|
| `completed` | boolean | `true` |
| `preCivility` | number? | overall score of the first practice debate; null if none |
| `postCivility` | number? | overall score of the second practice debate; null if none |
| `feathersEarned` | integer | 30 |

Errors (no `code`):

| Status | Body | When |
|---|---|---|
| 404 | `{ error: "Module not found" }` | |
| 404 | `{ error: "Session not found" }` | missing/invalid `sessionId`, or not the user's |
| 409 | `{ error: "Session already completed" }` | including a concurrent duplicate request |
| 409 | `{ error: "Module not finished" }` | session `stage` is not `"complete"`; call advance until `nextStep` is null |

### GET /api/shop

Catalog with per-user state.

Success `200`:

| Field | Type | Notes |
|---|---|---|
| `featherBalance` | integer | |
| `level` | integer | |
| `equipped` | EquippedCosmetics | |
| `items` | ShopItem[] with extras | every catalog item (shape in the config section: `id`, `name`, `slot`, `cost`, `accent`, `accentBg`, optional `isNew`, optional `unlockAt`) plus `owned: boolean` and `canAfford: boolean` (`featherBalance >= cost`; it does not account for `unlockAt`, so also compare `level` with `unlockAt`) |

Errors: `404 { error: "User not found" }`.

### POST /api/shop/purchase

Buys one item with feathers. Atomic.

Request body: `{ itemId: string }`.

Success `200`: `{ success: true, featherBalance: integer, itemId: string }` (`featherBalance` is the new balance).

Errors:

| Status | Code | Body | When |
|---|---|---|---|
| 400 | none | `{ error: "Invalid JSON" }` | body is not JSON |
| 400 | none | `{ error: "Invalid item" }` | missing, non-string or unknown `itemId` |
| 402 | `NOT_ENOUGH_FEATHERS` | `{ error, code, featherBalance }` | balance below cost |
| 403 | `LOCKED` | `{ error, code, unlockAt }` | user level below the item's `unlockAt` |
| 404 | none | `{ error: "User not found" }` | |
| 409 | `ALREADY_OWNED` | `{ error, code, featherBalance }` | already in inventory |
| 500 | none | `{ error: "Purchase failed" }` | |

Check order: already owned, then locked, then affordability.

### PATCH /api/shop/equip

Equips an owned item into a slot, or unequips a slot.

Request body: `{ slot: ShopSlot, itemId: string | null }`. `null` unequips the slot. Omitting `itemId` is an error.

Success `200`: `{ equipped: EquippedCosmetics }` (the full equipped set after the change).

Errors (no `code`):

| Status | Body | When |
|---|---|---|
| 400 | `{ error: "Invalid JSON" }` | |
| 400 | `{ error: "Invalid slot" }` | `slot` missing or not a ShopSlot |
| 400 | `{ error: "Invalid itemId" }` | `itemId` is neither string nor null |
| 400 | `{ error: "Unknown item" }` | id not in catalog |
| 400 | `{ error: "Item does not match slot" }` | |
| 400 | `{ error: "Missing itemId (use null to unequip)" }` | `itemId` omitted |
| 403 | `{ error: "You do not own this item" }` | |
| 404 | `{ error: "User not found" }` | |

## 5. Error codes

Every `code` literal present under `src/app/api`:

| Code | Status | Endpoint | Meaning | Extra fields |
|---|---|---|---|---|
| `CONFIRM_REQUIRED` | 400 | `DELETE /api/user` | body did not contain `{ "confirm": "DELETE" }` | none |
| `MESSAGE_TOO_LONG` | 400 | `POST /api/chat` | message longer than `maxMessageChars` | none |
| `ALREADY_COMPLETED` | 409 | `POST /api/chat` | debate already finished | none |
| `MAX_TURNS` | 409 | `POST /api/chat` | user has sent `maxTurns` messages; finish the debate | none |
| `DAILY_DONE` | 409 | `POST /api/debates` | today's (UTC) Daily Gobble already completed | `debateId` |
| `NOT_ENOUGH_FEATHERS` | 402 | `POST /api/shop/purchase` | balance below item cost | `featherBalance` |
| `LOCKED` | 403 | `POST /api/shop/purchase` | user level below the item's `unlockAt` | `unlockAt` |
| `ALREADY_OWNED` | 409 | `POST /api/shop/purchase` | item already owned | `featherBalance` |

All other errors carry no `code`; use the HTTP status. Statuses used without a code: `400` bad input, `401` not authenticated, `403` not owned, `404` not found, `409` state conflict (survey done, module step order, debate not finished, username taken), `500` server failure, `502` upstream AI failure.

## 6. Rules the server now enforces

Clients should still mirror these for UX, but the server is the authority. Read the values from `/api/config`.

- **Turn limit**: at most `rules.maxTurns` (8) user messages per debate. A further message gets `409 MAX_TURNS`; send `finish: true` instead.
- **Message length**: at most `rules.maxMessageChars` (500) characters, else `400 MESSAGE_TOO_LONG`. The check applies to `message` on `/api/chat` only.
- **Daily Gobble**: the topic is chosen by the server (`config.today.dailyTopic`, rotating by UTC day of year) and any client-sent `topic`/`category` is ignored when `isDaily` is true. Once per user per UTC day: an unfinished daily is resumed (`resumed: true`), a finished one yields `409 DAILY_DONE`. The day boundary is UTC midnight.
- **Finishing**: a debate can be finished only once (`ALREADY_COMPLETED`); XP, feathers, streak and badges are awarded then, never twice.
- **Shop unlock levels**: an item with `unlockAt` cannot be bought below that level (`403 LOCKED`). Equipping requires ownership and a matching slot.
- **Profanity**: `allowProfanity` is honored only for the `Full Gobble` tier.
- **Modules**: steps must be submitted in order, the practice debate must be completed before its step can finish, and the completion bonus is paid once.
