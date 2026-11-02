import SwiftUI

/// The three shop backgrounds that use gradients or patterns on the web (`ItemLayers.tsx`),
/// drawn natively because the SVG exporter skips `<defs>`. All other backgrounds are image sets.
enum AvatarBackground {
    static let nativeIds: Set<String> = ["sunset", "cosmic", "dots"]

    @ViewBuilder
    static func view(for itemId: String) -> some View {
        switch itemId {
        case "sunset": SunsetBackground()
        case "cosmic": CosmicBackground()
        case "dots": DotsBackground()
        default:
            Image(TurkeyStage.itemImageName(itemId))
                .resizable()
                .scaledToFill()
        }
    }
}

struct SunsetBackground: View {
    var body: some View {
        GeometryReader { geo in
            let s = geo.size.width / 200
            ZStack {
                LinearGradient(
                    stops: [
                        .init(color: Color.Art.sunsetTop, location: 0),
                        .init(color: Color.Art.sunsetMid, location: 0.4),
                        .init(color: Color.Art.sunsetWarm, location: 0.75),
                        .init(color: Color.Art.sunsetBottom, location: 1),
                    ],
                    startPoint: .top, endPoint: .bottom)
                Circle().fill(Color.Art.sun.opacity(0.25)).frame(width: 72 * s).position(x: 100 * s, y: 130 * s)
                Circle().fill(Color.Art.sun.opacity(0.95)).frame(width: 56 * s).position(x: 100 * s, y: 130 * s)
                Rectangle().fill(Color.Art.sunsetTop.opacity(0.55))
                    .frame(width: 200 * s, height: 50 * s).position(x: 100 * s, y: 175 * s)
                birds(scale: s)
            }
        }
        .aspectRatio(1, contentMode: .fill)
    }

    private func birds(scale s: CGFloat) -> some View {
        Path { p in
            p.move(to: CGPoint(x: 30 * s, y: 60 * s))
            p.addQuadCurve(to: CGPoint(x: 38 * s, y: 60 * s), control: CGPoint(x: 34 * s, y: 56 * s))
            p.addQuadCurve(to: CGPoint(x: 46 * s, y: 60 * s), control: CGPoint(x: 42 * s, y: 56 * s))
            p.move(to: CGPoint(x: 150 * s, y: 80 * s))
            p.addQuadCurve(to: CGPoint(x: 158 * s, y: 80 * s), control: CGPoint(x: 154 * s, y: 76 * s))
            p.addQuadCurve(to: CGPoint(x: 166 * s, y: 80 * s), control: CGPoint(x: 162 * s, y: 76 * s))
        }
        .stroke(Color.Art.ink, style: StrokeStyle(lineWidth: 1.4 * s, lineCap: .round))
    }
}

struct CosmicBackground: View {
    private static let stars: [(x: CGFloat, y: CGFloat)] = [
        (20, 30), (38, 18), (58, 42), (170, 28), (182, 68), (160, 12), (14, 82), (12, 140),
        (188, 118), (176, 160), (28, 170), (80, 16), (120, 12), (44, 68), (154, 84),
    ]

    var body: some View {
        GeometryReader { geo in
            let s = geo.size.width / 200
            ZStack {
                RadialGradient(
                    stops: [
                        .init(color: Color.Art.cosmicCenter, location: 0),
                        .init(color: Color.Art.cosmicMid, location: 0.6),
                        .init(color: Color.Art.cosmicEdge, location: 1),
                    ],
                    center: UnitPoint(x: 0.5, y: 0.6), startRadius: 0, endRadius: 120 * s)
                ForEach(Array(Self.stars.enumerated()), id: \.offset) { i, star in
                    Circle()
                        .fill(Color.Art.sun.opacity(0.6 + Double(i % 3) * 0.15))
                        .frame(width: (i % 4 == 0 ? 3.2 : 1.8) * s)
                        .position(x: star.x * s, y: star.y * s)
                }
                Image(systemName: "sparkle")
                    .font(.system(size: 10 * s))
                    .foregroundStyle(Color.Art.sun)
                    .position(x: 168 * s, y: 44 * s)
                Circle().fill(Color.Art.moon).frame(width: 18 * s).position(x: 34 * s, y: 48 * s)
                Circle().fill(Color.Art.cosmicCenter).frame(width: 14 * s).position(x: 38 * s, y: 46 * s)
            }
        }
        .aspectRatio(1, contentMode: .fill)
    }
}

struct DotsBackground: View {
    var body: some View {
        Canvas { context, size in
            context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(Color.Art.cream))
            let s = size.width / 200
            let step = 14 * s
            let r = 1.2 * s
            var y: CGFloat = 2 * s
            while y < size.height {
                var x: CGFloat = 2 * s
                while x < size.width {
                    context.fill(Path(ellipseIn: CGRect(x: x - r, y: y - r, width: 2 * r, height: 2 * r)),
                                 with: .color(Color.Art.terracotta.opacity(0.35)))
                    x += step
                }
                y += step
            }
        }
        .aspectRatio(1, contentMode: .fill)
    }
}
