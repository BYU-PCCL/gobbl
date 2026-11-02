import Foundation

struct CredentialsRequest: Encodable {
    var username: String
    var password: String
}

struct DeleteAccountRequest: Encodable {
    var confirm = "DELETE"
}

struct SurveyRequest: Encodable {
    var responses: [String: String]
}

struct CreateDebateRequest: Encodable {
    var topic: String?
    var category: String?
    var difficulty: String
    var personaId: String?
    var isDaily: Bool?
    var allowProfanity: Bool?

    init(topic: Topic, difficulty: DifficultyTier, personaId: String?, allowProfanity: Bool) {
        self.topic = topic.debateTopic
        self.category = topic.category
        self.difficulty = difficulty.string
        self.personaId = personaId
        self.isDaily = nil
        self.allowProfanity = allowProfanity
    }

    /// Daily Gobble: the server picks the topic and category.
    init(dailyWith difficulty: DifficultyTier, personaId: String?, allowProfanity: Bool) {
        self.topic = nil
        self.category = nil
        self.difficulty = difficulty.string
        self.personaId = personaId
        self.isDaily = true
        self.allowProfanity = allowProfanity
    }
}

struct ChatRequest: Encodable {
    var debateId: String
    var message: String?
    var finish: Bool?

    static func turn(debateId: String, message: String) -> ChatRequest {
        ChatRequest(debateId: debateId, message: message, finish: nil)
    }

    static func sendAndFinish(debateId: String, message: String) -> ChatRequest {
        ChatRequest(debateId: debateId, message: message, finish: true)
    }

    static func wrapUp(debateId: String) -> ChatRequest {
        ChatRequest(debateId: debateId, message: nil, finish: true)
    }
}

struct PurchaseRequest: Encodable {
    var itemId: String
}

/// `itemId` must be encoded as JSON `null` to unequip; omitting the key is an error.
struct EquipRequest: Encodable {
    var slot: String
    var itemId: String?

    private enum CodingKeys: String, CodingKey { case slot, itemId }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(slot, forKey: .slot)
        if let itemId {
            try c.encode(itemId, forKey: .itemId)
        } else {
            try c.encodeNil(forKey: .itemId)
        }
    }
}

struct ModuleStartRequest: Encodable {
    var variant: String?
}

/// What `answer` carries depends on the step kind (docs/api.md, advance table).
enum ModuleAnswer: Encodable {
    case diagnostic([String: String])
    case reflection(String)

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .diagnostic(let answers): try c.encode(answers)
        case .reflection(let text): try c.encode(text)
        }
    }
}

struct ModuleAdvanceRequest: Encodable {
    var sessionId: String
    var stepId: String
    var answer: ModuleAnswer?
    var action: String?

    static func content(sessionId: String, stepId: String) -> ModuleAdvanceRequest {
        ModuleAdvanceRequest(sessionId: sessionId, stepId: stepId, answer: nil, action: nil)
    }

    static func diagnostic(sessionId: String, stepId: String, answers: [String: String]) -> ModuleAdvanceRequest {
        ModuleAdvanceRequest(sessionId: sessionId, stepId: stepId, answer: .diagnostic(answers), action: nil)
    }

    static func reflection(sessionId: String, stepId: String, text: String) -> ModuleAdvanceRequest {
        ModuleAdvanceRequest(sessionId: sessionId, stepId: stepId, answer: .reflection(text), action: nil)
    }

    /// First practice call: returns `{ debateId }` and does not advance.
    static func practiceStart(sessionId: String, stepId: String) -> ModuleAdvanceRequest {
        ModuleAdvanceRequest(sessionId: sessionId, stepId: stepId, answer: nil, action: nil)
    }

    /// Second practice call, once the debate is completed.
    static func practiceFinish(sessionId: String, stepId: String) -> ModuleAdvanceRequest {
        ModuleAdvanceRequest(sessionId: sessionId, stepId: stepId, answer: nil, action: "finish")
    }
}

struct ModuleCompleteRequest: Encodable {
    var sessionId: String
}
