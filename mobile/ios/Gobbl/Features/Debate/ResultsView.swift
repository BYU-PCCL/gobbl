import SwiftUI

/// Results after finishing a debate (web: `ScoreSummary.tsx`). Every number comes from the server's
/// finish payload; nothing is recomputed. A level-up shows the evolution reveal first.
struct ResultsView: View {
    let result: ChatFinishResponse

    @Environment(ConfigStore.self) private var configStore
    @Environment(AppRouter.self) private var router
    @State private var showsEvolution: Bool

    init(result: ChatFinishResponse) {
        self.result = result
        _showsEvolution = State(initialValue: result.leveledUp)
    }

    private var config: AppConfig? { configStore.config }

    var body: some View {
        if showsEvolution {
            EvolutionRevealView(result: result) {
                withAnimation(.easeInOut(duration: 0.25)) { showsEvolution = false }
            }
            .transition(.opacity)
        } else {
            summary.transition(.opacity)
        }
    }

    // MARK: - Summary

    private var summary: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: GSpace.lg) {
                headline
                if !result.newBadges.isEmpty { badges }
                dimensions
                xpLedger
                featherLedger
                VStack(spacing: GSpace.sm) {
                    GButton("Start another debate", size: .lg, isFullWidth: true) { router.startAnotherDebate() }
                    GButton("Back to home", variant: .secondary, size: .lg, isFullWidth: true) { router.goHome() }
                }
                .padding(.top, GSpace.sm)
            }
            .padding(.horizontal, GSpace.gutter)
            .padding(.vertical, GSpace.xxl)
        }
        .background(Color.gBg.ignoresSafeArea())
    }

    private var headline: some View {
        VStack(spacing: GSpace.md) {
            AvatarView(stage: result.newLevel, equipped: result.equippedCosmetics, size: 150, animate: true)
                .accessibilityHidden(true)
            Text(result.overallScore >= 7 ? "That was a good conversation." : "Good effort. Keep practicing.")
                .gText(.displayMD)
                .foregroundStyle(Color.gInk)
                .multilineTextAlignment(.center)
            HStack(alignment: .firstTextBaseline, spacing: GSpace.sm) {
                Text(String(format: "%.1f", result.overallScore))
                    .font(GFont.font(.display, size: 56, weight: 700, relativeTo: .largeTitle))
                    .tracking(-2)
                    .monospacedDigit()
                    .foregroundStyle(scoreColor)
                Text("civility, out of 10").gText(.bodySM).foregroundStyle(Color.gInkMuted)
            }
            .accessibilityElement(children: .combine)
            if result.leveledUp {
                GBadge("Evolved to \(levelName(result.newLevel))", tone: .ochre, icon: .xp)
            }
            if result.streak > 1 {
                GBadge("\(result.streak)-day streak", tone: .primary, icon: .streak)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var scoreColor: Color {
        if result.overallScore >= 8 { return .gForest }
        if result.overallScore >= 6 { return .gOchre }
        return .gDanger
    }

    private var dimensions: some View {
        GCard {
            VStack(alignment: .leading, spacing: GSpace.lg) {
                Text("Civility breakdown").gText(.displaySM)
                ForEach(dimensionRows, id: \.key) { row in
                    DimensionRow(label: row.label, description: row.description, value: row.value)
                }
            }
        }
    }

    private var dimensionRows: [(key: String, label: String, description: String?, value: Double)] {
        let d = result.dimensions
        let values: [(String, Double)] = [
            ("participation", d.participation),
            ("selfExpressionReason", d.selfExpressionReason),
            ("mutualExchange", d.mutualExchange),
            ("interrogation", d.interrogation),
        ]
        return values.map { key, value in
            let info = config?.civility.dimensions.first { $0.key == key }
            return (key, info?.label ?? key, info?.description, value)
        }
    }

    private var xpLedger: some View {
        GCard {
            VStack(alignment: .leading, spacing: 0) {
                ledgerTitle("XP earned", icon: .xp,
                            note: "From civility, difficulty, the daily topic and your streak. XP grows your turkey.")
                LedgerRow(label: "Base", value: "+\(result.xp.base)")
                if result.xp.difficultyBonus > 0 {
                    LedgerRow(label: "Difficulty bonus", value: "+\(result.xp.difficultyBonus)", tone: .gDanger)
                }
                if result.xp.dailyBonus > 0 {
                    LedgerRow(label: "Daily Gobble", value: "+\(result.xp.dailyBonus)", tone: .gOchre)
                }
                if result.xp.streakMultiplier > 1 {
                    LedgerRow(label: "Streak multiplier",
                              value: "×" + String(format: "%.1f", result.xp.streakMultiplier), tone: .gPrimary)
                }
                LedgerTotal(value: "+\(result.xp.total) XP", tone: .gPrimary)
            }
        }
    }

    private var featherLedger: some View {
        GCard {
            VStack(alignment: .leading, spacing: 0) {
                ledgerTitle("Feathers earned", icon: .feather,
                            note: "From how much you took part. Spend them in the shop.")
                LedgerRow(label: "Messages sent", value: "+\(result.feathers.base)")
                if result.feathers.difficultyBonus != 0 {
                    LedgerRow(label: "Difficulty", value: signed(result.feathers.difficultyBonus), tone: .gDanger)
                }
                if result.feathers.dailyBonus > 0 {
                    LedgerRow(label: "Daily Gobble", value: "+\(result.feathers.dailyBonus)", tone: .gOchre)
                }
                LedgerTotal(value: "+\(result.feathers.total)", tone: .gOchre)
            }
        }
    }

    private var badges: some View {
        VStack(spacing: GSpace.lg) {
            Text(result.newBadges.count == 1 ? "New badge" : "New badges").gText(.displaySM)
            ForEach(result.newBadges, id: \.self) { key in
                let badge = config?.badges.first { $0.key == key }
                HStack(spacing: GSpace.md) {
                    ZStack {
                        Circle().fill(Color.gOchre)
                        GIcon(.badge, size: 24).foregroundStyle(Color.gInk)
                    }
                    .frame(width: 52, height: 52)
                    .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(badge?.name ?? key).gText(.body).fontWeight(.bold).foregroundStyle(Color.gInk)
                        if let description = badge?.description {
                            Text(description).gText(.bodyXS).foregroundStyle(Color.gInkSoft)
                        }
                    }
                    Spacer(minLength: 0)
                }
                .accessibilityElement(children: .combine)
            }
        }
        .padding(GSpace.xl)
        .frame(maxWidth: .infinity)
        .background(Color.gOchreSoft.opacity(0.5), in: RoundedRectangle(cornerRadius: GRadius.xl, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: GRadius.xl, style: .continuous).strokeBorder(Color.gOchre, lineWidth: 2))
    }

    private func ledgerTitle(_ title: String, icon: GIconName, note: String) -> some View {
        VStack(alignment: .leading, spacing: GSpace.xs) {
            HStack(spacing: GSpace.sm) {
                GIcon(icon, size: 16).foregroundStyle(Color.gPrimary)
                Text(title).gText(.displaySM)
            }
            Text(note).gText(.bodyXS).foregroundStyle(Color.gInkMuted)
        }
        .padding(.bottom, GSpace.sm)
    }

    private func signed(_ n: Int) -> String { n >= 0 ? "+\(n)" : "\(n)" }

    private func levelName(_ level: Int) -> String {
        config?.level(level)?.name ?? TurkeyStage.label(level)
    }
}

private struct DimensionRow: View {
    let label: String
    let description: String?
    let value: Double
    @State private var expanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Button {
                    withAnimation(.easeOut(duration: 0.15)) { expanded.toggle() }
                } label: {
                    HStack(spacing: 6) {
                        Text(label).gText(.bodySM).fontWeight(.semibold).foregroundStyle(Color.gInk)
                        if description != nil {
                            GIcon(.question, size: 13, weight: .regular).foregroundStyle(Color.gInkMuted)
                        }
                    }
                }
                .buttonStyle(.plain)
                .disabled(description == nil)
                .accessibilityHint(description == nil ? "" : "Shows what this measures")
                Spacer()
                Text(String(format: "%.1f", value))
                    .gText(.mono).fontWeight(.semibold).monospacedDigit()
                    .foregroundStyle(Color.gForest)
            }
            if expanded, let description {
                Text(description).gText(.bodyXS).foregroundStyle(Color.gInkSoft)
                    .fixedSize(horizontal: false, vertical: true)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.gBg)
                    Capsule().fill(Color.gForest)
                        .frame(width: geo.size.width * min(max(value / 10, 0), 1))
                }
            }
            .frame(height: 6)
            .accessibilityHidden(true)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label), \(String(format: "%.1f", value)) out of 10")
    }
}

private struct LedgerRow: View {
    let label: String
    let value: String
    var tone: Color = .gInk

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label).gText(.bodySM).foregroundStyle(Color.gInkSoft)
            Spacer()
            Text(value).gText(.mono).fontWeight(.semibold).monospacedDigit().foregroundStyle(tone)
        }
        .padding(.vertical, 6)
        .accessibilityElement(children: .combine)
    }
}

private struct LedgerTotal: View {
    let value: String
    let tone: Color

    var body: some View {
        VStack(spacing: 0) {
            Divider().overlay(Color.gLine).padding(.vertical, 6)
            HStack(alignment: .firstTextBaseline) {
                Text("Total").gText(.bodySM).fontWeight(.bold)
                Spacer()
                Text(value).gText(.mono).fontWeight(.bold).monospacedDigit().foregroundStyle(tone)
            }
            .accessibilityElement(children: .combine)
        }
    }
}

/// "Your turkey evolved": old stage, then the new one after a beat (web: `LevelUpOverlay`).
private struct EvolutionRevealView: View {
    let result: ChatFinishResponse
    let onContinue: () -> Void

    @Environment(ConfigStore.self) private var configStore
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var revealed = false

    private func level(_ n: Int) -> LevelDef? { configStore.config?.level(n) }
    private func name(_ n: Int) -> String { level(n)?.name ?? TurkeyStage.label(n) }

    var body: some View {
        VStack(spacing: GSpace.lg) {
            Spacer()
            Text("Your turkey evolved").gText(.bodySM).fontWeight(.semibold).foregroundStyle(Color.gPrimary)
            ZStack {
                if revealed {
                    AvatarView(stage: result.newLevel, equipped: result.equippedCosmetics, size: 180, animate: true)
                        .transition(.scale(scale: 0.8).combined(with: .opacity))
                } else {
                    AvatarView(stage: result.previousLevel, size: 150)
                        .opacity(0.6)
                        .transition(.opacity)
                }
            }
            .frame(height: 200)
            .accessibilityHidden(true)
            Text(revealed ? name(result.newLevel) : name(result.previousLevel))
                .gText(.displayLG).foregroundStyle(Color.gInk)
            Text(revealed ? (level(result.newLevel)?.description ?? "") : " ")
                .gText(.bodySM).foregroundStyle(Color.gInkSoft).multilineTextAlignment(.center)
            Spacer()
            if revealed {
                VStack(spacing: GSpace.md) {
                    Text("From \(name(result.previousLevel)) to \(name(result.newLevel)).")
                        .gText(.bodySM).foregroundStyle(Color.gInkSoft)
                    GButton("See your results", size: .lg, isFullWidth: true, action: onContinue)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .padding(GSpace.xxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.gBg.ignoresSafeArea())
        .task {
            try? await Task.sleep(for: .milliseconds(reduceMotion ? 300 : 900))
            withAnimation(reduceMotion ? nil : .spring(response: 0.5, dampingFraction: 0.7)) { revealed = true }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Your turkey evolved to \(name(result.newLevel))")
    }
}
