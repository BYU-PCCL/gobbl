# Gobbl for iOS

Native SwiftUI client for Gobbl. The Next.js app at the repo root is the API server;
this app never talks to the database directly.

- **Minimum iOS:** 17.0 · **Swift:** 5.10+ · **Xcode:** 16+ · **Dependencies:** none
- **Roadmap and architecture:** `docs/ios-port-plan.md` (Part B is this app, Part C is the phase order)
- **API contract:** `docs/api.md` · **Fixtures:** `GobblTests/Fixtures/` (regenerate with `scripts/capture-fixtures.sh`)

## One-time setup on the Mac

1. Clone the repo and open Xcode 16 or later.
2. **Create the project** (not committed yet — do this once, then commit `Gobbl.xcodeproj`):
   File → New → Project → iOS App. Product name `Gobbl`, interface SwiftUI, language Swift,
   storage None, include Tests. Save it into `mobile/ios/` so the project lands at
   `mobile/ios/Gobbl.xcodeproj` next to the existing `Gobbl/` folder; when Xcode asks, let the
   target's folder be the existing `mobile/ios/Gobbl` (Xcode 16 uses synchronized folders, so
   every file under it is in the target automatically — no `.pbxproj` edits when adding files).
3. **Attach the xcconfigs:** project → Info → Configurations: set Debug to `Config/Debug.xcconfig`
   and Release to `Config/Release.xcconfig` for both project and target. Then fill in the three
   `CHANGE-ME` values (bundle ID, preview URL, production URL).
4. **Expose the API base URL to code:** in the target's Info tab add a key `API_BASE_URL` with
   value `$(API_BASE_URL)`. `AppEnvironment` reads it with `Bundle.main.object(forInfoDictionaryKey:)`.
5. **Fonts:** download Bricolage Grotesque, DM Sans and JetBrains Mono (OFL) from Google Fonts into
   `Gobbl/Resources/Fonts/` and list the `.ttf` filenames under `UIAppFonts` in the Info tab.
6. **Signing:** target → Signing & Capabilities → your team, automatic signing.

The avatar artwork is already in place: `Gobbl/Resources/Assets.xcassets/Avatars/` holds 8 turkey
stages and 22 items as vector SVG image sets, generated from the web components by
`npm run export:avatars` (run on any machine with Node; commit the output). Three shop backgrounds
(`sunset`, `cosmic`, `dots`) use gradients/patterns and are drawn in SwiftUI instead.

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

To override at run time in Debug, set the environment variable `GOBBL_API_BASE` in the scheme's
Run action (Product → Scheme → Edit Scheme → Arguments).

## Kicking off development with Claude Code on the Mac

From the repo root on the Mac:

```
claude
> Read docs/ios-port-plan.md and docs/api.md. Phase 0 (backend) is done and verified.
> Start Phase 1 for the iOS app in mobile/ios following Part B of the plan: create the Xcode
> project as described in mobile/ios/README.md, then build Core/Networking, Core/Auth and the
> Landing screen. Compile with xcodebuild after every step. Delegate screen-by-screen UI work
> to Sonnet subagents; keep APIClient/AuthStore/ChatViewModel on the main model.
```
