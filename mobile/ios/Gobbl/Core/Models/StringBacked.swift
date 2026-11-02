import Foundation

/// A string-valued enum that keeps unknown server values instead of failing to decode.
/// The API is additive-only, so new enum-like strings may appear at any time (docs/api.md §1).
protocol StringBacked: Codable, Hashable {
    init(string: String)
    var string: String { get }
}

extension StringBacked {
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        self.init(string: try container.decode(String.self))
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(string)
    }
}

enum DifficultyTier: StringBacked {
    case friendlyCluck, spiritedStrut, fullGobble
    case unknown(String)

    static let known: [DifficultyTier] = [.friendlyCluck, .spiritedStrut, .fullGobble]

    init(string: String) {
        switch string {
        case "Friendly Cluck": self = .friendlyCluck
        case "Spirited Strut": self = .spiritedStrut
        case "Full Gobble": self = .fullGobble
        default: self = .unknown(string)
        }
    }

    var string: String {
        switch self {
        case .friendlyCluck: return "Friendly Cluck"
        case .spiritedStrut: return "Spirited Strut"
        case .fullGobble: return "Full Gobble"
        case .unknown(let s): return s
        }
    }

    /// Legacy rows may hold `Friendly`, `Challenging`, `Devil's Advocate`; map them for display.
    var displayName: String {
        switch self {
        case .unknown("Friendly"): return "Friendly Cluck"
        case .unknown("Challenging"): return "Spirited Strut"
        case .unknown("Devil's Advocate"): return "Full Gobble"
        default: return string
        }
    }
}

enum BeliefKey: StringBacked {
    case left, leanLeft, center, leanRight, right
    case unknown(String)

    init(string: String) {
        switch string {
        case "left": self = .left
        case "lean-left": self = .leanLeft
        case "center": self = .center
        case "lean-right": self = .leanRight
        case "right": self = .right
        default: self = .unknown(string)
        }
    }

    var string: String {
        switch self {
        case .left: return "left"
        case .leanLeft: return "lean-left"
        case .center: return "center"
        case .leanRight: return "lean-right"
        case .right: return "right"
        case .unknown(let s): return s
        }
    }
}

enum ShopSlot: StringBacked, CaseIterable {
    case background, cape, hat, face, neck, chest
    case unknown(String)

    /// Display order from the server (`shop.slots`): background, cape, hat, face, neck, chest.
    static let allCases: [ShopSlot] = [.background, .cape, .hat, .face, .neck, .chest]

    init(string: String) {
        switch string {
        case "background": self = .background
        case "cape": self = .cape
        case "hat": self = .hat
        case "face": self = .face
        case "neck": self = .neck
        case "chest": self = .chest
        default: self = .unknown(string)
        }
    }

    var string: String {
        switch self {
        case .background: return "background"
        case .cape: return "cape"
        case .hat: return "hat"
        case .face: return "face"
        case .neck: return "neck"
        case .chest: return "chest"
        case .unknown(let s): return s
        }
    }
}

enum MessageRole: StringBacked {
    case user, assistant
    case unknown(String)

    init(string: String) {
        switch string {
        case "user": self = .user
        case "assistant": self = .assistant
        default: self = .unknown(string)
        }
    }

    var string: String {
        switch self {
        case .user: return "user"
        case .assistant: return "assistant"
        case .unknown(let s): return s
        }
    }
}

enum ModuleVariant: StringBacked {
    case standard, advanced
    case unknown(String)

    init(string: String) {
        switch string {
        case "standard": self = .standard
        case "advanced": self = .advanced
        default: self = .unknown(string)
        }
    }

    var string: String {
        switch self {
        case .standard: return "standard"
        case .advanced: return "advanced"
        case .unknown(let s): return s
        }
    }
}

enum SkillKey: StringBacked {
    case participation, selfExpression, reasonGiving, listening, selfInterrogation, cognitiveDissonance
    case unknown(String)

    init(string: String) {
        switch string {
        case "participation": self = .participation
        case "selfExpression": self = .selfExpression
        case "reasonGiving": self = .reasonGiving
        case "listening": self = .listening
        case "selfInterrogation": self = .selfInterrogation
        case "cognitiveDissonance": self = .cognitiveDissonance
        default: self = .unknown(string)
        }
    }

    var string: String {
        switch self {
        case .participation: return "participation"
        case .selfExpression: return "selfExpression"
        case .reasonGiving: return "reasonGiving"
        case .listening: return "listening"
        case .selfInterrogation: return "selfInterrogation"
        case .cognitiveDissonance: return "cognitiveDissonance"
        case .unknown(let s): return s
        }
    }
}
