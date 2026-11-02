import SwiftUI

/// Spacing scale (points).
enum GSpace {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 20
    static let xxl: CGFloat = 24
    static let xxxl: CGFloat = 32
    /// Horizontal page gutter (`px-5`).
    static let gutter: CGFloat = 20
}

/// Border radii from `tailwind.config.ts`.
enum GRadius {
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let base: CGFloat = 14
    static let lg: CGFloat = 18
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 28
    static let xxxl: CGFloat = 36
}

extension View {
    /// `shadow-soft`: the default warm card shadow.
    func gShadowSoft() -> some View {
        shadow(color: Color.Art.ink.opacity(0.08), radius: 12, x: 0, y: 4)
    }

    /// `shadow-lift`: pressable or floating elements.
    func gShadowLift() -> some View {
        shadow(color: Color.Art.ink.opacity(0.14), radius: 20, x: 0, y: 8)
    }

    /// `shadow-ring`: ochre glow for level-up moments.
    func gShadowRing() -> some View {
        shadow(color: Color.gOchre.opacity(0.55), radius: 24, x: 0, y: 0)
    }
}
