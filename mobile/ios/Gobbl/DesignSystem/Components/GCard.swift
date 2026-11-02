import SwiftUI

/// `Card.tsx`: 24 pt radius, hairline border, soft shadow. `inverted` paints cream-on-ink.
struct GCard<Content: View>: View {
    var inverted = false
    var active = false
    var bare = false
    @ViewBuilder let content: () -> Content

    init(inverted: Bool = false, active: Bool = false, bare: Bool = false,
         @ViewBuilder content: @escaping () -> Content) {
        self.inverted = inverted
        self.active = active
        self.bare = bare
        self.content = content
    }

    var body: some View {
        content()
            .padding(bare ? 0 : GSpace.xl)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(inverted ? Color.gInk : Color.gSurface, in: RoundedRectangle(cornerRadius: GRadius.xl, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: GRadius.xl, style: .continuous)
                    .strokeBorder(borderColor, lineWidth: active ? 2 : 1)
            )
            .foregroundStyle(inverted ? Color.gBg : Color.gInk)
            .clipShape(RoundedRectangle(cornerRadius: GRadius.xl, style: .continuous))
            .gShadowSoft()
    }

    private var borderColor: Color {
        if active { return .gPrimary }
        return inverted ? .clear : .gLine
    }
}

/// Mono uppercase label above a card title (`.eyebrow`).
struct GEyebrow: View {
    let text: String
    var color: Color = .gInkMuted
    init(_ text: String, color: Color = .gInkMuted) {
        self.text = text
        self.color = color
    }
    var body: some View {
        Text(text).gText(.eyebrow).foregroundStyle(color)
    }
}
