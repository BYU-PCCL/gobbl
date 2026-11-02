import Foundation

/// One element of the `GET /api/debates` list.
struct DebateSummary: Codable, Equatable, Identifiable {
    var id: String
    var topic: String
    var category: String
    var difficulty: DifficultyTier
    var beliefKey: BeliefKey
    var personaInitials: String?
    var isDaily: Bool
    var isTraining: Bool
    var trainingMode: String?
    var allowProfanity: Bool
    var completed: Bool
    var overallScore: Double?
    var xpEarned: Int
    var feathersEarned: Int
    var createdAt: Date
    var completedAt: Date?
}

struct Message: Codable, Equatable, Identifiable {
    var id: String
    var role: MessageRole
    var content: String
    /// Null until scored; partner messages are scored asynchronously and appear on reload.
    var civilityScore: Double?
    var dimensions: CivilityDimensions?
    var createdAt: Date
}

/// `GET /api/debates?id=`: the summary plus transcript and (once analyzed) turn feedback.
struct DebateDetail: Codable, Equatable, Identifiable {
    var summary: DebateSummary
    var analysis: [TurnFeedback]?
    var messages: [Message]

    var id: String { summary.id }

    private enum CodingKeys: String, CodingKey { case analysis, messages }

    init(summary: DebateSummary, analysis: [TurnFeedback]?, messages: [Message]) {
        self.summary = summary
        self.analysis = analysis
        self.messages = messages
    }

    init(from decoder: Decoder) throws {
        summary = try DebateSummary(from: decoder)
        let c = try decoder.container(keyedBy: CodingKeys.self)
        analysis = try c.decodeIfPresent([TurnFeedback].self, forKey: .analysis)
        messages = try c.decode([Message].self, forKey: .messages)
    }

    func encode(to encoder: Encoder) throws {
        try summary.encode(to: encoder)
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(analysis, forKey: .analysis)
        try c.encode(messages, forKey: .messages)
    }

    var userTurnCount: Int { messages.filter { $0.role == .user }.count }
}

/// `POST /api/debates`. `resumed` is true only when today's unfinished Daily Gobble was returned.
struct CreateDebateResponse: Codable, Equatable {
    var id: String
    var topic: String
    var difficulty: DifficultyTier
    var personaInitials: String?
    var openingMessage: String
    var resumed: Bool?

    var wasResumed: Bool { resumed ?? false }
}

struct AnalyzeResponse: Codable, Equatable {
    var analysis: [TurnFeedback]
}
