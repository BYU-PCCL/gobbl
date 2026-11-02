import Foundation

struct TurnCivility: Codable, Equatable {
    var dimensions: CivilityDimensions
    var overall: Double
    var feedback: String
}

/// Per-turn success of `POST /api/chat`. `aiCivility` is always null today and is ignored.
struct ChatTurnResponse: Codable, Equatable {
    var aiResponse: String
    var civility: TurnCivility
    /// 1-based count of the user's turns including this one.
    var turnNumber: Int
    var maxTurns: Int
}

struct XPLedger: Codable, Equatable {
    var base: Int
    var difficultyBonus: Int
    var dailyBonus: Int
    var streakMultiplier: Double
    var total: Int
}

struct FeatherLedger: Codable, Equatable {
    var base: Int
    var difficultyBonus: Int
    var dailyBonus: Int
    var total: Int
}

/// Finish success of `POST /api/chat`. Compare `newLevel` with `previousLevel` for a level-up.
struct ChatFinishResponse: Codable, Equatable {
    var finished: Bool
    var overallScore: Double
    var dimensions: CivilityDimensions
    var xp: XPLedger
    var feathers: FeatherLedger
    var previousLevel: Int
    var newLevel: Int
    var newBadges: [String]
    var streak: Int
    var civilityScore: Double
    var equippedCosmetics: EquippedCosmetics

    var leveledUp: Bool { newLevel > previousLevel }
}

/// `POST /api/chat` returns one of two shapes depending on `finish`.
enum ChatResponse: Decodable, Equatable {
    case turn(ChatTurnResponse)
    case finished(ChatFinishResponse)

    private enum Probe: String, CodingKey { case finished }

    init(from decoder: Decoder) throws {
        let probe = try decoder.container(keyedBy: Probe.self)
        if (try probe.decodeIfPresent(Bool.self, forKey: .finished)) == true {
            self = .finished(try ChatFinishResponse(from: decoder))
        } else {
            self = .turn(try ChatTurnResponse(from: decoder))
        }
    }
}
