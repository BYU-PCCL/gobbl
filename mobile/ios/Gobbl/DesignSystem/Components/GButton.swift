import SwiftUI

/// Pill button matching `Button.tsx`: six variants, three sizes, loading state.
struct GButton: View {
    enum Variant { case primary, secondary, outline, ghost, danger, dark }
    enum Size { case sm, md, lg }

    let title: String
    var variant: Variant = .primary
    var size: Size = .md
    var icon: GIconName? = nil
    var isLoading = false
    var isFullWidth = false
    let action: () -> Void

    init(_ title: String, variant: Variant = .primary, size: Size = .md, icon: GIconName? = nil,
         isLoading: Bool = false, isFullWidth: Bool = false, action: @escaping () -> Void) {
        self.title = title
        self.variant = variant
        self.size = size
        self.icon = icon
        self.isLoading = isLoading
        self.isFullWidth = isFullWidth
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: GSpace.sm) {
                if isLoading {
                    ProgressView().controlSize(.small)
                } else {
                    if let icon { GIcon(icon, size: size == .sm ? 14 : 16) }
                    Text(title)
                }
            }
            .frame(maxWidth: isFullWidth ? .infinity : nil)
        }
        .buttonStyle(GButtonStyle(variant: variant, size: size))
        .disabled(isLoading)
        .accessibilityLabel(title)
    }
}

struct GButtonStyle: ButtonStyle {
    let variant: GButton.Variant
    let size: GButton.Size
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(GFont.font(.body, size: fontSize, weight: 600, relativeTo: .body))
            .foregroundStyle(foreground)
            .padding(.horizontal, horizontalPadding)
            .frame(minHeight: height)
            .background(background(pressed: configuration.isPressed), in: Capsule())
            .overlay(
                Capsule().strokeBorder(borderColor(pressed: configuration.isPressed), lineWidth: 1)
            )
            .modifier(ShadowIf(apply: variant == .primary, pressed: configuration.isPressed))
            .opacity(isEnabled ? 1 : 0.5)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
            .contentShape(Capsule())
    }

    private var height: CGFloat {
        switch size {
        case .sm: return 36
        case .md: return 44
        case .lg: return 50
        }
    }

    private var horizontalPadding: CGFloat {
        switch size {
        case .sm: return 14
        case .md: return 20
        case .lg: return 24
        }
    }

    private var fontSize: CGFloat {
        switch size {
        case .sm: return 13
        case .md: return 14
        case .lg: return 16
        }
    }

    private var foreground: Color {
        switch variant {
        case .primary, .danger: return .white
        case .secondary: return .gPrimaryDeep
        case .outline: return .gInk
        case .ghost: return .gInkSoft
        case .dark: return .gBg
        }
    }

    private func background(pressed: Bool) -> Color {
        switch variant {
        case .primary: return pressed ? .gPrimaryPressed : .gPrimary
        case .secondary: return pressed ? .gPrimarySoft.opacity(0.7) : .gPrimarySoft
        case .outline: return pressed ? .gSurface2 : .clear
        case .ghost: return pressed ? .gSurface2 : .clear
        case .danger: return pressed ? .gDanger.opacity(0.85) : .gDanger
        case .dark: return pressed ? .gInk.opacity(0.85) : .gInk
        }
    }

    private func borderColor(pressed: Bool) -> Color {
        switch variant {
        case .outline: return pressed ? .gInkMuted : .gLine
        default: return .clear
        }
    }

    private struct ShadowIf: ViewModifier {
        let apply: Bool
        let pressed: Bool
        func body(content: Content) -> some View {
            if apply, !pressed {
                content.gShadowSoft()
            } else {
                content
            }
        }
    }
}
