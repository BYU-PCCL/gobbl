import SwiftUI

/// Small status label (`Badge.tsx`).
struct GBadge: View {
    enum Tone { case neutral, primary, forest, ochre, danger }

    let text: String
    var tone: Tone = .neutral
    var icon: GIconName? = nil

    init(_ text: String, tone: Tone = .neutral, icon: GIconName? = nil) {
        self.text = text
        self.tone = tone
        self.icon = icon
    }

    var body: some View {
        HStack(spacing: 4) {
            if let icon { GIcon(icon, size: 11) }
            Text(text)
        }
        .font(GFont.font(.body, size: 11, weight: 700, relativeTo: .caption2))
        .textCase(.uppercase)
        .tracking(0.6)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .foregroundStyle(foreground)
        .background(background, in: Capsule())
    }

    private var foreground: Color {
        switch tone {
        case .neutral: return .gInkSoft
        case .primary: return .gPrimaryDeep
        case .forest: return .gForest
        case .ochre: return .gPrimaryDeep
        case .danger: return .gDanger
        }
    }

    private var background: Color {
        switch tone {
        case .neutral: return .gSurface2
        case .primary: return .gPrimarySoft
        case .forest: return .gForestSoft
        case .ochre: return .gOchreSoft
        case .danger: return .gDanger.opacity(0.12)
        }
    }
}
