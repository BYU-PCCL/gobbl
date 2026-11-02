import SwiftUI

/// Port of `StatsCard.tsx`: eyebrow label, big display value, optional unit.
struct StatTile: View {
    var label: String
    var value: String
    var unit: String? = nil
    var color: Color = .gInk

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).gText(.eyebrow).foregroundStyle(Color.gInkMuted).lineLimit(1)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value)
                    .font(GFont.font(.display, size: 28, weight: 700, relativeTo: .title))
                    .tracking(-0.8)
                    .monospacedDigit()
                    .foregroundStyle(color)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                if let unit {
                    Text(unit).gText(.bodyXS).foregroundStyle(Color.gInkMuted).lineLimit(1)
                }
            }
        }
        .padding(GSpace.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.gSurface, in: RoundedRectangle(cornerRadius: GRadius.lg, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: GRadius.lg, style: .continuous).strokeBorder(Color.gLine, lineWidth: 1))
        .accessibilityElement(children: .combine)
    }
}

#Preview {
    HStack {
        StatTile(label: "Civility", value: "82", unit: "/100", color: .gForest)
        StatTile(label: "Streak", value: "4", unit: "days", color: .gPrimary)
        StatTile(label: "Debates", value: "12", unit: "total", color: .gOchre)
    }
    .padding()
    .background(Color.gBg)
}
