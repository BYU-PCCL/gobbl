import Foundation

/// The eight turkey stages. Avatar stage == user level (the web renders `stage={user.level}`).
enum TurkeyStage {
    static let range = 1...8

    static let labels: [Int: String] = [
        1: "Egg", 2: "Hatchling", 3: "Poult", 4: "Youngster",
        5: "Tom", 6: "Gobbler", 7: "Grand Gobbler", 8: "Thunderbird",
    ]

    static func clamp(_ stage: Int) -> Int { min(max(stage, range.lowerBound), range.upperBound) }

    static func label(_ stage: Int) -> String { labels[clamp(stage)] ?? "Turkey" }

    /// Asset catalog name for a stage (`Assets.xcassets/Avatars/turkey_stage_N`).
    static func imageName(_ stage: Int) -> String { "turkey_stage_\(clamp(stage))" }

    /// Asset catalog name for a shop item (`item_<id>`). Gradient backgrounds are drawn in SwiftUI instead.
    static func itemImageName(_ itemId: String) -> String { "item_\(itemId)" }

    /// Offsets from `src/lib/avatarAnchors.ts`, used until `/api/config` has loaded.
    static let fallbackAnchors: [Int: StageAnchors] = [
        3: StageAnchors(hat: SlotOffset(x: -28, y: -10), face: SlotOffset(x: -38, y: -6),
                        neck: SlotOffset(x: -20, y: -5), chest: SlotOffset(x: -10, y: -8),
                        cape: SlotOffset(x: -10, y: 0)),
        4: StageAnchors(hat: SlotOffset(x: -26, y: -8), face: SlotOffset(x: -36, y: -4),
                        neck: SlotOffset(x: -18, y: -4), chest: SlotOffset(x: -8, y: -6),
                        cape: SlotOffset(x: -8, y: 0)),
    ]

    static func anchors(for stage: Int, config: AppConfig?) -> StageAnchors {
        if let config { return config.anchors(forStage: stage) }
        return fallbackAnchors[stage] ?? StageAnchors()
    }
}
