# Gobbl — read this first

Gobbl is a gamified civil-discourse trainer: you debate an AI partner ("Robert") on political topics,
get scored on civility, and grow a turkey avatar from Egg to Thunderbird. The web app (Next.js, in
`src/`) is live on Vercel and is also the API server. **The current aim is to ship a native iOS app
on the App Store with feature parity**, living in `mobile/ios/`.

## Where to look

| Need | File |
|---|---|
| What the iOS port is, the architecture, and the phase order | `docs/ios-port-plan.md` |
| What has been done, what is unverified, what comes next | `docs/ios-port-status.md` |
| Every API endpoint, request/response shape, error code | `docs/api.md` |
| How to build, test, and configure the iOS app | `mobile/ios/README.md` |
| Real API payloads to code against | `mobile/ios/GobblTests/Fixtures/*.json` |
| Web app setup, env vars, deploy | `README.md` |
| Adding a skills module to the web app | `HowToForHumans.MD` |

`_handoff/` is an older design-migration bundle for the web app. It has already been applied; treat
it as reference only.

## State in one paragraph

Phase 0 (backend: bearer-token auth, server-side rules, `/api/config`, account deletion, legal pages,
contract and fixtures) is done and deployed. Phase 1 (iOS scaffold: Xcode project, networking, auth,
models, design system, avatar, landing/login, tab shell, tests) was written on 2026-10-28 on a Mac
that had only the Command Line Tools, so it has been typechecked and its decoding logic run, but it
has **never been built with Xcode**. The first job of the next session with Xcode installed is to run
the build and tests in `mobile/ios/README.md` and fix what the real compiler finds. Then Phase 2.

## Rules that are not obvious from the code

- **The API is additive-only.** The web client must keep working. New fields may be added; nothing is
  renamed or removed. Breaking changes go under `/api/v2`. The iOS models therefore ignore unknown
  fields and keep unknown enum strings (`.unknown(String)` cases).
- **Never edit `Gobbl.xcodeproj/project.pbxproj` to add files.** The project uses Xcode 16
  synchronized folders; anything under `mobile/ios/Gobbl/` or `GobblTests/` is in its target.
- **Zero third-party iOS dependencies.** SwiftUI, Swift 5 language mode, iOS 17 minimum, iPhone only.
- **The server is the authority** on turn limits, message length, the Daily Gobble, shop unlocks,
  and XP/feather math. The client mirrors the rules for UX but never recomputes rewards.
- **Feathers are earn-only.** No real-money path, no In-App Purchase. Keep it that way.
- **Delegation convention** (from the plan): mechanical, well-specified screens go to cheaper
  subagents; architecture, auth, the chat state machine, and review stay on the main model.
- Values the user still owes: bundle ID, preview and production URLs (`mobile/ios/Config/*.xcconfig`),
  signing team, 1024 px app icon, age rating, privacy/support copy and contact email.

## Repo and tooling facts

- This folder may be a zip extract rather than a git clone (check for `.git`). GitHub access for the
  repo `bostonjsharp/gobbl-app` is being sorted out; commit locally if git is available, do not push
  without being asked.
- The Mac is managed (Company Portal, Self Service+). Xcode may have to come through Self Service+.
- Web app: `npm install`, `npm run dev`; needs `.env.local` (see `.env.example`). Node may not be
  installed on the Mac.
- Scratch work belongs outside the repo. Do not commit `build/`, `DerivedData/`, or `.env*`.
