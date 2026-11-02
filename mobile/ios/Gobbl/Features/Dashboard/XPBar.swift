import SwiftUI

/// Port of `XPBar.tsx`: primarySoft track, primary fill, primary-to-ochre gradient at 90% or more.
struct XPBar: View {
    var current: Int
    /// XP span of the level; 0 at max level (bar is full).
    var max: Int
    var level: Int
    var levelName: String

    private var fraction: Double {
        max > 0 ? Swift.min(1, Double(current) / Double(max)) : 1
    }

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.gPrimarySoft)
                Capsule()
                    .fill(fraction >= 0.9
                          ? AnyShapeStyle(LinearGradient(colors: [.gPrimary, .gOchre], startPoint: .leading, endPoint: .trailing))
                          : AnyShapeStyle(Color.gPrimary))
                    .frame(width: geo.size.width * fraction)
            }
        }
        .frame(height: 8)
        .animation(.easeOut(duration: 0.7), value: fraction)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Level \(level), \(levelName)")
        .accessibilityValue(max > 0 ? "\(current) of \(max) XP" : "Max level")
    }
}

#Preview {
    VStack(spacing: 16) {
        XPBar(current: 30, max: 100, level: 3, levelName: "Poult")
        XPBar(current: 95, max: 100, level: 3, levelName: "Poult")
        XPBar(current: 0, max: 0, level: 8, levelName: "Thunderbird")
    }
    .padding()
    .background(Color.gBg)
}
