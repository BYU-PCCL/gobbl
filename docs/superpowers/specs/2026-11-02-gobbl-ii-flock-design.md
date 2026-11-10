# Gobbl II — Raise Your Flock (Design)

Date: 2026-11-02
Branch: `gamafied_rich`
Reference mockup: `../gobbl_II_mockup/index.html` (plus its `plan.md`) — a scripted, single-file prototype of the hatch → School / Park / Feed → Shop loop.

## Intent

Gobbl becomes a pet-raising app in the style of Finch or a Tamagotchi. You hatch a turkey and take care of it, and caring for it is how you practice civil-discourse skills.

- **Spending time with your turkey should feel good**, and you should be able to tell that your own skills are improving while you do it.
- **What brings you back is that your turkey needs you.** It gets hungry, lonely, and sad when you're away. It never dies.

This replaces the current "debate arena + dashboard + XP level" framing entirely.

## The whole update (four projects, in order)

| # | Project | What it does | Fills need |
|---|---------|--------------|------------|
| 1 | **Flock core** (this document's detailed scope) | Eggs, hatching, turkeys with needs and growth stages, home screen, flock switching, eggs in the shop, removal of old screens | — |
| 2 | **Park** | The existing persona conversations, rebuilt as your turkey meeting other turkeys at the park and asking them about their day | Loneliness |
| 3 | **Feed** | The existing skill modules, reworked into feeding: read short passages, answer questions (3 per feeding in the mockup) | Hunger |
| 4 | **School** | New mode: the turkey is an LLM that asks you questions while you teach it its skill (3 back-and-forths per lesson in the mockup) | Sadness |

Project 1 is specified in full below. Projects 2–4 have sections recording what's already decided and what's still open. Each gets its own design pass to settle the open questions before it's built. Project 1 wires simple stand-ins for them so the care loop works end to end.

## Decided by the product owner

- **Each egg/turkey is tied to one skill.** The skills are the six already in `src/lib/modules/types.ts` (`ModuleSkillKey`): Participation, Self-Expression, Reason-Giving, Listening, Self-Interrogation, Cognitive Dissonance.
- **A user can raise several turkeys at once.**
- **Additional eggs are bought with feathers** in the shop. This rule is expected to change, so price and rule must be easy to adjust (a constant, not scattered logic).
- **Neglect:** when you stay away, the turkey becomes hungry, lonely, and sad. **It never dies.**
- **Removed from the app:** the debate arena setup, dashboard, leaderboard ("The Flock" page), badges, and the single per-user XP level.
- **Existing users** keep their feathers and owned/equipped shop items, and start fresh with an egg.
- **Look:** Gobbl's existing color palette and general "harvest" style, but with a more 3D-looking, interactive turkey that feels like a Finch character.
- **Turkey art is a placeholder.** Someone else will make the final design, so the turkey must sit behind one swappable component.
- **Database: additive changes only.** This is one branch among several that share the database. No renames, drops, or type changes on existing tables/columns. Old tables (`Debate`, `UserBadge`, XP/level columns, etc.) stay as they are even though their screens go away.

## Project 1: Flock core — detailed scope

### First run and hatching
1. A user with no turkey (new, or a returning tester) lands on egg selection. They pick one egg, which picks the skill. The first egg is free.
2. They tap the egg to hatch it (the mockup uses a few taps with a cracking animation), then name the turkey.
3. Returning users keep `featherBalance` and their `UserInventory` items and equipped cosmetics, and those items show on their new turkey.

### A turkey
Each turkey has:
- owner, **skill**, **name**, created/hatched time
- **growth stage**: a turkey grows by completing activities, like the mockup's `STAGES` keyed on task count (*builder's call on the exact thresholds*). The existing eight level names (Egg → Thunderbird in `src/lib/gamification.ts`) can be reused as stage names.
- three **needs**: hunger, loneliness, sadness. Each drains slowly over real time and is refilled by its matching activity (Feed → hunger, Park → loneliness, School → sadness).

Needs:
- Drain is computed from timestamps (e.g. store "last fed/visited/taught at" and derive the current value), not by a background job. *Builder's call on exact formula.*
- Starting suggestion (my call, tunable): full → low over about **3 days**. Keep the rates in one config.
- Needs never reach a "dead" or failed state. At worst the turkey looks droopy and greets you with something like "I missed you".
- The turkey's mood/expression reflects its needs.

### Home screen
- The current turkey, large and center, idling, with its needs visible at a glance.
- Buttons for **School**, **Park**, **Feed**, and the **Shop**.
- A way to switch between turkeys in your flock.
- Feather balance visible.

### Activities in project 1 (stand-ins)
These are the product owner's approved stand-ins until projects 2–4:
- **Park** → opens the existing conversation setup screen (`/chat`: topic, difficulty, partner) as Park's front door, lightly re-skinned. It stays reachable only through Park, not as its own nav destination. Completing a conversation refills the turkey's loneliness. *(My call; project 2 replaces it.)*
- **What counts as completed (my call):** a conversation only refills loneliness, earns turkey feathers, and counts toward growth if the user sent **at least 3 messages**. Today, "Wrap up" with zero messages still pays out through `finishDebate`, which would let people farm.
- **Feed** → opens the existing skill module for the turkey's skill (`/skills/[key]`). Completing one refills hunger. Self-Interrogation has no module yet (`registry.ts` has five), so a Self-Interrogation turkey lets you pick any module until project 3. *(My call.)*
- **School** → a simple scripted lesson like the mockup's `SCHOOL_SCRIPT`, with **a short script for each of the six skills**. Completing it refills sadness. *(My call.)*
- Every completed activity earns feathers and counts toward the turkey's growth.
- Activities are always done *for a specific turkey* (the one selected on Home).

### Per-turkey skill trend (product owner: in scope for project 1)
The dashboard and XP go away, so this is where people see that *they* are improving.
- Each turkey shows a simple trend of the user's skill over its recent activities, e.g. a small sparkline or "last 5 vs first 5" on Home or a turkey detail view.
- Source data: the civility scores the app already produces. That means `Message.civilityScore` / `Debate.overallScore` for Park conversations, and `SkillSession` pre/post civility for Feed modules. Where per-dimension scores exist, prefer the dimension matching the turkey's skill.
- Requires linking each activity to the turkey it was done for. *My call:* a new `TurkeyActivity` table (turkeyId, kind, reference id such as debateId/skillSessionId, score snapshot, feathers, createdAt). That leaves existing tables untouched, and the same table drives needs refill and growth counts.
- School has no score in project 1 and doesn't contribute to the trend.

### Shop
- Keeps the existing catalog, purchase and equip flow (`src/lib/shop.ts`, `/api/shop/*`).
- Adds **eggs** for sale (one per skill), priced from a single constant.
- `ShopItem.unlockAt` currently gates on user level, which is going away. *Builder's call:* drop the gate, or re-key it to something else.
- *Builder's call:* whether equipped items are per user (as today) or per turkey.

### The turkey character (placeholder)
- Soft, rounded, shaded, plush-looking, Finch-style, in Gobbl's palette. A shaded, animated 2D drawing (SVG/CSS), **not** a true 3D engine, so it runs smoothly on phones and existing shop items can keep layering on top (`ItemLayers`, `avatarAnchors`).
- Idles (bobs, blinks), reacts to taps/petting, and shows mood from its needs.
- Visibly different by growth stage (egg → grown), and preferably tinted by skill.
- **One component with a clear props contract** (stage, mood, skill, equipped items, current reaction) so the artist's final design replaces it without changes elsewhere.

### Removed from the UI
- Dashboard, debate arena setup screen as a destination, leaderboard, badges, XP bar and level-up UI, per-user level display.
- Navigation (`src/components/layout/navItems.ts`) is rebuilt around Home / Shop / Profile (*builder's call on exact tabs*).
- The underlying code can be deleted or left unused. The database tables stay.

## Project 2: Park (loneliness)

**Purpose:** your turkey socializes. You walk into a park, pick a turkey to talk to, and have an easy political conversation as your turkey.

**Decided (product owner, 2026-11-06):**
- The Park tab opens a park scene like the mockup's: a few turkeys standing around, each with a name. Tap one to talk.
- **No checkmarks.** You can talk to the same turkey as many times as you like.
- **Conversations are easy political ones for now.** The type of conversation may change later (e.g. "tell me about your day").
- **The park turkey brings up a topic on its own.** There is no topic, difficulty or partner picker.
- **A visit ends with "Wrap up"**, like today's conversations, and counts (loneliness refill, feathers, growth) once you've sent at least 3 messages. There is no "must be a question" rule.
- After wrapping up you see the usual civility results and a way back to your turkey.

**Designer's calls (approved in chat):**
- The park turkeys are the five easy ("Friendly Cluck") personas in `src/lib/personas/pool.ts`, given names and looks in `src/lib/flock/parkTurkeys.ts` (Amos, Ruthie, Tobias, Juniper, Clem). Their `look` borrows a skill tint only so placeholders are distinguishable.
- Each visit picks a random topic from `src/lib/topics.ts`; the persona's beliefs shape what it says.
- Park turkeys may share the user's views (all five are always there); the old "always the opposing side" pairing does not apply in the park.
- The conversation screen shows your turkey and theirs facing each other above the chat.

**Implementation:** `POST /api/park/visit { personaId, turkeyId }` starts the conversation (`createDebate` with `parkPersonaId`) and links it to the turkey; the park scene is `src/app/(app)/chat/page.tsx`.

**Still open:** whether park turkeys remember you between visits; harder (grumpier) turkeys later; the non-political conversation type.

## Project 3: Feed (hunger)

**Purpose:** feeding your turkey is short reading practice. You read brief passages about the skill and answer questions.

**Known so far:**
- Replaces today's skill modules (`src/lib/modules/registry.ts`, `/skills`, `/api/modules/*`). No research study depends on the current module flow, so it may be reshaped freely.
- A feeding is **3 questions** (mockup `plan.md`). Completing it refills hunger, earns feathers, and counts toward growth.
- Content is tied to the turkey's skill. All six skills need feeding content, including Self-Interrogation, which has no module today.
- Reference: mockup `startFeed` / `showFeedQ` / `answerFeed` (a passage, a multiple-choice question, a food item flies to the turkey on a correct answer).

**Open:**
- What happens to the existing module pieces (self-check, practice chat, reflection): dropped, moved into Park/School, or kept as occasional "big meals".
- Passages: hand-written content vs. LLM-generated, and how much of it is needed so feeding stays fresh day to day.
- What a wrong answer does (retry, explanation, smaller refill).
- Whether feeding produces a score for the skill trend.

## Project 4: School (sadness)

**Purpose:** you teach your turkey its skill. Explaining it is how you learn it.

**Decided (product owner, 2026-11-06):**
- The turkey is an LLM playing a **curious student**; you are the **teacher**. It asks **simple questions** about its skill.
- When your answer is vague or a bit off, the turkey **asks a follow-up question to understand better** rather than correcting you.
- A lesson stays at **3 back-and-forths** for now (`SCHOOL_ROUNDS` in `src/lib/flock/config.ts`; may change). After the third answer the turkey says what it learned, and the lesson counts (Cheer refill, feathers with the daily cap, growth).

**Designer's calls (approved in chat):**
- No suggested-answer chips; you explain in your own words (10-character minimum stays).
- Each lesson stands alone; the turkey doesn't remember earlier lessons.
- Lessons produce no score; the skill trend stays based on Park and Feed.
- Same model as the rest of the app (Grok); short, simple sentences.
- If the AI can't be reached, the turkey "is feeling sleepy" with a Try again button; there is no scripted fallback.

**Implementation:** prompt + history validation in `src/lib/flock/school.ts`; `POST /api/turkeys/[id]/school/turn { history }` returns the turkey's next line (`done: true` with its closing words); `POST /api/turkeys/[id]/school { answers }` still records the lesson. The project-1 script (`schoolScripts.ts`) is removed.

**Still open:** turkey personality by growth stage; remembering past lessons; scoring lessons for the trend.

## Constraints

- Existing stack: Next.js app router, Prisma + Supabase Postgres, NextAuth, Tailwind, Grok via `src/lib/ai.ts`.
- **Additive-only DB changes:** new tables (e.g. `Turkey`) and new nullable/defaulted columns only.
- **Shared DB risk:** every deploy runs `prisma db push`. A deploy from another branch that doesn't know our new tables may try to drop them. That deploy fails if the tables have rows and silently drops them if they're empty. **Decision (product owner): this branch stays off the shared database until it's merged.** Develop and test against a separate database (local Postgres or a separate Supabase project). Don't deploy this branch to an environment pointed at the shared DB.
- **No research study currently depends on the module or debate flows** (product owner). Feed and Park may reshape those flows to fit the care loop.
- Mobile-first PWA (already set up via `src/app/manifest.ts`).

## Calls made by the designer (not the product owner)
Check these while reading:
- Park reuses the existing setup screen as its front door.
- A conversation must have ≥3 user messages to count.
- Self-Interrogation turkeys feed from any module until project 3.
- One School script per skill.
- `TurkeyActivity` table links activities to turkeys.
- Needs drain full → low over ~3 days.
- Shaded 2D/SVG turkey, not a real 3D model.

## Non-goals (project 1)
- The real Park, Feed, and School experiences (projects 2–4).
- Final turkey art.
- Social features, leaderboards, or comparing with other users.

## Anti-goals
- Guilt-tripping or punishing absence: no death, no lost turkeys, no lost feathers.
- Breaking other branches' prototypes through destructive schema changes.
- Hard-wiring the placeholder turkey art throughout the app.

## Left to the builder
Marked *builder's call* above. Also: route structure, API shape, animation library, exact feather rewards per activity, and empty or loading states.
