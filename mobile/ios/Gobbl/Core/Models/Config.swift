import Foundation

/// `GET /api/config`. Everything that lives only in server TypeScript.
struct AppConfig: Codable, Equatable {
    var configVersion: Int
    var minClientVersion: MinClientVersion
    var rules: Rules
    var today: Today
    var topics: [Topic]
    var categories: [String]
    var difficulties: [DifficultyDef]
    var levels: [LevelDef]
    var badges: [BadgeDef]
    var shop: ShopConfig
    /// Keyed by avatar stage number as a string ("3", "4"). Other stages have no entry.
    var avatarAnchors: [String: StageAnchors]
    var survey: SurveyConfig
    var ideologyOptions: [IdeologyOption]
    var civility: CivilityConfig

    struct MinClientVersion: Codable, Equatable {
        var ios: String?
    }

    struct Rules: Codable, Equatable {
        var maxTurns: Int
        var maxMessageChars: Int
        var dailyBonusXp: Int
        var dailyBonusFeathers: Int
    }

    struct Today: Codable, Equatable {
        /// `YYYY-MM-DD`, UTC.
        var date: String
        var dailyTopic: Topic
    }

    struct SurveyConfig: Codable, Equatable {
        var questions: [SurveyQuestion]
    }

    struct CivilityConfig: Codable, Equatable {
        var dimensions: [CivilityDimensionInfo]
    }

    func anchors(forStage stage: Int) -> StageAnchors {
        avatarAnchors[String(stage)] ?? StageAnchors()
    }

    func level(_ number: Int) -> LevelDef? {
        levels.first { $0.level == number }
    }

    func difficulty(_ tier: DifficultyTier) -> DifficultyDef? {
        difficulties.first { $0.key == tier }
    }

    func shopItem(id: String) -> ShopItem? {
        shop.catalog.first { $0.id == id }
    }
}

struct Topic: Codable, Equatable, Identifiable, Hashable {
    var id: String
    var title: String
    var description: String
    var category: String
    var prompt: String

    /// The server's own `formatTopicForDebate`: what `POST /api/debates` conventionally receives as `topic`.
    var debateTopic: String { "\(title) — \(description)" }
}

struct DifficultyDef: Codable, Equatable, Identifiable {
    var key: DifficultyTier
    var label: String
    var multiplier: Double
    var description: String
    var id: String { key.string }
}

struct LevelDef: Codable, Equatable, Identifiable {
    var level: Int
    var name: String
    var xpRequired: Int
    var description: String
    var id: Int { level }
}

/// `LevelDef` plus progress inside the level, as computed by the server for a given XP.
struct LevelInfo: Codable, Equatable {
    var level: Int
    var name: String
    var xpRequired: Int
    var description: String
    /// XP span of the current level; 0 at max level.
    var xpForNext: Int
    var xpProgress: Int
    /// 0-100.
    var progressPercent: Double
}

struct BadgeDef: Codable, Equatable, Identifiable {
    var key: String
    var name: String
    var description: String
    var id: String { key }
}

struct ShopConfig: Codable, Equatable {
    var slots: [ShopSlot]
    var catalog: [ShopItem]
}

struct ShopItem: Codable, Equatable, Identifiable {
    var id: String
    var name: String
    var slot: ShopSlot
    var cost: Int
    var accent: String
    var accentBg: String
    /// Key omitted when not new.
    var isNew: Bool?
    /// Minimum user level; omitted when ungated.
    var unlockAt: Int?

    func isLocked(forLevel level: Int) -> Bool {
        if let unlockAt { return level < unlockAt }
        return false
    }
}

struct SurveyOption: Codable, Equatable, Identifiable {
    var value: String
    var label: String
    var id: String { value }
}

/// Discriminated by `type`. Unknown types are kept so a newer server does not break decoding.
enum SurveyQuestion: Codable, Equatable, Identifiable {
    case singleChoice(key: String, prompt: String, options: [SurveyOption])
    case shortText(key: String, prompt: String, maxLength: Int)
    case unknown(key: String, type: String)

    var key: String {
        switch self {
        case .singleChoice(let key, _, _), .shortText(let key, _, _), .unknown(let key, _): return key
        }
    }

    var prompt: String? {
        switch self {
        case .singleChoice(_, let prompt, _), .shortText(_, let prompt, _): return prompt
        case .unknown: return nil
        }
    }

    var id: String { key }

    private enum CodingKeys: String, CodingKey { case key, type, prompt, options, maxLength }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let type = try c.decode(String.self, forKey: .type)
        let key = try c.decode(String.self, forKey: .key)
        switch type {
        case "single-choice":
            self = .singleChoice(key: key,
                                 prompt: try c.decode(String.self, forKey: .prompt),
                                 options: try c.decode([SurveyOption].self, forKey: .options))
        case "short-text":
            self = .shortText(key: key,
                              prompt: try c.decode(String.self, forKey: .prompt),
                              maxLength: try c.decode(Int.self, forKey: .maxLength))
        default:
            self = .unknown(key: key, type: type)
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .singleChoice(let key, let prompt, let options):
            try c.encode("single-choice", forKey: .type)
            try c.encode(key, forKey: .key)
            try c.encode(prompt, forKey: .prompt)
            try c.encode(options, forKey: .options)
        case .shortText(let key, let prompt, let maxLength):
            try c.encode("short-text", forKey: .type)
            try c.encode(key, forKey: .key)
            try c.encode(prompt, forKey: .prompt)
            try c.encode(maxLength, forKey: .maxLength)
        case .unknown(let key, let type):
            try c.encode(type, forKey: .type)
            try c.encode(key, forKey: .key)
        }
    }

    /// Mirrors the server's validation so the UI can enable "Continue" at the right moment.
    func isValidAnswer(_ answer: String?) -> Bool {
        guard let answer else { return false }
        switch self {
        case .singleChoice(_, _, let options): return options.contains { $0.value == answer }
        case .shortText(_, _, let maxLength):
            let trimmed = answer.trimmingCharacters(in: .whitespacesAndNewlines)
            return !trimmed.isEmpty && trimmed.count <= maxLength
        case .unknown: return false
        }
    }
}

struct IdeologyOption: Codable, Equatable, Identifiable {
    var key: BeliefKey
    var label: String
    var description: String
    var id: String { key.string }
}

struct CivilityDimensionInfo: Codable, Equatable, Identifiable {
    var key: String
    var label: String
    var description: String
    var id: String { key }
}
