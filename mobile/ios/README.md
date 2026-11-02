# Gobbl for iOS

Native SwiftUI client for Gobbl. The Next.js app at the repo root is the API server;
this app never talks to the database directly.

- **Minimum iOS:** 17.0 · **Language mode:** Swift 5 (`SWIFT_VERSION = 5.0`; the toolchain is 5.10+/6) · **Xcode:** 16+ · **Dependencies:** none
- **Roadmap and architecture:** `docs/ios-port-plan.md` (Part B is this app, Part C is the phase order)
- **API contract:** `docs/api.md` · **Fixtures:** `GobblTests/Fixtures/` (regenerate with `scripts/capture-fixtures.sh`)

## What is here (Phase 1 scaffold)

`Gobbl.xcodeproj` is committed. It uses Xcode 16 synchronized folders, so every file under
`Gobbl/` and `GobblTests/` is in its target automatically: add files, never edit the `.pbxproj`.

```
Gobbl/
  App/            GobblApp, RootView (loading | Landing | Unreachable | MainTabView), AppEnvironment
  Core/Networking APIClient, Endpoint, Endpoints (every route in docs/api.md), APIError, JSONCoding
  Core/Auth       KeychainStore (kSecAttrAccessibleAfterFirstUnlock), AuthStore (@Observable)
  Core/Models     one Codable type per API response; enum-like strings keep an `.unknown` case
  Core/Storage    ConfigStore (/api/config, cached on disk), LevelTracker (UserDefaults)
  DesignSystem/   Colors (asset catalog, light + dark), Typography (bundled variable fonts), Layout, Components/G*
  Features/       Landing (hero + login/register), Avatar (AvatarView, ItemPreview, native backgrounds), Main (tab shell)
  Resources/      Assets.xcassets (Avatars, Colors, AppIcon slot), Fonts/ (OFL .ttf), Info.plist, PrivacyInfo.xcprivacy
GobblTests/       fixture decoding, APIClient (stubbed URLProtocol), AuthStore, LevelTracker
Config/           Shared / Debug / Release xcconfig
```

Phase 1 acceptance (plan Part C): builds in the Simulator; register → login → placeholder Home;
token survives relaunch; a forced 401 returns to Landing; all fixtures decode in tests; the
avatar renders for all 8 stages with items.

## One-time setup on the Mac

1. Install Xcode 16 or later (the Command Line Tools alone cannot build iOS apps), open it once,
   and install the iOS Simulator runtime when prompted.
2. Open `mobile/ios/Gobbl.xcodeproj`.
3. Fill in the three `CHANGE-ME` values: bundle ID in `Config/Shared.xcconfig`, preview URL in
   `Config/Debug.xcconfig`, production URL in `Config/Release.xcconfig`.
4. **Signing:** target `Gobbl` → Signing & Capabilities → your team, automatic signing. The test
   target picks up the same team.
5. **App icon:** drop a 1024 px PNG with no alpha into `Gobbl/Resources/Assets.xcassets/AppIcon.appiconset`
   (the slot exists; the repo only has 512 px icons, so regenerate from the turkey SVG).

Everything else the earlier version of this README asked you to do by hand is already wired:
the xcconfigs are attached to the project and app target; `Info.plist` exposes `API_BASE_URL`
and lists the fonts under `UIAppFonts`; the fonts are in `Gobbl/Resources/Fonts/`.

### How the API base URL reaches code

`Config/*.xcconfig` define `API_BASE_URL`; `Gobbl/Info.plist` copies it in as `$(API_BASE_URL)`;
`AppEnvironment.resolveBaseURL()` reads it with `Bundle.main.object(forInfoDictionaryKey:)`.
In Debug, the `GOBBL_API_BASE` environment variable overrides it (there is a disabled entry in
the shared scheme's Run action: Product → Scheme → Edit Scheme → Arguments → enable it).

`Info.plist` is preprocessed (`INFOPLIST_PREPROCESS = YES`): the ATS exception that allows
`http://localhost:3000` on the Simulator sits under `#if GOBBL_DEBUG`, which only Debug defines,
so Release never carries it. Keep apostrophes out of that file.

### Fonts

Bricolage Grotesque, DM Sans and JetBrains Mono ship as variable `.ttf` files (OFL licences alongside).
`GFont` sets weight and optical size through CoreText variation axes, so there is one file per
family; use `Text("…").gText(.displayLG)` or `GFont.font(.body, size:weight:relativeTo:)`.
If a family fails to register, `GFont` falls back to the system font instead of silently using Helvetica.

### Avatars

`Gobbl/Resources/Assets.xcassets/Avatars/` holds 8 turkey stages and 22 items as vector SVG image
sets, generated from the web components by `npm run export:avatars` (run on any machine with Node;
commit the output). Three shop backgrounds (`sunset`, `cosmic`, `dots`) use gradients/patterns and
are drawn in SwiftUI (`AvatarBackgrounds.swift`). `AvatarView` mirrors `AvatarWithItems.tsx`:
item offsets come from `/api/config` `avatarAnchors` with a built-in fallback. One item to eyeball
on first render: `item_medal.svg` contains an SVG `<text>` element, which Xcode's SVG importer may drop.

## Build and run without the Xcode GUI

```sh
cd mobile/ios
xcodebuild -project Gobbl.xcodeproj -scheme Gobbl -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 16' build
xcodebuild -project Gobbl.xcodeproj -scheme Gobbl \
  -destination 'platform=iOS Simulator,name=iPhone 16' test
xcrun simctl boot "iPhone 16" && open -a Simulator
```

Archive for TestFlight / App Store:

```sh
xcodebuild archive -project Gobbl.xcodeproj -scheme Gobbl -configuration Release \
  -archivePath build/Gobbl.xcarchive
# then Window → Organizer in Xcode, or `xcodebuild -exportArchive` with an ExportOptions.plist
```

## Pointing at a backend

| Configuration | `API_BASE_URL`                         | Notes                                                        |
|---------------|----------------------------------------|--------------------------------------------------------------|
| Debug         | Vercel preview URL (default)           | Works on Simulator and physical device.                      |
| Debug         | `http://localhost:3000`                | Simulator only. Run `npm run dev` at the repo root.          |
| Release       | Production domain                      | Never carries the local-networking ATS exception.            |

## Checking the Swift without Xcode

The Command Line Tools can typecheck everything except iOS-only view modifiers (those are wrapped in
`#if os(iOS)` helpers such as `gInlineTitle()`), and can run the fixture-decoding checks as a plain
macOS executable. This is how the scaffold was verified before Xcode was installed; `xcodebuild test`
is still the real gate.

## Next: Phase 2 with Claude Code

From the repo root on the Mac:

```
claude
> Read docs/ios-port-plan.md and docs/api.md. Phases 0 and 1 are done: the Xcode project,
> Core/Networking, Core/Auth, the design system, AvatarView and the Landing screen exist in
> mobile/ios and the tests pass. Start Phase 2 (B4 #2–6 plus the AI consent screen): Survey,
> Dashboard, Debate setup, Chat, Results. Compile with xcodebuild after every step. Delegate
> screen-by-screen UI work to Sonnet subagents; keep ChatViewModel on the main model.
```
