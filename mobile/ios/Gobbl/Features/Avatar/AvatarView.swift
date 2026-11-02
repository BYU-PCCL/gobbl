import SwiftUI

/// The turkey with its equipped items, in the same layer order as `AvatarWithItems.tsx`:
/// background (clipped squircle) → ground shadow → cape → turkey → hat → face → neck → chest.
/// Item offsets are `anchor * size / 200`, from `/api/config` (`avatarAnchors`) or the built-in fallback.
struct AvatarView: View {
    var stage: Int
    var equipped: EquippedCosmetics = .none
    var size: CGFloat = 96
    var anchors: StageAnchors? = nil
    var animate = false
    var showShadow = true

    @Environment(ConfigStore.self) private var configStore: ConfigStore?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var phase = false

    private var clampedStage: Int { TurkeyStage.clamp(stage) }

    private var resolvedAnchors: StageAnchors {
        anchors ?? TurkeyStage.anchors(for: clampedStage, config: configStore?.config)
    }

    private var isAnimating: Bool { animate && !reduceMotion && clampedStage >= 5 }

    var body: some View {
        ZStack {
            if let background = equipped.background {
                AvatarBackground.view(for: background)
                    .frame(width: size, height: size)
                    .clipShape(RoundedRectangle(cornerRadius: size * 0.32, style: .continuous))
            }
            if showShadow {
                Ellipse()
                    .fill(Color.Art.ink.opacity(0.18))
                    .frame(width: size * 0.42, height: size * 0.05)
                    .position(x: size * 0.5, y: size * 0.92)
            }
            Group {
                itemLayer(.cape)
                Image(TurkeyStage.imageName(clampedStage))
                    .resizable()
                    .scaledToFit()
                    .frame(width: size, height: size)
                itemLayer(.hat)
                itemLayer(.face)
                itemLayer(.neck)
                itemLayer(.chest)
            }
            .offset(y: isAnimating && phase ? -size * 0.025 : 0)
            .rotationEffect(.degrees(isAnimating && clampedStage >= 7 ? (phase ? 2 : -2) : 0))
            .animation(isAnimating ? .easeInOut(duration: 1.6).repeatForever(autoreverses: true) : .default,
                       value: phase)
        }
        .frame(width: size, height: size)
        .onAppear { if isAnimating { phase = true } }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityDescription)
    }

    @ViewBuilder
    private func itemLayer(_ slot: ShopSlot) -> some View {
        if let itemId = equipped[slot] {
            let offset = resolvedAnchors[slot]
            Image(TurkeyStage.itemImageName(itemId))
                .resizable()
                .scaledToFit()
                .frame(width: size, height: size)
                .offset(x: offset.x * size / 200, y: offset.y * size / 200)
        }
    }

    private var accessibilityDescription: String {
        let items = equipped.equippedPairs.map(\.itemId)
        let base = "\(TurkeyStage.label(clampedStage)) turkey"
        return items.isEmpty ? base : "\(base) wearing \(items.joined(separator: ", "))"
    }
}

/// A shop tile preview: the background alone, or a stage-5 turkey wearing just that item.
struct ItemPreview: View {
    let item: ShopItem
    var size: CGFloat = 120

    var body: some View {
        if item.slot == .background {
            AvatarBackground.view(for: item.id)
                .frame(width: size, height: size)
                .clipShape(RoundedRectangle(cornerRadius: size * 0.2, style: .continuous))
        } else {
            var equipped = EquippedCosmetics.none
            let _ = { equipped[item.slot] = item.id }()
            AvatarView(stage: 5, equipped: equipped, size: size, showShadow: false)
        }
    }
}

#Preview("Stages") {
    ScrollView(.horizontal) {
        HStack(alignment: .bottom, spacing: 16) {
            ForEach(1...8, id: \.self) { stage in
                VStack {
                    AvatarView(stage: stage, size: CGFloat(44 + (stage - 1) * 14), animate: true)
                    Text(TurkeyStage.label(stage)).gText(.bodyXS)
                }
            }
        }
        .padding()
    }
    .background(Color.gBg)
}

#Preview("Dressed") {
    AvatarView(stage: 5,
               equipped: EquippedCosmetics(hat: "crown", face: "monocle", neck: "bowtie", cape: "cape", background: "sunset"),
               size: 220, animate: true)
        .padding()
        .background(Color.gBg)
}
