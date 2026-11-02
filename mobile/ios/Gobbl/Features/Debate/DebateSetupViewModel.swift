import Foundation
import Observation

/// Debate setup (web: `chat/page.tsx`): topic, difficulty, partner preview, profanity toggle, start.
@MainActor
@Observable
final class DebateSetupViewModel {
    enum StartOutcome: Equatable {
        /// New or resumed debate: open it.
        case opened(id: String)
        /// Today's Daily Gobble is already finished (`DAILY_DONE`): show that debate instead of an error.
        case dailyAlreadyDone(id: String)
    }

    let isDaily: Bool
    var difficulty: DifficultyTier = .spiritedStrut {
        didSet { if difficulty != oldValue { partner = nil } }
    }
    var selectedTopicId: String?
    /// Survives switching tiers (web parity) but is only sent for Full Gobble.
    var allowProfanity = false

    private(set) var partner: PersonaPreview?
    private(set) var isStarting = false
    private(set) var startError: String?

    private let client: APIClient

    init(isDaily: Bool, client: APIClient) {
        self.isDaily = isDaily
        self.client = client
    }

    var isFullGobble: Bool { difficulty == .fullGobble }

    func topic(in config: AppConfig?) -> Topic? {
        guard let config else { return nil }
        if isDaily { return config.today.dailyTopic }
        return selectedTopicId.flatMap { id in config.topics.first { $0.id == id } }
    }

    /// Re-picks the partner for the current tier. Non-critical: on failure the copy says "your partner".
    func loadPartner() async {
        let tier = difficulty
        let preview = try? await client.send(API.personaPreview(tier: tier))
        // Ignore a response for a tier the user has already moved away from.
        if tier == difficulty, !Task.isCancelled { partner = preview }
    }

    /// `POST /api/debates`. Blocks 5-20 s on the AI's opening line; the view shows a pairing state.
    func start(config: AppConfig?) async -> StartOutcome? {
        guard !isStarting else { return nil }
        let profanity = isFullGobble && allowProfanity
        let request: CreateDebateRequest
        if isDaily {
            request = CreateDebateRequest(dailyWith: difficulty, personaId: partner?.id, allowProfanity: profanity)
        } else {
            guard let topic = topic(in: config) else { return nil }
            request = CreateDebateRequest(topic: topic, difficulty: difficulty,
                                          personaId: partner?.id, allowProfanity: profanity)
        }

        isStarting = true
        startError = nil
        defer { isStarting = false }
        do {
            let created = try await client.send(API.createDebate(request))
            return .opened(id: created.id)
        } catch let error as APIError {
            if error.code == APIErrorCode.dailyDone, let id = error.body?.debateId {
                return .dailyAlreadyDone(id: id)
            }
            startError = error.isTransport
                ? "Couldn't reach the server. Check your connection and try again."
                : (error.serverMessage ?? "Something went wrong on our end. Please try again.")
        } catch {
            startError = error.localizedDescription
        }
        return nil
    }
}

extension DifficultyTier {
    /// Avatar stage and tint for the picker (web: `DIFFICULTY_META`).
    var setupStage: Int {
        switch self {
        case .friendlyCluck: return 3
        case .spiritedStrut: return 5
        case .fullGobble: return 7
        case .unknown: return 4
        }
    }
}

extension BeliefKey {
    /// Reads naturally after "you're" / "they're" (web: `BELIEF_PHRASE` in `flipBelief.ts`).
    var phrase: String {
        switch self {
        case .left: return "on the left"
        case .leanLeft: return "left-leaning"
        case .center: return "a centrist"
        case .leanRight: return "right-leaning"
        case .right: return "on the right"
        case .unknown(let s): return s
        }
    }

    /// Setup copy explaining the partner's politics (web: `describeFlip`).
    static func describeFlip(user: BeliefKey?, partner: BeliefKey?) -> String {
        guard let partner else { return "Matched from your onboarding profile so you practice across the aisle." }
        guard let user else { return "They're \(partner.phrase), set so you practice across the aisle." }
        return "You're \(user.phrase), so they're \(partner.phrase), matched from your onboarding profile."
    }
}
