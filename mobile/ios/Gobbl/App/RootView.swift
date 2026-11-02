import SwiftUI

/// Switches on auth state: splash while validating a stored token, Landing when signed out,
/// a retry screen when the server is unreachable, and the tabs when signed in.
/// Onboarding presents as a non-dismissable cover over the tabs (`MainTabView`) while `needsOnboarding`.
struct RootView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(ConfigStore.self) private var config
    @Environment(AppRouter.self) private var router
    @Environment(ProfileStore.self) private var profile
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        Group {
            switch auth.state {
            case .loading:
                SplashView()
            case .signedOut(let reason):
                LandingView(signOutReason: reason)
            case .unreachable(let message):
                UnreachableView(message: message)
            case .signedIn:
                MainTabView()
            }
        }
        .background(Color.gBg.ignoresSafeArea())
        .animation(.easeInOut(duration: 0.25), value: auth.state)
        .task {
            await auth.bootstrap()
            await config.refreshIfNeeded()
        }
        .onChange(of: auth.currentUser?.id) { old, new in
            // Signed out or switched account: drop pushed screens and the previous user's numbers.
            if old != new {
                router.reset()
                profile.clear()
            }
        }
        .onChange(of: scenePhase) { _, phase in
            // `today.date` rolls at UTC midnight; refetch config when the app comes back.
            if phase == .active { Task { await config.refreshIfNeeded() } }
        }
    }
}

struct SplashView: View {
    var body: some View {
        VStack(spacing: GSpace.lg) {
            AvatarView(stage: 1, size: 96, animate: true)
            ProgressView().tint(Color.gInkMuted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.gBg)
    }
}

/// Shown on cold launch when we hold a token but the server could not be reached. Never shows login.
struct UnreachableView: View {
    @Environment(AuthStore.self) private var auth
    let message: String
    @State private var isRetrying = false

    var body: some View {
        VStack(spacing: GSpace.xl) {
            AvatarView(stage: 2, size: 88)
            VStack(spacing: GSpace.sm) {
                Text("Can't reach the coop").gText(.displayMD).foregroundStyle(Color.gInk)
                Text(message).gText(.bodySM).foregroundStyle(Color.gInkSoft).multilineTextAlignment(.center)
            }
            GButton("Try again", icon: .refresh, isLoading: isRetrying) {
                isRetrying = true
                Task {
                    await auth.bootstrap()
                    isRetrying = false
                }
            }
            GButton("Sign out", variant: .ghost, size: .sm) { auth.signOut(.userRequested) }
        }
        .padding(GSpace.xxxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.gBg)
    }
}

#Preview("Unreachable") {
    UnreachableView(message: "Couldn't reach the server. Check your connection and try again.")
        .gobblEnvironment(.preview())
}
