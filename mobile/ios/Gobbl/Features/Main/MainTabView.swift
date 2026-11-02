import SwiftUI

/// Five tabs mirroring `navItems.ts`: Home, Debate, Skills, Shop, You. Leaderboard is pushed from You.
/// Phase 1 ships the shell with a working Home summary; the other tabs are placeholders.
struct MainTabView: View {
    enum Tab: Hashable { case home, debate, skills, shop, you }
    @State private var selected: Tab = .home

    var body: some View {
        TabView(selection: $selected) {
            NavigationStack { HomePlaceholderView() }
                .tabItem { Label("Home", systemImage: GIconName.home.systemName) }
                .tag(Tab.home)
            NavigationStack { ComingSoonView(title: "Debate", phase: "Phase 2", icon: .debate) }
                .tabItem { Label("Debate", systemImage: GIconName.debate.systemName) }
                .tag(Tab.debate)
            NavigationStack { ComingSoonView(title: "Skills", phase: "Phase 3", icon: .skills) }
                .tabItem { Label("Skills", systemImage: GIconName.skills.systemName) }
                .tag(Tab.skills)
            NavigationStack { ComingSoonView(title: "Shop", phase: "Phase 3", icon: .shop) }
                .tabItem { Label("Shop", systemImage: GIconName.shop.systemName) }
                .tag(Tab.shop)
            NavigationStack { ProfilePlaceholderView() }
                .tabItem { Label("You", systemImage: GIconName.profile.systemName) }
                .tag(Tab.you)
        }
        .tint(Color.gPrimary)
    }
}

/// Loads `/api/user` and shows the avatar, level and XP: enough to prove auth and decoding end to end.
struct HomePlaceholderView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(ConfigStore.self) private var config
    @State private var profile: Loadable<UserProfile> = .idle

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: GSpace.xxl) {
                switch profile {
                case .idle, .loading:
                    ProgressView().frame(maxWidth: .infinity).padding(.top, GSpace.xxxl)
                case .failed(let message, _):
                    GCard {
                        VStack(alignment: .leading, spacing: GSpace.md) {
                            Text("Couldn't load your turkey").gText(.displaySM)
                            Text(message).gText(.bodySM).foregroundStyle(Color.gInkSoft)
                            GButton("Try again", variant: .outline, size: .sm, icon: .refresh) { Task { await load() } }
                        }
                    }
                case .loaded(let user):
                    summary(user)
                }
            }
            .padding(.horizontal, GSpace.gutter)
            .padding(.vertical, GSpace.lg)
        }
        .background(Color.gBg.ignoresSafeArea())
        .navigationTitle("Home")
        .refreshable { await load() }
        .task { if profile.value == nil { await load() } }
    }

    private func summary(_ user: UserProfile) -> some View {
        VStack(alignment: .leading, spacing: GSpace.xxl) {
            VStack(alignment: .leading, spacing: GSpace.xs) {
                GEyebrow("Hi \(user.username)")
                Text("Ready to talk turkey?").gText(.displayXL).foregroundStyle(Color.gInk)
            }
            GCard {
                HStack(spacing: GSpace.xl) {
                    AvatarView(stage: user.avatarStage, equipped: user.equippedCosmetics, size: 120, animate: true)
                    VStack(alignment: .leading, spacing: GSpace.sm) {
                        GBadge("Level \(user.level) · \(user.levelInfo.name)", tone: .ochre)
                        Text("\(user.xp) XP").gText(.monoLG).foregroundStyle(Color.gInk)
                        Text(user.levelInfo.xpForNext == 0
                             ? "Max level"
                             : "+\(user.levelInfo.xpForNext - user.levelInfo.xpProgress) to next level")
                            .gText(.bodyXS).foregroundStyle(Color.gInkSoft)
                        ProgressView(value: min(max(user.levelInfo.progressPercent, 0), 100), total: 100)
                            .tint(Color.gPrimary)
                    }
                }
            }
            HStack(spacing: GSpace.md) {
                stat("Civility", String(format: "%.1f", user.civilityScore), .civility)
                stat("Streak", "\(user.currentStreak)", .streak)
                stat("Feathers", "\(user.featherBalance)", .feather)
            }
            if user.onboardingCompletedAt == nil {
                GCard(inverted: true) {
                    VStack(alignment: .leading, spacing: GSpace.sm) {
                        GEyebrow("Next up", color: .gOchre)
                        Text("The onboarding survey arrives in Phase 2.").gText(.bodySM)
                    }
                }
            }
            if let topic = config.config?.today.dailyTopic {
                GCard {
                    VStack(alignment: .leading, spacing: GSpace.sm) {
                        GEyebrow("Today's Gobble")
                        Text(topic.title).gText(.displaySM).foregroundStyle(Color.gInk)
                        Text(topic.description).gText(.bodySM).foregroundStyle(Color.gInkSoft)
                    }
                }
            }
        }
    }

    private func stat(_ label: String, _ value: String, _ icon: GIconName) -> some View {
        GCard {
            VStack(alignment: .leading, spacing: GSpace.xs) {
                GIcon(icon, size: 14).foregroundStyle(Color.gPrimary)
                Text(value).gText(.monoLG).foregroundStyle(Color.gInk)
                Text(label).gText(.bodyXS).foregroundStyle(Color.gInkMuted)
            }
        }
    }

    private func load() async {
        profile = .loading
        do {
            profile = .loaded(try await auth.refreshProfile())
        } catch {
            profile = .failure(error)
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
