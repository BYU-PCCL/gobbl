import SwiftUI

extension LevelChange: Identifiable {
    var id: String { "\(from)->\(to)" }
}

/// Port of `LevelUpModal.tsx`. The web's reward tiles are hardcoded placeholders; this shows only real data:
/// the shop items the new level unlocks and the level's own description from `/api/config`.
struct LevelUpView: View {
    let change: LevelChange
    let config: AppConfig?
    var onSeeWhatsNew: () -> Void
    var onSkip: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pulse = false

    private func stageName(_ level: Int) -> String { config?.level(level)?.name ?? TurkeyStage.label(level) }

    /// Shop items whose `unlockAt` is in (from, to].
    private var unlockedItemCount: Int {
        config?.shop.catalog.filter { item in
            guard let unlockAt = item.unlockAt else { return false }
            return unlockAt > change.from && unlockAt <= change.to
        }.count ?? 0
    }

    private var levelDescription: String? {
        let d = config?.level(change.to)?.description
        return (d?.isEmpty ?? true) ? nil : d
    }

    var body: some View {
        ZStack {
            Color.Art.ink.ignoresSafeArea()
            RadialGradient(colors: [Color.gOchre.opacity(0.35), Color.Art.terracotta.opacity(0.18), .clear],
                           center: UnitPoint(x: 0.5, y: 0.38), startRadius: 0, endRadius: 420)
                .ignoresSafeArea()
            confetti.ignoresSafeArea().accessibilityHidden(true)

            VStack(spacing: 0) {
                ScrollView {
                    VStack(spacing: 0) {
                        Text("Level up").gText(.eyebrow).tracking(3).foregroundStyle(Color.gOchre)
                            .padding(.top, 56)
                        (Text("You're a\n") + Text(stageName(change.to)).italic().foregroundColor(.gOchre) + Text(" now."))
                            .font(GFont.font(.display, size: 46, weight: 800, relativeTo: .largeTitle))
                            .tracking(-1.6)
                            .multilineTextAlignment(.center)
                            .foregroundStyle(Color.Art.cream)
                            .padding(.top, 12)
                            .accessibilityAddTraits(.isHeader)
                        if let levelDescription {
                            Text(levelDescription).gText(.bodySM)
                                .foregroundStyle(Color.Art.cream.opacity(0.65))
                                .multilineTextAlignment(.center)
                                .padding(.top, 8)
                        }
                        turkeys.padding(.top, 36)
                        if unlockedItemCount > 0 { rewards.padding(.top, 40) }
                    }
                    .padding(.horizontal, 24)
                }
                ctas
            }
            .frame(maxWidth: 520)
        }
        .preferredColorScheme(.dark)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 1.4).repeatForever(autoreverses: true)) { pulse = true }
        }
    }

    private var turkeys: some View {
        HStack(spacing: 24) {
            VStack(spacing: 4) {
                Image(TurkeyStage.imageName(change.from)).resizable().scaledToFit().frame(width: 80, height: 80)
                    .grayscale(1).blur(radius: 1)
                Text("LV.\(change.from) \(stageName(change.from))").gText(.bodyXS).textCase(.uppercase)
                    .foregroundStyle(Color.Art.cream.opacity(0.5))
            }
            .opacity(0.4)
            GIcon(.chevronRight, size: 20).foregroundStyle(Color.gOchre).accessibilityHidden(true)
            VStack(spacing: 4) {
                Image(TurkeyStage.imageName(change.to)).resizable().scaledToFit().frame(width: 140, height: 140)
                    .shadow(color: Color.gOchre.opacity(0.55), radius: 24)
                    .scaleEffect(pulse ? 1.04 : 1)
                Text("LV.\(change.to) \(stageName(change.to))").gText(.bodyXS).textCase(.uppercase).bold()
                    .foregroundStyle(Color.gOchre)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("From level \(change.from), \(stageName(change.from)), to level \(change.to), \(stageName(change.to))")
    }

    private var rewards: some View {
        VStack(spacing: 12) {
            Text("You unlocked").gText(.eyebrow).foregroundStyle(Color.Art.cream.opacity(0.4))
            VStack(spacing: 2) {
                Text("\(unlockedItemCount)")
                    .font(GFont.font(.display, size: 28, weight: 700, relativeTo: .title))
                    .foregroundStyle(Color.Art.cream)
                Text("Outfits unlocked").gText(.eyebrow).foregroundStyle(Color.Art.cream.opacity(0.55))
            }
            .frame(maxWidth: 160).padding(.vertical, 14).frame(maxWidth: .infinity)
            .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: GRadius.lg, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: GRadius.lg, style: .continuous).strokeBorder(Color.white.opacity(0.1)))
            .accessibilityElement(children: .combine)
        }
    }

    private var ctas: some View {
        VStack(spacing: 4) {
            Button(action: onSeeWhatsNew) {
                HStack(spacing: 8) {
                    Text("Show me what's new")
                    GIcon(.chevronRight, size: 14)
                }
                .font(GFont.font(.body, size: 16, weight: 700, relativeTo: .body))
                .foregroundStyle(Color.Art.ink)
                .frame(maxWidth: .infinity, minHeight: 52)
                .background(Color.gOchre, in: Capsule())
            }
            Button(action: onSkip) {
                Text("Skip for now")
                    .font(GFont.font(.body, size: 14, weight: 600, relativeTo: .subheadline))
                    .foregroundStyle(Color.Art.cream.opacity(0.7))
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 12)
    }

    /// Same deterministic formula as the web: x = (i*37+7)%100 %, y = (i*79+31)%80 %.
    private var confetti: some View {
        GeometryReader { geo in
            let colors: [Color] = [.gOchre, .gPrimary, .gForest, .gDanger, .white]
            ForEach(0..<36, id: \.self) { i in
                let shape = i % 4
                let w: CGFloat = [4, 8, 12, 6][shape]
                RoundedRectangle(cornerRadius: shape == 0 ? 2 : 1)
                    .fill(colors[i % colors.count])
                    .frame(width: w, height: 4)
                    .rotationEffect(.degrees(Double((i * 47) % 360)))
                    .opacity(0.85)
                    .position(x: geo.size.width * CGFloat((i * 37 + 7) % 100) / 100,
                              y: geo.size.height * CGFloat((i * 79 + 31) % 80) / 100)
            }
        }
    }
}

#Preview {
    LevelUpView(change: LevelChange(from: 2, to: 3), config: nil, onSeeWhatsNew: {}, onSkip: {})
}
