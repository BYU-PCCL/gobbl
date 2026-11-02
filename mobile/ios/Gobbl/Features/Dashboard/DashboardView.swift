import SwiftUI

/// Home tab root (web: `dashboard/page.tsx`). Hosted in a NavigationStack with `.withAppRoutes()` by the parent.
struct DashboardView: View {
    @Environment(ProfileStore.self) private var profileStore
    @Environment(ConfigStore.self) private var configStore
    @Environment(AppRouter.self) private var router
    @Environment(\.appEnvironment) private var env

    @State private var levelChange: LevelChange?

    var body: some View {
        Group {
            if let user = profileStore.current {
                content(user)
            } else if let message = profileStore.profile.errorMessage {
                failure(message)
            } else {
                loading
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.gBg.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .task { await load() }
        .fullScreenCover(item: $levelChange) { change in
            LevelUpView(change: change, config: configStore.config,
                        onSeeWhatsNew: { levelChange = nil; router.show(.shop) },
                        onSkip: { levelChange = nil })
        }
    }

    private func load() async {
        if configStore.config == nil { await configStore.refresh() }
        guard let profile = await profileStore.refresh() else { return }
        if let change = env?.levelTracker.observe(level: profile.level, for: profile.id) {
            levelChange = change
        }
    }

    // MARK: - States

    private var loading: some View {
        VStack(spacing: GSpace.lg) {
            AvatarView(stage: 1, size: 96, animate: true)
            ProgressView()
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Loading your dashboard")
    }

    private func failure(_ message: String) -> some View {
        VStack(spacing: GSpace.lg) {
            AvatarView(stage: 1, size: 96)
            Text("Couldn't load your dashboard: \(message)")
                .gText(.bodySM).foregroundStyle(Color.gInkSoft).multilineTextAlignment(.center)
            GButton("Try again", variant: .secondary) { Task { await load() } }
        }
        .padding(GSpace.gutter)
    }

    // MARK: - Content

    private func content(_ user: UserProfile) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: GSpace.xl) {
                headline
                hero(user)
                stats(user)
                daily(user)
                recent(user)
            }
            .padding(.horizontal, GSpace.gutter)
            .padding(.vertical, GSpace.lg)
        }
        .refreshable { await load() }
    }

    private var headline: some View {
        VStack(alignment: .leading, spacing: GSpace.sm) {
            Text("Ready to talk turkey?").gText(.displayXL).foregroundStyle(Color.gInk)
                .accessibilityAddTraits(.isHeader)
            Text("One conversation a day. The Flock's already gathering.")
                .gText(.bodySM).foregroundStyle(Color.gInkSoft)
        }
    }

    private func hero(_ user: UserProfile) -> some View {
        let info = user.levelInfo
        let remaining = info.xpForNext - info.xpProgress
        let nextName = configStore.config?.level(user.level + 1)?.name ?? "next"
        return GCard {
            HStack(alignment: .center, spacing: GSpace.lg) {
                AvatarView(stage: user.avatarStage, equipped: user.equippedCosmetics, size: 120, animate: true)
                VStack(alignment: .leading, spacing: GSpace.sm) {
                    GEyebrow("Level \(user.level) · \(info.name)")
                    Text("Strutting nicely.").gText(.displayMD).foregroundStyle(Color.gInk)
                    XPBar(current: info.xpProgress, max: info.xpForNext, level: user.level, levelName: info.name)
                    if info.xpForNext > 0 {
                        HStack {
                            Text("\(info.xpProgress) / \(info.xpForNext) XP")
                                .gText(.bodyXS).monospacedDigit().foregroundStyle(Color.gInkMuted)
                            Spacer(minLength: 4)
                            Text(remaining > 0 ? "+\(remaining) to \(nextName)" : "Max level")
                                .gText(.bodyXS).monospacedDigit().bold().foregroundStyle(Color.gPrimary)
                        }
                    } else {
                        Text("Max level").gText(.bodyXS).bold().foregroundStyle(Color.gPrimary)
                    }
                }
            }
        }
    }

    private func stats(_ user: UserProfile) -> some View {
        HStack(spacing: GSpace.md) {
            StatTile(label: "Civility",
                     value: user.civilityScore > 0 ? String(Int((user.civilityScore * 10).rounded())) : "—",
                     unit: "/100", color: .gForest)
            StatTile(label: "Streak", value: "\(user.currentStreak)", unit: "days", color: .gPrimary)
            StatTile(label: "Debates", value: "\(user.recentDebates.count)", unit: "total", color: .gOchre)
        }
    }

    @ViewBuilder
    private func daily(_ user: UserProfile) -> some View {
        if let config = configStore.config {
            DailyGobbleCard(topic: config.today.dailyTopic, completed: user.dailyCompleted,
                            bonusFeathers: config.rules.dailyBonusFeathers, bonusXp: config.rules.dailyBonusXp) {
                router.push(.setup(daily: true))
            }
        }
    }

    @ViewBuilder
    private func recent(_ user: UserProfile) -> some View {
        if !user.recentDebates.isEmpty {
            VStack(alignment: .leading, spacing: GSpace.md) {
                HStack(alignment: .firstTextBaseline) {
                    Text("Recent").gText(.displaySM).foregroundStyle(Color.gInk)
                        .accessibilityAddTraits(.isHeader)
                    Spacer()
                    Button("See all") { router.show(.you) }
                        .font(GFont.font(.body, size: 13, weight: 600, relativeTo: .footnote))
                        .foregroundStyle(Color.gPrimary)
                }
                ForEach(user.recentDebates.prefix(3)) { debate in
                    Button { router.push(.debate(id: debate.id)) } label: { row(debate) }
                        .buttonStyle(.plain)
                }
            }
        }
    }

    private func row(_ debate: RecentDebate) -> some View {
        HStack(spacing: GSpace.md) {
            Image(TurkeyStage.imageName(3)).resizable().scaledToFit().frame(width: 22, height: 22)
                .frame(width: 36, height: 36)
                .background(Color.gPrimarySoft, in: RoundedRectangle(cornerRadius: GRadius.md, style: .continuous))
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text(debate.topic)
                    .font(GFont.font(.body, size: 14, weight: 600, relativeTo: .subheadline))
                    .foregroundStyle(Color.gInk).lineLimit(1)
                Text(debate.difficulty.displayName.uppercased())
                    .gText(.bodyXS).font(GFont.font(.mono, size: 10, weight: 500, relativeTo: .caption2))
                    .foregroundStyle(Color.gInkMuted)
            }
            Spacer(minLength: GSpace.sm)
            if let score = debate.score {
                Text(String(format: "%.1f", score))
                    .font(GFont.font(.display, size: 20, weight: 700, relativeTo: .title3))
                    .monospacedDigit().foregroundStyle(Color.gForest)
            } else {
                GBadge("In progress", tone: .neutral)
            }
        }
        .padding(.horizontal, GSpace.lg).padding(.vertical, 14)
        .background(Color.gSurface, in: RoundedRectangle(cornerRadius: GRadius.lg, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: GRadius.lg, style: .continuous).strokeBorder(Color.gLine, lineWidth: 1))
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
    }
}

#Preview {
    NavigationStack { DashboardView() }
        .gobblEnvironment(.preview(session: MobileSession(
            accessToken: "preview", expiresAt: Date().addingTimeInterval(86_400),
            user: AuthUser(id: "p", username: "PreviewTurkey", onboardingCompletedAt: Date()))))
}
