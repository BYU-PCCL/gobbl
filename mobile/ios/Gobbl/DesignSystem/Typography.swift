import SwiftUI
import CoreText
#if canImport(UIKit)
import UIKit
#endif

/// The three bundled variable fonts (OFL, in Resources/Fonts). Weight and optical size are set
/// through CoreText variation axes, so one file per family covers every weight the web uses.
enum GFont {
    enum Family: String {
        case display = "Bricolage Grotesque"
        case body = "DM Sans"
        case mono = "JetBrains Mono"
    }

    private static let wghtAxis = 0x77676874 // 'wght'
    private static let opszAxis = 0x6F70737A // 'opsz'

    /// - Parameters:
    ///   - weight: CSS-style 100...900.
    ///   - relativeTo: Dynamic Type style the size scales with.
    static func font(_ family: Family, size: CGFloat, weight: CGFloat = 400,
                     relativeTo style: Font.TextStyle = .body) -> Font {
        let scaled = scaledSize(size, relativeTo: style)
        var variations: [Int: CGFloat] = [wghtAxis: weight]
        if family != .mono { variations[opszAxis] = min(max(scaled, 12), 96) }
        let attributes: [CFString: Any] = [
            kCTFontFamilyNameAttribute: family.rawValue,
            kCTFontVariationAttribute: variations as CFDictionary,
        ]
        let descriptor = CTFontDescriptorCreateWithAttributes(attributes as CFDictionary)
        let font = CTFontCreateWithFontDescriptor(descriptor, scaled, nil)
        // If the family is not registered (fonts missing from UIAppFonts), CoreText silently
        // substitutes; fall back to the system font so the mismatch is at least consistent.
        if (CTFontCopyFamilyName(font) as String) != family.rawValue {
            return systemFallback(family, size: scaled, weight: weight)
        }
        return Font(font)
    }

    private static func systemFallback(_ family: Family, size: CGFloat, weight: CGFloat) -> Font {
        let w: Font.Weight
        switch weight {
        case ..<450: w = .regular
        case ..<550: w = .medium
        case ..<650: w = .semibold
        case ..<750: w = .bold
        default: w = .heavy
        }
        return .system(size: size, weight: w, design: family == .mono ? .monospaced : .default)
    }

    static func scaledSize(_ size: CGFloat, relativeTo style: Font.TextStyle) -> CGFloat {
        #if canImport(UIKit)
        return UIFontMetrics(forTextStyle: style.uiTextStyle).scaledValue(for: size)
        #else
        return size
        #endif
    }
}

#if canImport(UIKit)
private extension Font.TextStyle {
    var uiTextStyle: UIFont.TextStyle {
        switch self {
        case .largeTitle: return .largeTitle
        case .title: return .title1
        case .title2: return .title2
        case .title3: return .title3
        case .headline: return .headline
        case .subheadline: return .subheadline
        case .callout: return .callout
        case .footnote: return .footnote
        case .caption: return .caption1
        case .caption2: return .caption2
        default: return .body
        }
    }
}
#endif

/// Named text styles mirroring `tailwind.config.ts` (`text-display-*`, `text-eyebrow`, body sizes).
enum GTextStyle {
    case display2XL, displayXL, displayLG, displayMD, displaySM
    case body, bodySM, bodyXS
    case eyebrow, mono, monoLG

    var font: Font {
        switch self {
        case .display2XL: return GFont.font(.display, size: 48, weight: 700, relativeTo: .largeTitle)
        case .displayXL: return GFont.font(.display, size: 36, weight: 700, relativeTo: .largeTitle)
        case .displayLG: return GFont.font(.display, size: 30, weight: 700, relativeTo: .title)
        case .displayMD: return GFont.font(.display, size: 24, weight: 700, relativeTo: .title2)
        case .displaySM: return GFont.font(.display, size: 19, weight: 700, relativeTo: .title3)
        case .body: return GFont.font(.body, size: 16, weight: 400, relativeTo: .body)
        case .bodySM: return GFont.font(.body, size: 14, weight: 400, relativeTo: .subheadline)
        case .bodyXS: return GFont.font(.body, size: 12, weight: 400, relativeTo: .caption)
        case .eyebrow: return GFont.font(.mono, size: 11, weight: 600, relativeTo: .caption2)
        case .mono: return GFont.font(.mono, size: 13, weight: 500, relativeTo: .footnote)
        case .monoLG: return GFont.font(.mono, size: 22, weight: 600, relativeTo: .title2)
        }
    }

    /// Display sizes carry negative tracking in the web design; the eyebrow is wide and uppercase.
    var tracking: CGFloat {
        switch self {
        case .display2XL: return -2.0
        case .displayXL: return -1.4
        case .displayLG: return -1.0
        case .displayMD: return -0.6
        case .displaySM: return -0.3
        case .eyebrow: return 1.3
        default: return 0
        }
    }

    var lineSpacing: CGFloat {
        switch self {
        case .display2XL, .displayXL: return -4
        case .body, .bodySM: return 3
        default: return 0
        }
    }

    var isUppercase: Bool { self == .eyebrow }
}

struct GTextStyleModifier: ViewModifier {
    let style: GTextStyle
    func body(content: Content) -> some View {
        content
            .font(style.font)
            .tracking(style.tracking)
            .lineSpacing(max(style.lineSpacing, 0))
            .textCase(style.isUppercase ? .uppercase : nil)
    }
}

extension View {
    func gText(_ style: GTextStyle) -> some View {
        modifier(GTextStyleModifier(style: style))
    }
}

extension Text {
    /// Body font at a given weight, for inline emphasis.
    func gBody(size: CGFloat = 16, weight: CGFloat = 400, relativeTo style: Font.TextStyle = .body) -> Text {
        font(GFont.font(.body, size: size, weight: weight, relativeTo: style))
    }
}
