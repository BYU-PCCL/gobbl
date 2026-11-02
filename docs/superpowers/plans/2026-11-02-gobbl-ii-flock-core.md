# Gobbl II Flock Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Gobbl into a raise-your-flock app. Users hatch skill-specific turkeys whose hunger, loneliness, and sadness drain over time and are refilled by Feed (modules), Park (conversations), and School (scripted lessons). The dashboard, arena, leaderboard, badges, and XP UI are removed.

**Architecture:** Two new Prisma tables (`Turkey`, `TurkeyActivity`) hold all flock state. Existing tables are untouched. Needs are derived from "last refilled at" timestamps by pure functions in `src/lib/flock/`. Existing Park and Feed flows are tied to a turkey by a pending `TurkeyActivity` row created when the conversation or module starts, then completed when it finishes. The turkey's look lives behind one component, `TurkeyCharacter`, so the artist's final art can replace it.

**Tech Stack:** Next.js 14 app router, Prisma 5 + Postgres, NextAuth (JWT), Tailwind, recharts, Vitest (new, unit tests for `src/lib/flock` only).

**Spec:** `docs/superpowers/specs/2026-11-02-gobbl-ii-flock-design.md`. Read it first. This plan implements its "Project 1: Flock core" section.

## Global Constraints

- **Additive-only DB changes.** New tables and new nullable/defaulted columns only. Never rename, drop, or retype an existing model, column, or relation. `Debate`, `UserBadge`, `User.xp/level/...` stay in `schema.prisma` unchanged.
- **This branch stays off the shared database until merged.** `DATABASE_URL`/`DIRECT_URL` in `.env.local` must point at a separate DB (local Postgres or a separate Supabase project). Never run `npm run db:push` or `npm run build` against the shared DB. (`npm run build` runs `db:push`; use `npx next build` for build checks.)
- Existing users keep `featherBalance`, `UserInventory`, and `equippedCosmetics`, and start with no turkey.
- The turkey never dies. Needs bottom out at 0 with a droopy mood. No feathers or turkeys are ever lost to neglect.
- Tunable numbers live only in `src/lib/flock/config.ts`.
- Colors come from the existing Tailwind theme tokens (`bg`, `surface`, `ink`, `primary`, `plume-*`, etc.). No new palette.

## Review Focus

1. **A conversation ended with fewer than 3 user messages** (including "Wrap up" with zero). Expect no loneliness refill, no growth, and 0 feathers. Pinned by `qualifiesParkVisit` tests (Task 2) and the manual check in Task 4.
2. **Unhatched egg or another user's turkey used as an activity target** (`turkeyId` in `/api/debates`, module start, or school). Expect the request to proceed *without* linking (park/feed) or a 404 (school, hatch). Pinned in Task 4/6 steps.
3. **Needs computed far in the future or with clock skew** (lastAt after now, or years ago). Expect needs clamped to 0..100. Pinned by `needLevel` tests (Task 2).
4. **Buying an egg with too few feathers, or one for a skill you already own.** Expect 402 / 409 and an unchanged balance. Pinned by `canBuyEgg` tests (Task 2) and the route in Task 3.
5. **Module resumed from a different turkey than it started on**, or the same conversation finished twice. Expect the activity to land on the most recent turkey and to complete exactly once. Pinned by `upsert`-by-`refId` and the `completedAt: null` claim in Task 4.

---

## File Structure

```
prisma/schema.prisma                     modify: add Turkey, TurkeyActivity, User.turkeys relation
vitest.config.ts                         create
src/lib/flock/config.ts                  create: every tunable number
src/lib/flock/skills.ts                  create: the six turkey skills, labels, tint, moduleKey
src/lib/flock/needs.ts                   create: needLevel, turkeyNeeds, turkeyMood
src/lib/flock/growth.ts                  create: stageForActivityCount, qualifiesParkVisit
src/lib/flock/trend.ts                   create: skillTrend
src/lib/flock/eggs.ts                    create: canBuyEgg
src/lib/flock/view.ts                    create: toTurkeyView (DB row → client shape)
src/lib/flock/activities.ts              create: startActivity, completeActivity (server-only)
src/lib/flock/schoolScripts.ts           create: one 3-step script per skill
src/lib/flock/*.test.ts                  create: unit tests
src/app/api/turkeys/route.ts             create: GET list, POST first free egg
src/app/api/turkeys/[id]/route.ts        create: GET detail + trend
src/app/api/turkeys/[id]/hatch/route.ts  create
src/app/api/turkeys/[id]/school/route.ts create
src/app/api/turkeys/eggs/route.ts        create: POST buy egg
src/app/api/debates/route.ts             modify: accept turkeyId → startActivity("park")
src/app/api/chat/route.ts                modify: finishDebate → completeActivity, <3 msgs pays 0
src/app/api/modules/[key]/start/route.ts modify: accept turkeyId → startActivity("feed")
src/app/api/modules/[key]/complete/route.ts modify: completeActivity
src/components/turkey/TurkeyCharacter.tsx create: the swappable placeholder character
src/components/turkey/NeedBars.tsx       create
src/components/turkey/FlockSwitcher.tsx  create
src/components/turkey/SkillTrend.tsx     create
src/components/turkey/useFlock.ts        create: client hook, current-turkey selection
src/app/(app)/hatch/page.tsx             create: egg picker + tap-to-hatch + naming
src/app/(app)/home/page.tsx              create: the new home
src/app/(app)/school/[turkeyId]/page.tsx create
src/app/(app)/chat/page.tsx, chat/[id]/page.tsx, skills/[key]/page.tsx   modify: carry turkeyId, back-to-turkey
src/app/(app)/shop/page.tsx              modify: eggs section, drop level gate, current turkey avatar
src/app/(app)/dashboard, leaderboard     delete
src/components/layout/*, middleware.ts, app/page.tsx, onboarding/survey/page.tsx, api/user/route.ts, lib/shop.ts   modify: remove XP/level/badges/arena
```

---

### Task 1: Schema and a separate dev database

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `.env.example` (comment only)

**Interfaces:**
- Produces: Prisma models `Turkey`, `TurkeyActivity` exactly as below. Every later task uses these field names.

- [ ] **Step 1: Confirm a separate database.** Ask the user for a non-shared `DATABASE_URL`/`DIRECT_URL` (local Postgres or a new Supabase project) and put them in `.env.local`. Stop and ask if none is available. Do not proceed against the shared DB.

- [ ] **Step 2: Add the models.** Add `turkeys Turkey[]` to `User` (relation field only, no column change) and:

```prisma
model Turkey {
  id            String           @id @default(cuid())
  userId        String
  skill         String           // a TurkeySkillKey from src/lib/flock/skills.ts
  name          String?          // null until hatched
  hatchedAt     DateTime?        // null = still an egg
  activityCount Int              @default(0)
  lastFedAt     DateTime?        // hunger
  lastSocialAt  DateTime?        // loneliness
  lastTaughtAt  DateTime?        // sadness
  createdAt     DateTime         @default(now())
  user          User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  activities    TurkeyActivity[]

  @@unique([userId, skill])
}

model TurkeyActivity {
  id          String    @id @default(cuid())
  turkeyId    String
  kind        String    // "park" | "feed" | "school"
  refId       String?   @unique // Debate.id (park) or SkillSession.id (feed); null for school
  score       Float?    // 0–10 civility snapshot for the skill trend
  feathers    Int       @default(0)
  counted     Boolean   @default(false) // true when it refilled a need and counted toward growth
  completedAt DateTime?
  createdAt   DateTime  @default(now())
  turkey      Turkey    @relation(fields: [turkeyId], references: [id], onDelete: Cascade)

  @@index([turkeyId, completedAt])
}
```

`@@unique([userId, skill])` enforces one turkey per skill. *Planner's call:* since there's one egg per skill in the shop, a user has at most six turkeys.

- [ ] **Step 3: Validate and push to the separate DB.**
Run: `npx prisma validate && npx prisma db push`. Expected: "The database is now in sync", with no data-loss warning. A data-loss prompt means a non-additive change slipped in, so stop.
Then run `npx prisma db execute --file prisma/supabase-rls.sql --schema prisma/schema.prisma`. Expected: success. Check that the RLS script covers new tables. If it lists tables by name, add `Turkey` and `TurkeyActivity`.

- [ ] **Step 4: Note the rule in `.env.example`.** Add a comment above `DATABASE_URL`: the `gamafied_rich` branch must use its own DB until merged (see spec).

- [ ] **Step 5: Commit** `prisma/schema.prisma prisma/supabase-rls.sql .env.example` with `feat(flock): add Turkey and TurkeyActivity tables`.

---

### Task 2: Flock rules (pure logic + tests)

**Files:**
- Create: `vitest.config.ts`, `src/lib/flock/{config,skills,needs,growth,trend,eggs}.ts`, and tests `src/lib/flock/{needs,growth,trend,eggs}.test.ts`
- Modify: `package.json` (devDependency `vitest`, script `"test": "vitest run"`)

**Interfaces:**
- Produces (all exported):
  - `config.ts`: `NEED_HOURS_TO_EMPTY = 72`, `NEED_LOW = 30`, `NEED_HAPPY = 70`, `EGG_COST = 500`, `SCHOOL_FEATHERS = 20`, `SCHOOL_DAILY_FEATHER_CAP = 3` (paid school lessons per turkey per UTC day), `PARK_MIN_USER_MESSAGES = 3`, `STAGE_THRESHOLDS = [0, 3, 8, 15, 25, 40, 60]` (activity counts for stages 2–8; stage 1 = egg), `TREND_WINDOW = 10`.
  - `skills.ts`: `type TurkeySkillKey = ModuleSkillKey` (re-export from `src/lib/modules/types.ts`). `TURKEY_SKILLS: { key: TurkeySkillKey; label: string; blurb: string; tint: string; moduleKey: string | null }[]`, covering all six. `moduleKey` values: participation→`"participation"`, listening→`"active-listening"`, selfExpression→`"self-expression"`, reasonGiving→`"reason-giving"`, cognitiveDissonance→`"cognitive-dissonance"`, selfInterrogation→`null`. Also `isTurkeySkill(x: unknown): x is TurkeySkillKey` and `getTurkeySkill(key)`.
  - `needs.ts`: `type NeedKey = "hunger" | "loneliness" | "sadness"`; `needLevel(lastAt: Date | null, now: Date): number`; `turkeyNeeds(t: { lastFedAt; lastSocialAt; lastTaughtAt }, now: Date): Record<NeedKey, number>`; `type TurkeyMood = "happy" | "okay" | "hungry" | "lonely" | "sad"`; `turkeyMood(needs): TurkeyMood`.
  - `growth.ts`: `stageForActivityCount(count: number, hatched: boolean): number` (1–8); `qualifiesParkVisit(userMessageCount: number): boolean`.
  - `trend.ts`: `skillTrend(scores: number[]): { points: number[]; earlierAvg: number | null; recentAvg: number | null; delta: number | null }`. `scores` is oldest→newest.
  - `eggs.ts`: `canBuyEgg(balance: number, ownedSkills: string[], skill: string): "ok" | "invalid" | "owned" | "insufficient"`.

- [ ] **Step 1: Install Vitest.** `npm i -D vitest`. Create `vitest.config.ts` with the `@` → `src` alias and `include: ["src/**/*.test.ts"]`. Add the `test` script.

- [ ] **Step 2: Write the failing tests.**

```ts
// needs.test.ts
const now = new Date("2026-11-02T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);
test("never refilled is empty", () => expect(needLevel(null, now)).toBe(0));
test("just refilled is full", () => expect(needLevel(now, now)).toBe(100));
test("half drained at 36h", () => expect(needLevel(hoursAgo(36), now)).toBeCloseTo(50));
test("clamps to 0 when long ago", () => expect(needLevel(hoursAgo(10_000), now)).toBe(0));
test("clamps to 100 when lastAt is in the future", () => expect(needLevel(hoursAgo(-5), now)).toBe(100));
test("mood: lowest need under NEED_LOW wins, ties go hunger>loneliness>sadness", () => {
  expect(turkeyMood({ hunger: 10, loneliness: 20, sadness: 90 })).toBe("hungry");
  expect(turkeyMood({ hunger: 90, loneliness: 5, sadness: 5 })).toBe("lonely");
  expect(turkeyMood({ hunger: 80, loneliness: 75, sadness: 71 })).toBe("happy");
  expect(turkeyMood({ hunger: 80, loneliness: 50, sadness: 71 })).toBe("okay");
});

// growth.test.ts
test("egg is stage 1", () => expect(stageForActivityCount(99, false)).toBe(1));
test("fresh hatchling is stage 2", () => expect(stageForActivityCount(0, true)).toBe(2));
test("thresholds", () => {
  expect(stageForActivityCount(2, true)).toBe(2);
  expect(stageForActivityCount(3, true)).toBe(3);
  expect(stageForActivityCount(60, true)).toBe(8);
  expect(stageForActivityCount(1000, true)).toBe(8);
});
test("park needs 3 user messages", () => {
  expect(qualifiesParkVisit(0)).toBe(false);
  expect(qualifiesParkVisit(2)).toBe(false);
  expect(qualifiesParkVisit(3)).toBe(true);
});

// trend.test.ts
test("empty", () => expect(skillTrend([])).toEqual({ points: [], earlierAvg: null, recentAvg: null, delta: null }));
test("one score has no delta", () => expect(skillTrend([6]).delta).toBeNull());
test("keeps last TREND_WINDOW, compares halves", () => {
  const t = skillTrend([1, 1, 1, 1, 4, 4, 4, 4, 8, 8, 8, 8]);
  expect(t.points).toEqual([1, 1, 4, 4, 4, 4, 8, 8, 8, 8]);
  expect(t.earlierAvg).toBeCloseTo(2.8);
  expect(t.recentAvg).toBeCloseTo(7.2);
  expect(t.delta).toBeCloseTo(4.4);
});

// eggs.test.ts
test("ok", () => expect(canBuyEgg(500, [], "listening")).toBe("ok"));
test("insufficient", () => expect(canBuyEgg(499, [], "listening")).toBe("insufficient"));
test("owned", () => expect(canBuyEgg(9999, ["listening"], "listening")).toBe("owned"));
test("invalid", () => expect(canBuyEgg(9999, [], "juggling")).toBe("invalid"));
```

`skillTrend` splits `points` into earlier = first `floor(n/2)`, recent = the rest. Delta is `null` when either half is empty.

- [ ] **Step 3: Run** `npm test`. Expected: FAIL (modules not found).
- [ ] **Step 4: Implement** the six files to the interfaces above. `needLevel` = `clamp(100 − elapsedHours × 100 / NEED_HOURS_TO_EMPTY, 0, 100)`.
- [ ] **Step 5: Run** `npm test`. Expected: all pass. Run `npx tsc --noEmit`. Expected: no errors.
- [ ] **Step 6: Commit** with `feat(flock): needs, growth, trend and egg rules`.

---

### Task 3: Turkey API (list, first egg, hatch, buy egg, detail)

**Files:**
- Create: `src/lib/flock/view.ts` (+ `view.test.ts`), `src/app/api/turkeys/route.ts`, `src/app/api/turkeys/[id]/route.ts`, `src/app/api/turkeys/[id]/hatch/route.ts`, `src/app/api/turkeys/eggs/route.ts`

**Interfaces:**
- Consumes: Task 2 functions; the auth pattern from `src/app/api/shop/purchase/route.ts` (`getServerSession(authOptions)`, `(session.user as { id: string }).id`).
- Produces:
  - `type TurkeyView = { id; skill: TurkeySkillKey; skillLabel: string; name: string | null; hatched: boolean; stage: number; stageName: string; needs: Record<NeedKey, number>; mood: TurkeyMood; activityCount: number; moduleKey: string | null }`
  - `toTurkeyView(row: Turkey, now: Date): TurkeyView`. `stageName` comes from `TURKEY_STAGE_LABELS` in `FlatTurkey.tsx`.
  - `GET /api/turkeys` → `{ turkeys: TurkeyView[]; featherBalance: number }`, oldest first.
  - `POST /api/turkeys { skill }` → creates the **free first egg** only if the user has zero turkeys. Otherwise 409 `"Buy more eggs in the shop"`. Invalid skill → 400.
  - `POST /api/turkeys/[id]/hatch { name }` → name trimmed, 1–20 chars, else 400. Not the user's turkey → 404. Already hatched → 409. Sets `name`, `hatchedAt = now`, and `lastFedAt = lastSocialAt = lastTaughtAt = now` (a new turkey starts content). Returns `TurkeyView`.
  - `POST /api/turkeys/eggs { skill }` → in a `$transaction`: `canBuyEgg`, then `featherBalance: { decrement: EGG_COST }` and create the unhatched turkey. Map `invalid`→400, `owned`→409, `insufficient`→402, with the body `{ error, featherBalance }` as in the shop purchase route. Returns `{ turkey: TurkeyView, featherBalance }`.
  - `GET /api/turkeys/[id]` → `{ turkey: TurkeyView; trend: ReturnType<typeof skillTrend>; recent: { kind; score; feathers; completedAt }[] }`. The trend is built from the last `TREND_WINDOW` completed, counted activities with non-null `score`, oldest→newest.

- [ ] **Step 1: Write a failing `view.test.ts`.** An unhatched row gives `stage 1`, `hatched false`, `needs` all 0. A hatched row with `activityCount 3` and timestamps equal to `now` gives `stage 3`, all needs 100, `mood "happy"`, `skillLabel` from `TURKEY_SKILLS`.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** `toTurkeyView` and the five route handlers above.
- [ ] **Step 4: Run** `npm test && npx tsc --noEmit`. Expected: pass.
- [ ] **Step 5: Manual API check** with `npm run dev` against the separate DB, signed in as a seed user (`npm run db:seed` on the separate DB first). In the browser console:
  - `fetch('/api/turkeys',{method:'POST',body:JSON.stringify({skill:'listening'})})` → 200.
  - Repeat the call → 409.
  - Hatch the turkey with `name:""` → 400; with `name:"Gobbles"` → 200, needs 100.
  - Buy a `listening` egg → 409. Buy `participation` with a low balance → 402.
- [ ] **Step 6: Commit** with `feat(flock): turkey list, hatch and egg APIs`.

---

### Task 4: Tie Park, Feed and School to a turkey

**Files:**
- Create: `src/lib/flock/activities.ts`, `src/app/api/turkeys/[id]/school/route.ts`
- Modify: `src/app/api/debates/route.ts`, `src/lib/debates.ts` (pass-through only if needed), `src/app/api/chat/route.ts` (`finishDebate`), `src/app/api/modules/[key]/start/route.ts`, `src/app/api/modules/[key]/complete/route.ts`

**Interfaces:**
- Consumes: Task 2 config and `qualifiesParkVisit`; Task 1 models.
- Produces (in `activities.ts`, `import "server-only"`):
  - `startActivity(args: { userId: string; turkeyId: unknown; kind: "park" | "feed"; refId: string }): Promise<void>`. If `turkeyId` isn't a string naming a **hatched turkey owned by `userId`**, it does nothing. Otherwise it `upsert`s on `refId`, setting/updating `turkeyId`, so a resumed module moves to the latest turkey.
  - `completeActivity(args: { refId: string; score: number | null; feathers: number; counts: boolean }): Promise<void>`. In one transaction: `updateMany where { refId, completedAt: null }` sets `completedAt`, `score`, `feathers`, `counted`. If the count is 0, return (no link, or already done). If `counts`, update the turkey: `activityCount: { increment: 1 }`, plus `lastSocialAt` (park) or `lastFedAt` (feed) `= now`.
  - `POST /api/turkeys/[id]/school { answers: string[] }` → 404 unless it's a hatched turkey the user owns. 400 unless there are exactly 3 answers, each trimmed to ≥ 10 chars. Creates a completed `TurkeyActivity { kind: "school", counted: true, score: null }`, increments `activityCount`, and sets `lastTaughtAt = now`. Pays `SCHOOL_FEATHERS` (`featherBalance: { increment }`) only if that turkey has fewer than `SCHOOL_DAILY_FEATHER_CAP` paid school activities since UTC midnight. Returns `{ turkey: TurkeyView, feathersEarned, featherBalance }`.

- [ ] **Step 1: Park start.** In `POST /api/debates`, read `turkeyId` from the body. After `createDebate` succeeds, call `startActivity({ userId, turkeyId, kind: "park", refId: result.id })`.
- [ ] **Step 2: Park finish.** In `finishDebate`:
  - Compute `const qualifies = qualifiesParkVisit(userMessages.length)`.
  - When `!qualifies`, use `featherResult.total = 0` for both the `Debate.feathersEarned` write and the balance increment. XP/level/badge writes stay as they are; that UI is removed in Task 9.
  - After the transaction, call `completeActivity({ refId: debateId, score: overallScore, feathers: featherResult.total, counts: qualifies })`.
- [ ] **Step 3: Feed start.** In the module start route, read `turkeyId` from the body (it's already parsed for `variant`, so parse the body once at the top). Call `startActivity({ ..., kind: "feed", refId: skillSession.id })` for both the new and the resumed session.
- [ ] **Step 4: Feed finish.** In the module complete route, after the successful transaction, call `completeActivity({ refId: skillSession.id, score: postCivility ?? preCivility, feathers: MODULE_COMPLETION_FEATHERS, counts: true })`.
- [ ] **Step 5: School route.** Implement it as specified.
- [ ] **Step 6: Verify.** Run `npx tsc --noEmit && npm test`. Expected: pass. Then do a manual check on the separate DB:
  - Start a debate with the hatched turkey's `turkeyId` and send 3 messages. Then `finish` and `GET /api/turkeys/<id>`: `activityCount` +1, loneliness 100, `recent[0].kind === "park"`.
  - Start another and finish with 0 messages: `activityCount` unchanged and the debate's `feathersEarned` 0.
  - Re-POST finish → 409 (existing guard), activityCount unchanged.
  - Pass another user's turkey id → the debate starts, and no `TurkeyActivity` row exists for it.
  - School: 4 calls in one day → the 4th returns `feathersEarned: 0` but still refills.
- [ ] **Step 7: Commit** with `feat(flock): link park, feed and school activities to turkeys`.

---

### Task 5: The placeholder `TurkeyCharacter`

**Files:**
- Create: `src/components/turkey/TurkeyCharacter.tsx`
- Modify: `tailwind.config.ts` (keyframes only, if needed)

**Interfaces:**
- Consumes: `ItemLayer`, `ITEM_RENDERERS` (`ItemLayers.tsx`); `getSlotOffset` (`avatarAnchors.ts`); `EquippedCosmetics`.
- Produces: **the swap point for the artist's final design.** Nothing else in the app may draw the turkey on the new screens.

```ts
export type TurkeyReaction = "none" | "pet" | "eat" | "cheer" | "listen";
export interface TurkeyCharacterProps {
  stage: number;            // 1 = egg … 8
  mood: TurkeyMood;
  skill: TurkeySkillKey;    // tint via getTurkeySkill(skill).tint
  equipped?: EquippedCosmetics;
  reaction?: TurkeyReaction; // one-shot; parent resets to "none" via onReactionEnd
  onReactionEnd?: () => void;
  onTap?: () => void;
  size?: number;            // px, default 220
  label?: string;           // turkey's name, used in the aria-label
  className?: string;
}
```

- [ ] **Step 1: Implement** as a single inline SVG.
  - **Shape and shading:** a round, plush, Finch-like body using radial gradients for shading and a soft ground shadow. Theme colors, with the skill `tint` on the tail fan/wattle. Stage scales the body and adds detail (stage 1 renders an egg that wobbles).
  - **Idle:** a gentle bob plus a blink every ~4s via CSS animation.
  - **Moods:**
    - happy: eyes up-curved, slight bounce
    - okay: neutral
    - hungry: open beak, glance down
    - lonely: looks aside, small droop
    - sad: lowered eyes and droopy tail, slower bob
  - **Reactions:** each runs ~900ms, then calls `onReactionEnd`.
    - pet: squish + heart
    - eat: peck
    - cheer: hop + sparkle
    - listen: head tilt
  - **Items:** reuse `ItemLayer` with `getSlotOffset(stage, slot)` exactly as `AvatarWithItems` does, so existing items still sit on the turkey.
  - **Accessibility:** `role="img"` with `aria-label` like `"Gobbles, a Poult, looks hungry"`, built from `label`, stage, and mood. Honor `prefers-reduced-motion` by disabling idle and reaction motion.
- [ ] **Step 2: Verify visually.** Add a temporary `src/app/(app)/home/page.tsx` that renders a grid of every stage × mood and one of each reaction on tap. Run `npm run dev`, view at 375px and desktop widths, and confirm items line up for stages 2, 5 and 8. Delete the temporary grid (Task 7 writes the real page).
- [ ] **Step 3: Commit** with `feat(turkey): placeholder Finch-style TurkeyCharacter`.

---

### Task 6: Egg picker and hatching (`/hatch`)

**Files:**
- Create: `src/app/(app)/hatch/page.tsx`, `src/components/turkey/useFlock.ts`

**Interfaces:**
- Consumes: Task 3 APIs; `TurkeyCharacter`; `TURKEY_SKILLS`.
- Produces: `useFlock(): { turkeys: TurkeyView[]; featherBalance: number; current: TurkeyView | null; select(id: string): void; reload(): Promise<void>; loading: boolean }`. `current` is the hatched turkey whose id is in `localStorage["gobbl.currentTurkey"]` (wrapped in try/catch), else the first hatched turkey. `useFlock` is the only client fetcher of `/api/turkeys`.

- [ ] **Step 1: Implement `useFlock`.**
- [ ] **Step 2: Implement `/hatch`.** It has three states:
  - **(a) Pick an egg:** shown when the user has zero turkeys. A grid of the six skills (label, one-line blurb, tinted egg). Choosing one calls `POST /api/turkeys`.
  - **(b) Tap to hatch:** for the oldest unhatched turkey. Tapping makes the egg wobble, and 5 taps crack it, using `TurkeyCharacter stage={1}` and a crack overlay.
  - **(c) Name it:** an input of 1–20 chars, default "Gobbles", then `POST /api/turkeys/[id]/hatch`, select the new turkey, and `router.push("/home")`. Show the API's error text inline on 400.

  If the user has turkeys and none are unhatched, redirect to `/home`.
- [ ] **Step 3: Verify.** On the separate DB, use a seed user with no turkeys. Visiting `/home` sends them to `/hatch` (after Task 7). Pick, hatch, and name the turkey, and it lands on Home with that turkey. Visit `/hatch` again and you're redirected to `/home`.
- [ ] **Step 4: Commit** with `feat(flock): egg picker and hatching flow`.

---

### Task 7: Home (`/home`)

**Files:**
- Create: `src/app/(app)/home/page.tsx`, `src/components/turkey/{NeedBars,FlockSwitcher,SkillTrend}.tsx`

**Interfaces:**
- Consumes: `useFlock`, `TurkeyCharacter`, `GET /api/turkeys/[id]` (for the trend), `getTurkeySkill`.
- Produces: activity links that later tasks rely on.
  - Park → `/chat?turkeyId=<id>`
  - Feed → `/skills/<moduleKey>?turkeyId=<id>`, or `/skills?turkeyId=<id>` when `moduleKey` is null
  - School → `/school/<id>`

- [ ] **Step 1: Implement.**
  - **No turkeys, or an unhatched egg pending:** `router.replace("/hatch")`.
  - **Layout:** `FlockSwitcher` (horizontal row of small `TurkeyCharacter`s with names; tapping calls `select`) on top. Then a large `TurkeyCharacter` (tap → `reaction="pet"`) with the name, stage name, and skill label.
  - **Needs and mood:** `NeedBars` shows three labeled bars, Hunger · Feed, Lonely · Park, and Sad · School, each showing *fullness*. Below them, a one-line mood message, e.g. sad → "Gobbles missed you." Never mention death or loss.
  - **Activity buttons:** School / Park / Feed, with the matching low-need button emphasized.
  - **`SkillTrend`:** a recharts sparkline of `trend.points` plus "Up 1.2 from earlier" or "Do a few activities to see your trend" when `delta` is null.
- [ ] **Step 2: Verify.**
  - At 375px and desktop, needs and mood match the turkey. Hand-edit `lastFedAt` to 3 days ago on the separate DB → hunger 0, mood hungry, and the Feed button emphasized.
  - With two turkeys, switching persists across reload.
- [ ] **Step 3: Commit** with `feat(flock): home screen with needs, flock switcher and skill trend`.

---

### Task 8: School stand-in, and Park/Feed carrying the turkey

**Files:**
- Create: `src/lib/flock/schoolScripts.ts` (+ `schoolScripts.test.ts`), `src/app/(app)/school/[turkeyId]/page.tsx`
- Modify: `src/app/(app)/chat/page.tsx`, `src/app/(app)/chat/[id]/page.tsx`, `src/app/(app)/skills/page.tsx`, `src/app/(app)/skills/[key]/page.tsx`

**Interfaces:**
- Produces: `SCHOOL_SCRIPTS: Record<TurkeySkillKey, { ask: string; chips: string[]; reply: string }[]>`, with exactly 3 steps per skill (mockup `SCHOOL_SCRIPT` shape). The turkey asks a curious question about its skill, offers 2–3 suggested-answer chips, and replies with what it learned.

- [ ] **Step 1: Failing test.** Every `TurkeySkillKey` has exactly 3 steps, and every step has a non-empty `ask` and `reply` and ≥ 2 chips each ≥ 10 chars (so chips pass the server's length check). Run `npm test`. Expected: FAIL.
- [ ] **Step 2: Write the scripts** for all six skills. Plain, warm, short (≤ 2 sentences per line); the turkey speaks in the first person as a curious young turkey. Run `npm test`. Expected: PASS.
- [ ] **Step 3: School page.** A chat like the mockup's `startSchool/askSchool/sendSchool`: `TurkeyCharacter` at top with `reaction="listen"` while you answer, 3 progress dots, chips plus a free-text input. After 3 answers, `POST /api/turkeys/[id]/school`, show "+N feathers" (or "Lesson done. No feathers for more lessons today, but {name} loved it." when 0), then return to `/home`.
- [ ] **Step 4: Park wiring.**
  - The `/chat` setup page reads `turkeyId` from search params and includes it in the `POST /api/debates` body. Retitle the page "Park" with copy like "Who will {name} talk to today?". The current turkey's name comes from `useFlock`.
  - The `/chat/[id]` page's finish screen gets a "Back to {name}" button → `/home`, replacing any dashboard link. Remove `LevelUpModal` usage.
  - Remove the XP/level parts of `ScoreSummary`.
  - When the user ends with < 3 messages, show "Talk a little longer next time so it counts for {name}."
- [ ] **Step 5: Feed wiring.** `/skills/[key]` reads `turkeyId` and sends it in the start POST body. On completion it shows "Back to {name}" → `/home`. `/skills` (the picker shown for Self-Interrogation turkeys) forwards `turkeyId` on each module link.
- [ ] **Step 6: Verify end to end** on the separate DB. From Home:
  - School: 3 answers → sadness 100.
  - Park: 3+ messages → loneliness 100.
  - Feed: complete a module → hunger 100.
  - `activityCount` is 3 and the trend shows 2 points (park + feed).
- [ ] **Step 7: Commit** with `feat(flock): school stand-in and turkey-aware park and feed`.

---

### Task 9: Shop eggs, and removing the old app

**Files:**
- Modify: `src/app/(app)/shop/page.tsx`, `src/app/api/shop/route.ts` (if it returns `level`), `src/lib/shop.ts`, `src/components/layout/{navItems.ts,BottomNav.tsx,SideNav.tsx,TopAppBar.tsx,useUserSummary.ts}`, `src/app/api/user/route.ts`, `src/app/(app)/profile/page.tsx`, `src/middleware.ts`, `src/app/page.tsx`, `src/app/onboarding/survey/page.tsx`
- Delete: `src/app/(app)/dashboard/`, `src/app/(app)/leaderboard/`, `src/app/api/leaderboard/`, `src/components/gamification/{XPBar,LevelUpModal,BadgeMark}.tsx`, `src/components/dashboard/`, `src/components/leaderboard/`

**Interfaces:**
- Consumes: `useFlock`, `POST /api/turkeys/eggs`, `EGG_COST`, `TURKEY_SKILLS`.

- [ ] **Step 1: Shop.**
  - Add an "Eggs" section listing the skills the user doesn't own: tinted egg, label, `EGG_COST` feathers, and Buy → `POST /api/turkeys/eggs`. On success, `router.push("/hatch")`. Show the 402/409 messages inline.
  - The avatar preview uses `TurkeyCharacter` with the current turkey's stage, mood, and skill instead of `data.level`.
  - Remove the `unlockAt` gate: delete the field from `ShopItem` and the two catalog entries' `unlockAt: 6`, and delete the shop page's lock UI. *Planner's call per spec.*
  - Equipped items stay per user, so all turkeys wear the same outfit. *Planner's call.*
- [ ] **Step 2: Nav.**
  - `PRIMARY_NAV` = Home (`/home`, matches `/home`, `/hatch`, `/school`, `/chat`, `/skills`), Shop, and You (`/profile`). Delete `SECONDARY_NAV` and its uses.
  - `UserSummary` drops `level`/`levelName`, and `TopAppBar`/`SideNav` stop showing them.
  - `/api/user` stops returning `levelInfo`, badges, and debate history fields only if nothing else reads them. Grep first.
- [ ] **Step 3: Routes and redirects.**
  - The landing page and onboarding survey go to `/home` instead of `/dashboard`.
  - Middleware matcher: replace `/dashboard` and `/leaderboard` with `/home`, `/hatch`, and `/school`.
  - Add `redirects()` in `next.config.js` for `/dashboard` → `/home` and `/leaderboard` → `/home` (old bookmarks / PWA start URL).
  - Update the landing page copy (`PROMISES`, hero) to the flock pitch: hatch a turkey, take care of it, and grow your skills along the way.
- [ ] **Step 4: Profile.** Remove badges, XP, and level. Keep username, join date, feathers, and sign-out. Add a "Your flock" list (each turkey's name, skill, and stage).
- [ ] **Step 5: Delete** the files listed above, then `grep -rn "dashboard\|leaderboard\|XPBar\|LevelUpModal\|BadgeMark\|levelName" src`. Expected: no hits outside comments. `src/lib/gamification.ts` stays because `api/chat` still uses `calculateXP`/`calculateFeathers`.
- [ ] **Step 6: Verify.**
  - Run `npx tsc --noEmit && npm run lint && npm test && npx next build` (not `npm run build`, which pushes the schema). Expected: all succeed.
  - Click through on the separate DB: an existing seed user keeps their feathers and items, lands on `/hatch`, then Home.
  - Buy a second egg in the shop and hatch it; the switcher shows both turkeys.
  - `/dashboard` redirects to Home.
- [ ] **Step 7: Commit** with `feat(flock): eggs in shop; remove dashboard, leaderboard, badges and XP UI`.
