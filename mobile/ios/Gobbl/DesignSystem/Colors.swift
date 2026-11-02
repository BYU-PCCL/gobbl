import SwiftUI

/// Semantic palette from `src/app/globals.css`. Light and dark values live in Assets.xcassets/Colors.
extension Color {
    static let gBg = Color("Bg")
    static let gSurface = Color("Surface")
    static let gSurface2 = Color("Surface2")
    static let gInk = Color("Ink")
    static let gInkSoft = Color("InkSoft")
    static let gInkMuted = Color("InkMuted")
    static let gLine = Color("Line")
    static let gPrimary = Color("Primary")
    static let gPrimarySoft = Color("PrimarySoft")
    /// `gobbl-600`: pressed primary buttons.
    static let gPrimaryPressed = Color("PrimaryPressed")
    /// `gobbl-700`: text on primary-soft (secondary buttons).
    static let gPrimaryDeep = Color("PrimaryDeep")
    static let gForest = Color("Forest")
    static let gForestSoft = Color("ForestSoft")
    static let gOchre = Color("Ochre")
    static let gOchreSoft = Color("OchreSoft")
    /// `plume-500`: form errors and destructive actions.
    static let gDanger = Color("Danger")

    /// Fixed artwork colors that do not flip with the theme (avatar shadow, backgrounds).
    enum Art {
        static let ink = Color(red: 0x1A / 255, green: 0x16 / 255, blue: 0x12 / 255)
        static let sunsetTop = Color(red: 0x7A / 255, green: 0x29 / 255, blue: 0x16 / 255)
        static let sunsetMid = Color(red: 0xC0 / 255, green: 0x46 / 255, blue: 0x1C / 255)
        static let sunsetWarm = Color(red: 0xE4 / 255, green: 0xA5 / 255, blue: 0x47 / 255)
        static let sunsetBottom = Color(red: 0xFB / 255, green: 0xE9 / 255, blue: 0xC4 / 255)
        static let sun = Color(red: 0xFF / 255, green: 0xD8 / 255, blue: 0x6B / 255)
        static let cosmicCenter = Color(red: 0x3A / 255, green: 0x2D / 255, blue: 0x5C / 255)
        static let cosmicMid = Color(red: 0x1F / 255, green: 0x18 / 255, blue: 0x38 / 255)
        static let cosmicEdge = Color(red: 0x0F / 255, green: 0x0A / 255, blue: 0x20 / 255)
        static let moon = Color(red: 0xF4 / 255, green: 0xE3 / 255, blue: 0xD5 / 255)
        static let cream = Color(red: 0xF4 / 255, green: 0xEC / 255, blue: 0xDD / 255)
        static let terracotta = Color(red: 0xC0 / 255, green: 0x46 / 255, blue: 0x1C / 255)
    }

    /// `#RRGGBB` from the API (shop item accents).
    init?(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("#") { s.removeFirst() }
        guard s.count == 6, let v = UInt32(s, radix: 16) else { return nil }
        self.init(red: Double((v >> 16) & 0xFF) / 255,
                  green: Double((v >> 8) & 0xFF) / 255,
                  blue: Double(v & 0xFF) / 255)
    }
}
