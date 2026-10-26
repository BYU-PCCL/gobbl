# Gobbl → native iOS app (SwiftUI) — implementation plan

## Context

Branch `gobbl-swift-port` (currently identical to `main`) exists to ship Gobbl on the Apple App Store with full feature parity. Decisions made with the user on 2026-10-26:

- **Stack: SwiftUI, Swift 5.10+, iOS 17 minimum, zero third-party dependencies.** Apple does not require Swift, but the user has a Mac, an iPhone, and a paid Developer account and wants the most solid long-term foundation. Android is "maybe later", so the API stays client-agnostic.
- **Monorepo:** the Xcode project lives at `mobile/ios/`. The Next.js app stays live on Vercel and becomes the API server for iOS. **All backend changes must be backward-compatible with the web client.**
- **Where work happens:** backend changes on this Windows machine (testable with curl + web smoke test). iOS code is developed on the Mac (clone repo, run Claude Code there) so every step compiles in Xcode. Nothing on Windows can build Swift.
- **Delegation rule (user request):** route mechanical, well-specified tasks to Sonnet/Haiku subagents; keep architecture, auth, chat state machine, and review on the main model. Each task below is tagged **D** (delegate cheap) or **M** (main model).

### What the codebase already gives us (verified)
- 11 screens, all `"use client"`, all plain `fetch` → `useState`. No server actions, no server-side page data fetching, no streaming. Every screen is backed by an existing `/api/*` route returning whole JSON with `{error}` on failure.
- Auth: NextAuth v4 credentials only (`src/lib/auth.ts`), JWT strategy (JWE cookie, 30 days, `NEXTAUTH_SECRET`). 14 route files call `getServerSession(authOptions)`; none accept a bearer token.
- Feathers are earn-only virtual currency spent on 25 cosmetics (`src/lib/shop.ts`). No real-money path → **no In-App Purchase needed.** Keep it that way.
- Avatars: 8 turkey stages (`src/components/gamification/FlatTurkey.tsx`) + 27 items (`ItemLayers.tsx`) are inline SVG in a `0 0 200 200` viewBox, flat primitives only. `palette` prop is never overridden by any caller. Only 3 backgrounds (sunset, cosmic, grid) use `<defs>` (gradient/pattern). Items are positioned by `translate(x y)` from `src/lib/avatarAnchors.ts`. Layer order is in `AvatarWithItems.tsx`.
- Prisma cascades: only `UserInventory` has `onDelete: Cascade`. Debate, Message, UserBadge, SkillSession, PersonaRating do not.
- `src/middleware.ts` matcher covers only signed-in page routes (dashboard, chat, skills, shop, profile, leaderboard, onboarding). It never touches `/api/*`, and new public pages need no change.
- Rules enforced only in the browser today (must move server-side so both clients agree and iOS can't bypass): 8-turn limit (`chat/[id]/page.tsx`), daily topic computed on device and `isDaily` trusted with no once-per-day check, shop `unlockAt` never checked, daily-bonus copy says "+50 feathers · +120 XP" in `chat/page.tsx:176` and `DailyChallenge.tsx:68` while `gamification.ts` awards 30 feathers / 25 XP.

---

## Part A — Backend (TypeScript, Windows, Phase 0)

### A1. Bearer-token auth for mobile — **M**
Reuse NextAuth's own JWT via `encode`/`decode` from `next-auth/jwt` with `NEXTAUTH_SECRET`. One secret, one claims shape (`{id, name, onboardingCompletedAt}`), no new dependency. Single 30-day token (matches web cookie posture); no refresh table. Account deletion / missing user already yields 401/404 = de facto revocation.

New files:
- `src/lib/credentials.ts` — `verifyCredentials(username, password)` (bcrypt compare, extracted from `auth.ts` `authorize`) and `validateRegistration(username, password)` (rules copied verbatim from `src/app/api/register/route.ts`). `auth.ts` and `register/route.ts` call these so there is one code path.
- `src/lib/mobileToken.ts` — `issueMobileToken(user)` → `encode({token, secret, maxAge: 30d})`; `verifyMobileToken(raw)` → `decode` wrapped in try/catch → `JWT | null`.
- `src/lib/session.ts` — `getSessionUser(req: Request): Promise<{id: string} | null>`: if `Authorization: Bearer` present, verify it (invalid bearer → null, **do not** fall through to cookie); else `getServerSession(authOptions)`. Plus `unauthorized()` helper returning the existing `{error:"Unauthorized"}` 401.
- `src/app/api/mobile/auth/login/route.ts` — `POST {username,password}` → `{accessToken, expiresAt, user:{id,username,onboardingCompletedAt}}`; 401 on bad creds.
- `src/app/api/mobile/auth/register/route.ts` — same validation as `/api/register`, creates user, returns the login shape (saves the web's extra round-trip); 409 on duplicate.

Mechanical sweep — **D**: in the 14 routes (`chat`, `debates`, `debates/[id]/analyze`, `leaderboard`, `modules`, `modules/[key]/{start,advance,complete}`, `onboarding/survey`, `personas/preview`, `shop`, `shop/{purchase,equip}`, `user`) replace `getServerSession(authOptions)` + `session.user.id` with `getSessionUser(req)` + `u.id`; add `req: Request` to handlers that lack it. Verify: `rg getServerSession src/app/api` returns nothing; `tsc --noEmit` clean.

### A2. Account deletion (Apple 5.1.1(v)) — **D** (order specified)
`DELETE /api/user` in `src/app/api/user/route.ts`, body `{confirm:"DELETE"}`. One `prisma.$transaction` in this order (no cascades exist): personaRating → message (`where: {debate: {userId}}`) → debate → skillSession → userBadge → userInventory → user. Return 204, idempotent. Also add a "Delete account" button to web `profile/page.tsx` (calls DELETE then `signOut`).

### A3. Server-side enforcement + config endpoint
- **Turn limit — D:** `export const MAX_TURNS = 8` and `MAX_MESSAGE_CHARS = 500` in `src/lib/gamification.ts`; `chat/[id]/page.tsx` and `ChatInterface.tsx` import them. In `/api/chat` before the Grok call: count `message` rows with `role:"user"` for the debate; if `>= MAX_TURNS` → 409 `{error, code:"MAX_TURNS"}`; message longer than 500 → 400. `finish:true` always allowed.
- **Daily — M:** new `src/lib/daily.ts` with `getDailyTopicForDate(date)` (same day-of-year mod N as `topics.ts getDailyTopic`, UTC) and `utcDayBounds(date)`. In `POST /api/debates` when `isDaily`: override topic/category with server's daily topic; if a daily debate with `createdAt` in today's UTC bounds exists → return it if incomplete (200), else 409 `{code:"DAILY_DONE"}`. Web dashboard/setup switch to the server's daily topic via `/api/config`. Decision: UTC day boundary.
- **Shop unlock — D:** `shop/purchase` checks `user.level >= item.unlockAt` → 403 `{code:"LOCKED"}`.
- **Copy fix — D:** replace hard-coded "+50 feathers · +120 XP" (`chat/page.tsx:176`, `DailyChallenge.tsx:68`) with values derived from `DAILY_BONUS_FEATHERS = 30` / `DAILY_BONUS_XP = 25` constants exported from `gamification.ts` (server is the source of truth).
- **`GET /api/config` — M:** public, `Cache-Control: public, s-maxage=300, stale-while-revalidate=3600`. Assembled from existing `src/lib` modules (no data duplication): `{configVersion, minClientVersion:{ios}, maxTurns, maxMessageChars, dailyBonusFeathers, dailyBonusXp, today:{date, dailyTopic}, topics, difficulties, levels, badges, shopCatalog, avatarAnchors, survey:{questions}, ideologyOptions, civility:{dimensions}}`. Module step content is **not** in config: `start`/`advance` already return one `step` at a time; define a `StepDTO` union (`diagnostic|content|practice|reflection`) in `src/lib/modules/types.ts` and confirm the serialized step is self-describing (read `skills/[key]/page.tsx` for any field computed client-side from the registry and move it into the DTO).
- `GET /api/user` adds `onboardingCompletedAt: string|null` (additive; web ignores it). iOS gates onboarding on this field since the API never enforces it.

### A4. Hygiene — **D**
- `GET /api/debates?id=` returns a DTO (`toDebateDTO` in `src/lib/dto.ts`) that drops `systemPrompt`, `newsStoryContent`, `trainingSkillScores`; check what `chat/[id]/page.tsx` reads first. Messages: `{id, role, content, civilityScore, dimensions (parsed), createdAt}`.
- `export const maxDuration = 60` on `chat`, `debates` (POST), `debates/[id]/analyze`, `modules/[key]/advance`.
- Error contract: keep `{error}`, add optional `code` (`MAX_TURNS`, `DAILY_DONE`, `LOCKED`, `ALREADY_COMPLETED`). Rule going forward: additive-only changes; breaking changes go under `/api/v2`.

### A5. Legal pages — **D** (copy from user)
`src/app/privacy/page.tsx`, `src/app/support/page.tsx` (server components, public; middleware needs no change). Privacy must disclose: username + password hash, debate text and scores, **debate text sent to xAI for generation/scoring**, retention, in-app deletion, no tracking/ads, contact email.

### A6. Contract + fixtures — **D**
`docs/api.md` documenting every endpoint with request/response samples (doubles as the future Android contract). `scripts/capture-fixtures.sh` (curl with a bearer token against a dev server) writes JSON into `mobile/ios/GobblTests/Fixtures/` so Swift decoding tests can be written against real payloads.

No Prisma schema changes are needed in Part A.

---

## Part B — iOS app (`mobile/ios`, Mac)

### B1. Project skeleton — **M**
Pure Xcode project, single app target + test target, Xcode 16 synchronized folders (no `.pbxproj` edits when adding files, which matters for delegated models).

```
mobile/ios/
  Gobbl.xcodeproj
  Config/{Shared,Debug,Release}.xcconfig       # API_BASE_URL = https:/$()/host  ($() escapes the // comment)
  Gobbl/
    App/            GobblApp, RootView (switches on auth state → Landing | Survey | MainTabView), AppEnvironment
    Core/Networking APIClient, Endpoint<Response>, APIError, JSONCoding (ISO8601 ± fractional seconds)
    Core/Auth       KeychainStore (kSecAttrAccessibleAfterFirstUnlock), AuthStore (@Observable)
    Core/Models     one Codable struct per API response; enums get an `unknown` fallback case
    Core/Storage    ConfigStore (fetch /api/config, cache to disk), LevelTracker (UserDefaults "lastLevel.<userId>")
    DesignSystem/   Colors (asset catalog, light+dark from globals.css), Typography (bundled OFL fonts), Spacing/Radius(14), Components/{GButton,GCard,GChip,GBadge,GTextField,GIcon}
    Features/       Landing, Onboarding, Dashboard, DebateSetup, Chat, Results, Skills, ModuleRunner, Shop, Profile, Leaderboard, Avatar
    Resources/      Assets.xcassets (Avatars/, AppIcon), Fonts/, PrivacyInfo.xcprivacy
  GobblTests/       decoding tests against Fixtures/, view-model tests
  README.md         xcodebuild/simctl commands, setup, avatar regeneration
```

Key signatures:
```swift
struct Endpoint<Response: Decodable> { path, method, query, body: Encodable?, requiresAuth }
struct APIClient { baseURL; tokenProvider; onUnauthorized; func send<T>(_ e: Endpoint<T>) async throws -> T }
enum APIError: Error { unauthorized, notFound, conflict(code: String?, message: String), server(Int, String), decoding, transport }
@Observable final class AuthStore { enum State { loading, signedOut(reason: SignOutReason?), signedIn(UserSummary) } ... }
```
Navigation: `TabView` with 5 tabs mirroring `navItems.ts` (Home, Debate, Skills, Shop, You), each in its own `NavigationStack`; Leaderboard pushed from Profile. Client sends `X-Gobbl-Client: ios/<version>`.

### B2. Avatars — **M** for script/audit, **D** for the SwiftUI view
- `scripts/export-avatars.tsx` (run with `npx tsx` on Windows; output committed): `renderToStaticMarkup` of `<FlatTurkey stage={n} size={200}/>` for stages 1–8 and `<svg viewBox="0 0 200 200"><Render/></svg>` for each `ITEM_RENDERERS` entry **except** `sunset`, `cosmic`, `grid`. Strip `class`/`aria-*`/`role`, add `xmlns`. Write straight into `Assets.xcassets/Avatars/<name>.imageset/{<name>.svg, Contents.json}` with `"preserves-vector-representation": true`. Script asserts no `<defs|<filter|<mask|<pattern|<clipPath|<style` in output. Add `npm run export:avatars`.
- The 3 gradient/pattern backgrounds are hand-written SwiftUI (`LinearGradient`, `RadialGradient`, dot `Canvas`) — a few lines each.
- `AvatarView(stage:equipped:size:animate:showShadow:)` mirrors `AvatarWithItems.tsx` order: background (clipped `RoundedRectangle(cornerRadius: size*0.32)`), ground shadow ellipse, cape, turkey, hat, face, neck, chest. Item offset = `anchor * size/200`, anchors from `config.avatarAnchors`. Float (stage ≥5) / wiggle (stage ≥7) via SwiftUI animation; respect Reduce Motion. `ItemPreview(itemId:)` replaces `ItemProductShot`.

### B3. Design system — **D** (spec = `globals.css`, `tailwind.config.ts`, `src/components/ui/*`)
Color sets with light + dark (iOS users expect dark mode; the `.dark` vars already exist). Fonts: Bricolage Grotesque, DM Sans, JetBrains Mono (OFL) bundled as `.ttf`, `UIAppFonts` in Info.plist, `Font.custom(_, size:, relativeTo:)` for Dynamic Type. Port `XPBar`, `BadgeMark`, `LevelUpModal`. `GIcon` maps `Icon.tsx` names to SF Symbols (export any custom glyph as SVG).

### B4. Screens (web file → SwiftUI; endpoints)
Each feature: `@Observable` ViewModel with `Loadable<T>` state and retry.
1. **Landing/Login/Register** (`page.tsx`) — `POST /api/mobile/auth/{login,register}`. **D**
2. **Survey** (`onboarding/survey/page.tsx`) — questions from config; `POST /api/onboarding/survey`; 409 = already done; presented as non-dismissable cover when `onboardingCompletedAt == nil`. **D**
3. **Dashboard** (`dashboard/page.tsx`) — `GET /api/user`; stats, XPBar, daily card (config daily topic + `dailyCompleted`), avatar, recent debates. LevelUpModal via `LevelTracker` (web uses `sessionStorage gobbl:lastLevel`). **D**
4. **Debate setup** (`chat/page.tsx`) — topics/difficulties from config; `GET /api/personas/preview?tier=`; profanity toggle only for Full Gobble; `POST /api/debates` is a 5–20 s blocking Grok call → full-screen "pairing" state, 60 s timeout; handle `DAILY_DONE` by resuming. **D**
5. **Chat** (`chat/[id]/page.tsx`, `ChatInterface.tsx`) — `GET /api/debates?id=` on resume; `POST /api/chat` per turn with typing indicator; 500-char counter; wrap-up from turn 2; `MAX_TURNS` → finish; failed send restores draft; finished state = read-only transcript + Analyze (`POST /api/debates/[id]/analyze`). **M**
6. **Results** (`ScoreSummary.tsx`) — finish payload: score, dimensions, xp/feathers ledgers, streak, new badges, level-up; invalidates cached user. **D**
7. **Skills list** (`skills/page.tsx`) — `GET /api/modules`; start/resume/advanced variant. **D**
8. **Module runner** (`skills/[key]/page.tsx`) — `start` → `advance {sessionId, stepId, answer?, action?}` → `complete`; four step views; practice step embeds `ChatView(embedded:)` and on finish calls `advance` with the finish action; resume via `start.resumed`. `StepDTO`/answer enum design **M**, step views **D**.
9. **Shop** (`shop/page.tsx`) — `GET /api/shop`, `POST purchase`, `PATCH equip`; slot filter chips, live avatar preview, optimistic equip with rollback, `LOCKED` state. **D**
10. **Profile** (`profile/page.tsx`) — evolution grid, badges, link to Leaderboard, Privacy/Support links, Sign out, **Delete account** (destructive alert → `DELETE /api/user` → wipe Keychain/UserDefaults → Landing). **D**
11. **Leaderboard** (`leaderboard/page.tsx`) — `GET /api/leaderboard?sort=` with segmented control, current user highlighted. **D**

Plus one Apple-mandated screen: **one-time consent before the first debate** that debate text is sent to a third-party AI (xAI) — App Review guideline 5.1.2(i). **D**

### B5. Stale session — **M**
`APIClient` maps 401 → `onUnauthorized` → `AuthStore.signOut(.sessionExpired)`. 404 from `GET /api/user` only (mirrors `useUserSummary.ts`) → `.accountMissing`. Transport errors never sign out; they show retry. Cold launch with a token: splash while `/api/user` validates; offline → retry screen, not login.

### B6. App Store readiness — **D** with checklist, user supplies decisions
Bundle ID + team (user), iPhone-only v1 (`TARGETED_DEVICE_FAMILY = 1`), 1024 px icon with no alpha (repo only has 512 — regenerate from the turkey SVG), `UILaunchScreen` dict, `PrivacyInfo.xcprivacy` (no tracking; User ID + User Content linked for app functionality; `UserDefaults` reason `CA92.1`), `ITSAppUsesNonExemptEncryption = NO`, ATS exception `NSAllowsLocalNetworking` in **Debug only**, Privacy/Support URLs from A5, age rating (political discourse + optional profanity → likely 12+ off / 17+ on; user decides), demo account in review notes, state "no purchases, earn-only currency".

### B7. Mac workflow
```
xcodebuild -project mobile/ios/Gobbl.xcodeproj -scheme Gobbl -destination 'platform=iOS Simulator,name=iPhone 16' build
xcodebuild ... test
xcodebuild archive -scheme Gobbl -configuration Release -archivePath build/Gobbl.xcarchive
```
Debug points at a Vercel preview URL by default (carries env vars; works on a physical device, unlike localhost). Add `mobile/ios/build/`, `xcuserdata/` to `.gitignore`; add `mobile/**` to Vercel's ignored-build-step so iOS-only commits don't redeploy; confirm `tsconfig.json`/ESLint exclude `mobile/` and `scripts/`.

---

## Part C — Sequencing

| Phase | Where | Acceptance |
|---|---|---|
| **0 Backend** (A1–A6) | Windows | curl: register/login via `/api/mobile/auth/*` returns a token; `GET /api/user -H "Authorization: Bearer …"` works; web login/debate smoke test still passes; `tsc --noEmit` + `next build` clean; deployed to a Vercel preview. |
| **1 Scaffold** (B1–B3, Landing) | Mac | Builds in Simulator; register → login → placeholder home; token survives relaunch; forced 401 returns to login; all fixtures decode in tests; avatars render for all 8 stages with items. |
| **2 Core loop** (B4 #2–6, consent) | Mac | New user: survey → dashboard → daily + normal debate → 8 turns → finish → results; numbers match web for the same account; level-up fires once. |
| **3 Remaining** (B4 #7–11, B5) | Mac | Side-by-side parity checklist of all 11 screens vs web on one account. |
| **4 Ship** (B6, accessibility/dark-mode pass, tests) | Mac + user | TestFlight build on a physical iPhone passes manual regression; submitted with metadata. |

Phase 0 order: A1 core (M) → route sweep (D) ∥ A1 mobile routes (M) → A2/A3/A4/A5/A6 in parallel (mostly D) → preview deploy + curl regression (M).

### Decisions the user owes before Phase 4 (not blocking Phases 0–3)
1. Bundle ID / team / production domain. 2. Age rating and whether the profanity tier gets an age gate. 3. Privacy + support copy and contact email. 4. Approve the 1024 px app icon. 5. Confirm iPhone-only v1.

### Risks
- Xcode SVG (CoreSVG) quirks on some items → export script audit + per-item PNG@3x fallback.
- Blocking Grok calls vs Vercel duration → `maxDuration = 60`, long client timeouts, visible loading states.
- Partner scores arrive via `waitUntil` after the response → mirror web (shown on reload).
- Daily now anchored to UTC; a user near midnight UTC may see the day roll at an odd local hour.

## Verification (end-to-end)
1. Phase 0: curl script in `scripts/` exercising every endpoint with a bearer token; Playwright smoke of web login → debate → finish on the preview URL; `rg getServerSession src/app/api` empty; `tsc --noEmit`.
2. Phase 1+: `xcodebuild test` (fixture decoding, LevelTracker, chat turn limit VM tests); Simulator run per screen; compare `/api/user` numbers between web and iOS on the same account after a debate.
3. Phase 4: TestFlight internal build on the user's iPhone; full regression against the parity checklist; App Store Connect metadata review.
