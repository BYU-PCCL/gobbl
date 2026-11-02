import Foundation

struct ModuleVariantInfo: Codable, Equatable, Identifiable {
    var key: ModuleVariant
    var stepCount: Int
    var id: String { key.string }
}

struct ModuleProgress: Codable, Equatable {
    var sessionId: String
    /// Current step id, or `"complete"` when every step is done but the session is not finalized.
    var stage: String
    var variant: ModuleVariant
    var inProgress: Bool

    var isAwaitingCompletion: Bool { stage == "complete" }
}

/// One element of `GET /api/modules`.
struct ModuleSummary: Codable, Equatable, Identifiable {
    var key: String
    var skill: SkillKey
    var title: String
    var description: String
    var estimatedMinutes: Int
    var variants: [ModuleVariantInfo]
    var hasAdvancedVariant: Bool
    var timesCompleted: Int
    var progress: ModuleProgress?
    var id: String { key }
}

struct ContentBlock: Codable, Equatable {
    var heading: String
    var body: String
}

/// Discriminated by `kind`. Unknown kinds decode so a newer server cannot break the list.
enum ModuleStep: Codable, Equatable, Identifiable {
    case diagnostic(id: String, questions: [SurveyQuestion])
    case content(id: String, blocks: [ContentBlock])
    case practice(id: String, topic: String, difficulty: DifficultyTier, maxTurns: Int?)
    case reflection(id: String, prompt: String, maxLength: Int)
    case unknown(id: String, kind: String)

    var id: String {
        switch self {
        case .diagnostic(let id, _), .content(let id, _), .practice(let id, _, _, _),
             .reflection(let id, _, _), .unknown(let id, _):
            return id
        }
    }

    private enum CodingKeys: String, CodingKey {
        case id, kind, questions, blocks, topic, difficulty, maxTurns, prompt, maxLength
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let id = try c.decode(String.self, forKey: .id)
        let kind = try c.decode(String.self, forKey: .kind)
        switch kind {
        case "diagnostic":
            self = .diagnostic(id: id, questions: try c.decode([SurveyQuestion].self, forKey: .questions))
        case "content":
            self = .content(id: id, blocks: try c.decode([ContentBlock].self, forKey: .blocks))
        case "practice":
            self = .practice(id: id,
                             topic: try c.decode(String.self, forKey: .topic),
                             difficulty: try c.decode(DifficultyTier.self, forKey: .difficulty),
                             maxTurns: try c.decodeIfPresent(Int.self, forKey: .maxTurns))
        case "reflection":
            self = .reflection(id: id,
                               prompt: try c.decode(String.self, forKey: .prompt),
                               maxLength: try c.decode(Int.self, forKey: .maxLength))
        default:
            self = .unknown(id: id, kind: kind)
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        switch self {
        case .diagnostic(_, let questions):
            try c.encode("diagnostic", forKey: .kind)
            try c.encode(questions, forKey: .questions)
        case .content(_, let blocks):
            try c.encode("content", forKey: .kind)
            try c.encode(blocks, forKey: .blocks)
        case .practice(_, let topic, let difficulty, let maxTurns):
            try c.encode("practice", forKey: .kind)
            try c.encode(topic, forKey: .topic)
            try c.encode(difficulty, forKey: .difficulty)
            try c.encodeIfPresent(maxTurns, forKey: .maxTurns)
        case .reflection(_, let prompt, let maxLength):
            try c.encode("reflection", forKey: .kind)
            try c.encode(prompt, forKey: .prompt)
            try c.encode(maxLength, forKey: .maxLength)
        case .unknown(_, let kind):
            try c.encode(kind, forKey: .kind)
        }
    }
}

/// `POST /api/modules/[key]/start`. `step` is null only for a resumed run that finished its last step.
struct ModuleStartResponse: Codable, Equatable {
    var sessionId: String
    var variant: ModuleVariant
    var step: ModuleStep?
    var moduleTitle: String
    var stepIndex: Int?
    var stepCount: Int
    var resumed: Bool?

    var wasResumed: Bool { resumed ?? false }
}

/// `POST /api/modules/[key]/advance` has two shapes: the first practice call returns only `debateId`;
/// every advancing call returns `nextStep` (null when the last step was done) with step metadata.
struct ModuleAdvanceResponse: Codable, Equatable {
    var nextStep: ModuleStep?
    var moduleTitle: String?
    var stepIndex: Int?
    var stepCount: Int?
    var debateId: String?

    /// True for the first practice call: the session did not advance; run the chat on `debateId`.
    var isPracticeDebateHandle: Bool { moduleTitle == nil && debateId != nil }

    /// True when every step is done and `/complete` should be called.
    var isLastStepDone: Bool { moduleTitle != nil && nextStep == nil }
}

struct ModuleCompleteResponse: Codable, Equatable {
    var completed: Bool
    var preCivility: Double?
    var postCivility: Double?
    var feathersEarned: Int
}
