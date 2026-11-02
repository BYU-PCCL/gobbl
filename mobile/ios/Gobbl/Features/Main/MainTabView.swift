import SwiftUI

/// Five tabs mirroring `navItems.ts`: Home, Debate, Skills, Shop, You. Leaderboard is pushed from You.
/// Home and Debate own routed stacks (`AppRouter`); Skills, Shop and You arrive in Phase 3.
/// The onboarding survey covers the tabs, non-dismissably, until it has been submitted.
struct MainTabView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(AppRouter.self) private var router

    var body: some View {
        @Bindable var router = router
        TabView(selection: $router.selectedTab) {
            NavigationStack(path: $router.homePath) {
                DashboardView().withAppRoutes()
            }
            .tabItem { Label("Home", systemImage: GIconName.home.systemName) }
            .tag(AppTab.home)
            NavigationStack(path: $router.debatePath) {
                DebateSetupView(isDaily: false).withAppRoutes()
            }
            .tabItem { Label("Debate", systemImage: GIconName.debate.systemName) }
            .tag(AppTab.debate)
            NavigationStack { ComingSoonView(title: "Skills", phase: "Phase 3", icon: .skills) }
                .tabItem { Label("Skills", systemImage: GIconName.skills.systemName) }
                .tag(AppTab.skills)
            NavigationStack { ComingSoonView(title: "Shop", phase: "Phase 3", icon: .shop) }
                .tabItem { Label("Shop", systemImage: GIconName.shop.systemName) }
                .tag(AppTab.shop)
            NavigationStack { ProfilePlaceholderView() }
                .tabItem { Label("You", systemImage: GIconName.profile.systemName) }
                .tag(AppTab.you)
        }
        .tint(Color.gPrimary)
        .fullScreenCover(isPresented: .constant(auth.needsOnboarding)) {
            SurveyView()
        }
    }
}

extension View {
    /// Destinations for every `AppRoute`; attach to the root of each routed stack.
    func withAppRoutes() -> some View {
        navigationDestination(for: AppRoute.self) { route in
            switch route {
            case .setup(let daily): DebateSetupView(isDaily: daily)
            case .debate(let id): DebateView(debateId: id)
            }
        }
    }
}

struct ProfilePlaceholderView: View {
    @Environment(AuthStore.self) private var auth

    var body: some View {
        VStack(alignment: .leading, spacing: GSpace.xxl) {
            if let user = auth.currentUser {
                Text(user.username).gText(.displayLG).foregroundStyle(Color.gInk)
            }
            Text("Profile, badges, the Flock and account deletion arrive in Phase 3.")
                .gText(.bodySM).foregroundStyle(Color.gInkSoft)
            GButton("Fly the Coop", variant: .outline, icon: .signOut) { auth.signOut(.userRequested) }
            Spacer()
        }
        .padding(GSpace.gutter)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.gBg.ignoresSafeArea())
        .navigationTitle("You")
    }
}

struct ComingSoonView: View {
    let title: String
    let phase: String
    let icon: GIconName

    var body: some View {
        VStack(spacing: GSpace.lg) {
            GIcon(icon, size: 32).foregroundStyle(Color.gInkMuted)
            Text(title).gText(.displayMD).foregroundStyle(Color.gInk)
            GBadge(phase, tone: .neutral)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.gBg.ignoresSafeArea())
        .navigationTitle(title)
    }
}

#Preview {
    MainTabView().gobblEnvironment(.preview(session: MobileSession(
        accessToken: "preview", expiresAt: Date().addingTimeInterval(86_400),
        user: AuthUser(id: "p", username: "PreviewTurkey", onboardingCompletedAt: nil))))
}
