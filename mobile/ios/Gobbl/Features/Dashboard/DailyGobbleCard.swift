import SwiftUI

/// Port of `DailyChallenge.tsx`: inverted ink card with ochre accents and a faint stage-6 turkey.
/// The web hardcodes "6h left"; here it is the real time until the next UTC midnight.
struct DailyGobbleCard: View {
    var topic: Topic
    var completed: Bool
    var bonusFeathers: Int
    var bonusXp: Int
    var onStart: () -> Void

    /// "6h left", "<1h left". The Daily Gobble rolls over at 00:00 UTC.
    static func timeLeftLabel(now: Date = Date()) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC") ?? .gmt
        let midnight = calendar.nextDate(after: now, matching: DateComponents(hour: 0, minute: 0, second: 0),
                                         matchingPolicy: .nextTime) ?? now.addingTimeInterval(86_400)
        let minutes = Int(midnight.timeIntervalSince(now) / 60)
        if minutes < 60 { return "<1h left" }
        return "\(minutes / 60)h left"
    }

    var body: some View {
        GCard(inverted: true) {
            ZStack(alignment: .bottomTrailing) {
                Image(TurkeyStage.imageName(6))
                    .resizable().scaledToFit()
                    .frame(width: 150, height: 150)
                    .opacity(0.2)
                    .offset(x: 30, y: 40)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: GSpace.sm) {
                    HStack(alignment: .firstTextBaseline) {
                        GEyebrow(completed ? "Completed today" : "Today's Gobble · \(topic.category)", color: .gOchre)
                        Spacer(minLength: GSpace.sm)
                        if completed {
                            GIcon(.check, size: 14).foregroundStyle(Color.gBg.opacity(0.6))
                                .accessibilityHidden(true)
                        } else {
                            Text(Self.timeLeftLabel()).gText(.eyebrow).textCase(nil)
                                .foregroundStyle(Color.gBg.opacity(0.6))
                        }
                    }
                    Text(topic.title)
                        .font(GFont.font(.display, size: 22, weight: 600, relativeTo: .title2))
                        .tracking(-0.4)
                        .foregroundStyle(Color.gBg)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.trailing, 40)
                    if completed {
                        Text("Nice gobble. Come back tomorrow for a fresh topic.")
                            .gText(.bodySM).foregroundStyle(Color.gBg.opacity(0.7))
                            .padding(.trailing, 40)
                    } else {
                        Button("Start practice", action: onStart)
                            .buttonStyle(OchreButtonStyle())
                            .padding(.top, GSpace.xs)
                        Text("+\(bonusFeathers) feathers · +\(bonusXp) XP")
                            .gText(.bodyXS).foregroundStyle(Color.gBg.opacity(0.55))
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}

/// Ochre pill with ink text, the one button style the inverted card needs.
private struct OchreButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(GFont.font(.body, size: 14, weight: 700, relativeTo: .body))
            .foregroundStyle(Color.Art.ink)
            .padding(.horizontal, 20)
            .frame(minHeight: 44)
            .background(Color.gOchre, in: Capsule())
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .contentShape(Capsule())
    }
}

#Preview {
    let topic = Topic(id: "t", title: "Should voting be mandatory?", description: "d", category: "Politics", prompt: "p")
    return VStack {
        DailyGobbleCard(topic: topic, completed: false, bonusFeathers: 50, bonusXp: 25) {}
        DailyGobbleCard(topic: topic, completed: true, bonusFeathers: 50, bonusXp: 25) {}
    }
    .padding().background(Color.gBg)
    .gobblEnvironment(.preview())
}
