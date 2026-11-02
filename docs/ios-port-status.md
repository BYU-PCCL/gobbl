# iOS port — status log

Companion to `ios-port-plan.md` (the plan does not change; this file records progress against it).
Newest entries first. Dates are absolute.

## Where things stand (2026-10-28)

| Phase | Status | Evidence |
|---|---|---|
| 0 Backend (A1–A6) | **Done** (on Windows, before 2026-10-26) | `src/app/api/mobile/auth/*`, `src/app/api/config`, `docs/api.md`, fixtures captured 2026-10-26 |
| 1 Scaffold (B1–B3 + Landing) | **Written, not built** | `mobile/ios/` as listed below; see "How Phase 1 was verified" |
| 2 Core loop | Not started | — |
| 3 Remaining screens | Not started | — |
| 4 Ship | Not started | — |

**Immediate next step:** install Xcode 16+ on the Mac, then from `mobile/ios` run the `xcodebuild`
build and test commands in `mobile/ios/README.md`. Expect some iOS-only compile issues that the
macOS typecheck could not catch (see below). Fix those, confirm the Phase 1 acceptance list from the
plan (Part C), then start Phase 2 with the prompt at the bottom of `mobile/ios/README.md`.

## 2026-10-28 — Phase 1 scaffold written on the Mac (Claude Code, Fable 5.1)

Context: the Mac had only the Command Line Tools installed, not Xcode. There is no iOS SDK,
simulator or `xcodebuild` in that setup, so nothing below has been built for iOS. The repo folder
was a zip extract with no git history.

### Added under `mobile/ios/`

- `Gobbl.xcodeproj/project.pbxproj` — hand-written, Xcode 16 format (`objectVersion = 77`), two
  targets (`Gobbl` app, `GobblTests` unit tests) as synchronized root groups, xcconfigs attached at
  project and app-target level, `Gobbl/Info.plist` excluded from resources via an exception set.
  Plus a shared scheme `Gobbl.xcscheme` with a disabled `GOBBL_API_BASE=http://localhost:3000`
  environment variable.
- `Gobbl/App/` — `GobblApp`, `AppEnvironment` (builds vault → client → auth → config; resolves the
  base URL from Info.plist or `GOBBL_API_BASE` in Debug), `RootView` (switches on
  `AuthStore.State`: loading | signedOut | unreachable | signedIn) with `SplashView` and
  `UnreachableView`.
- `Gobbl/Core/Networking/` — `APIClient` (bearer header, `X-Gobbl-Client: ios/<version>`, 401 →
  `onUnauthorized` only for endpoints that require auth, status → `APIError` mapping, 204 support),
  `Endpoint<Response>`, `Endpoints.swift` (every route in `docs/api.md` as `API.xxx`), `APIError`
  (+ `APIErrorCode` constants), `JSONCoding` (ISO 8601 with/without fractional seconds, UTC day key).
- `Gobbl/Core/Auth/` — `KeychainStore` (one JSON blob, `kSecAttrAccessibleAfterFirstUnlock`),
  `InMemorySessionStore`, `AuthStore` (`@Observable`, `bootstrap/login/register/signOut/
  refreshProfile/markOnboardingCompleted/deleteAccount`; first sign-out reason wins; transport
  errors never sign out).
- `Gobbl/Core/Models/` — one Codable type per response; `StringBacked` protocol gives
  `DifficultyTier`, `BeliefKey`, `ShopSlot`, `MessageRole`, `ModuleVariant`, `SkillKey` an
  `.unknown(String)` case; `SurveyQuestion` and `ModuleStep` are unions with an unknown case;
  `ChatResponse` discriminates turn vs finish on `finished: true`; `EquipRequest` encodes an
  explicit `null` to unequip; `Requests.swift` holds every request body.
- `Gobbl/Core/Storage/` — `ConfigStore` (fetches `/api/config`, caches to Application Support,
  refetches when `today.date` is not the current UTC day), `LevelTracker` (UserDefaults
  `lastLevel.<userId>`, fires once per level-up). `Core/Loadable.swift` is the screen-state enum.
- `Gobbl/DesignSystem/` — `Colors` (asset catalog names `Bg, Surface, Surface2, Ink, InkSoft,
  InkMuted, Line, Primary, PrimarySoft, PrimaryPressed, PrimaryDeep, Forest, ForestSoft, Ochre,
  OchreSoft, Danger`, light + dark from `globals.css`), `Typography` (`GFont` loads the bundled
  variable fonts through CoreText `wght`/`opsz` axes; `GTextStyle` mirrors the Tailwind display/body/
  eyebrow scale; `.gText(.displayLG)`), `Layout` (spacing, radii, shadows), components `GButton`
  (6 variants × 3 sizes, loading), `GCard`, `GChip`, `GBadge`, `GTextField`, `GIcon` (SF Symbol map).
- `Gobbl/Features/Avatar/` — `TurkeyStage` (labels, asset names, fallback anchors copied from
  `src/lib/avatarAnchors.ts`), `AvatarBackgrounds` (native `sunset`, `cosmic`, `dots`),
  `AvatarView` (layer order from `AvatarWithItems.tsx`, offsets `anchor * size / 200`, float ≥ stage 5,
  wiggle ≥ 7, honors Reduce Motion), `ItemPreview`.
- `Gobbl/Features/Landing/` — `LandingView` (hero, 8-stage growth row, promises, footer),
  `AuthFormView` (login/register in one view, notices for account-missing / session-expired),
  `AuthFormViewModel` (client-side mirror of the 3–20 / 6+ rules, error-message mapping).
- `Gobbl/Features/Main/MainTabView.swift` — five tabs (Home, Debate, Skills, Shop, You). Home loads
  `/api/user` and shows avatar, level, XP, stats and today's topic; You has sign-out; the rest are
  "coming in Phase 2/3" placeholders.
- `Gobbl/Info.plist` — `API_BASE_URL = $(API_BASE_URL)`, `UIAppFonts`, and a Debug-only ATS
  `NSAllowsLocalNetworking` under `#if GOBBL_DEBUG` (the file is preprocessed; no apostrophes in it).
- `Gobbl/PrivacyInfo.xcprivacy` — no tracking; User ID and User Content linked for app
  functionality; UserDefaults reason `CA92.1`.
- `Gobbl/Resources/Fonts/` — Bricolage Grotesque, DM Sans, JetBrains Mono variable `.ttf` plus
  OFL licence texts, downloaded from the google/fonts repository.
- `Gobbl/Resources/Assets.xcassets/` — added `Colors/` (16 color sets), an empty `AppIcon`
  slot (1024 px, needs an image) and `AccentColor`. The `Avatars/` sets were already present.
- `GobblTests/` — `Fixtures.swift` loader, `FixtureDecodingTests` (every fixture + tolerant enums +
  request encoding + dates), `StubURLProtocol`, `APIClientTests`, `AuthStoreTests`,
  `LevelTrackerTests` (also covers `AuthFormViewModel.validate`).
- `README.md` rewritten for the new state.

### Fixes to files that shipped in the zip

- `Config/Shared.xcconfig`: `SWIFT_VERSION = 5.10` → `5.0`. Xcode accepts only 4, 4.2, 5, 6 as
  language modes; 5.10 fails the build. Also added `GENERATE_INFOPLIST_FILE`, `INFOPLIST_FILE`,
  `INFOPLIST_PREPROCESS` and the scene-manifest key.
- `Config/Debug.xcconfig`: removed `INFOPLIST_KEY_NSAppTransportSecurity_NSAllowsLocalNetworking`
  (not a key Xcode honors); replaced with `INFOPLIST_PREPROCESSOR_DEFINITIONS = GOBBL_DEBUG=1` and
  `SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG`.

### Decisions and deviations from the plan

- Fonts are variable TTFs loaded by family name + variation axes, not static instances. The named
  instances inside Google's files have unusable PostScript names (`BricolageGrotesque-96ptExtraBold_Bold`).
- `APIError` has `clientError(status:)` and `server(status:)` in addition to the plan's cases, and
  carries the full `APIErrorBody` (so `featherBalance`, `unlockAt`, `debateId`, `currentStage`,
  `fieldErrors` are available to screens).
- `AuthStore.State` gained `.unreachable(message:)` for the offline-at-launch case the plan's B5
  describes (retry screen, not login).
- `APIClient` and `AuthStore` share a `SessionVault` (thread-safe token holder) instead of a closure
  `tokenProvider`, to break the construction cycle cleanly.
- The web gates nothing on onboarding; iOS will. Phase 1 shows a note on Home when
  `onboardingCompletedAt == nil`; Phase 2 replaces it with the non-dismissable survey cover.
- iOS-only view modifiers are wrapped in `#if os(iOS)` helpers (`gInlineTitle`, `gHideNavigationBar`,
  `gFieldTraits`) so the sources also typecheck against the macOS SDK. Keep doing this for new code
  only if it costs nothing; once Xcode is present it is no longer required.

### How Phase 1 was verified (and what was not)

Verified on 2026-10-28 with the Command Line Tools' Swift 6.4 compiler:

- All 46 Swift files under `mobile/ios/Gobbl/` typecheck against the macOS 14 SDK in Swift 5 mode
  (with `@State` swapped for a shim and `#Preview` blocks stripped in a scratch copy, because the
  CLT lacks the SwiftUI macro plugin).
- A macOS executable compiled from `Core/` decoded all 19 fixtures into their models with value
  assertions, round-tripped `config.json` through the cache encoder, checked tolerant-enum
  behaviour, request encoding (`itemId: null`, daily request omits topic, `confirm: "DELETE"`),
  `APIClient.decode` status/code mapping, request URL/header building, and `LevelTracker`. All passed.
- `project.pbxproj` lints as a valid OpenStep plist; all asset-catalog JSON and the scheme XML parse.
- Test files were syntax-parsed only (no XCTest in the CLT).

Not verified: the iOS build, `xcodebuild test`, SwiftUI previews, simulator run, font registration
at runtime, SVG rendering of the avatar assets (watch `item_medal.svg`, which contains an SVG
`<text>` element), the Info.plist preprocessing, and code signing.

### Known issues / loose ends

- Five fixtures (`user`, `debates`, `debates-create`, `debate-detail-*`) contain U+FFFD where an
  em dash belongs in topic strings, from the Windows capture. Harmless for decoding; regenerate with
  `scripts/capture-fixtures.sh` from the Mac when convenient (needs Node).
- `AppIcon.appiconset` is empty. Repo only has 512 px PNGs under `public/icons/`.
- `TurkeyStage.fallbackAnchors` duplicates `avatarAnchors.ts`; it only matters before the first
  successful `/api/config` fetch.
- `GIconName.feather` maps to `leaf.fill` (SF Symbols has no feather). Revisit when porting `Icon.tsx`.
- No consent screen yet for sending debate text to xAI (App Review 5.1.2(i)); it is a Phase 2 item.

## Before 2026-10-28 — Phase 0 (backend)

Done on the Windows machine per `ios-port-plan.md` Part A: bearer-token auth (`/api/mobile/auth/*`,
`src/lib/session.ts`), `DELETE /api/user`, server-side turn/length/daily/unlock enforcement,
`GET /api/config`, DTO hygiene and `code` on errors, privacy and support pages, `docs/api.md`,
`scripts/capture-fixtures.sh` with fixtures captured 2026-10-26, and the avatar SVG export into the
asset catalog. The web's design migration from `_handoff/` was applied before that.
