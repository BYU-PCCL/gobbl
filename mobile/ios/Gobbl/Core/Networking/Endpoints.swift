import Foundation

/// Every route in docs/api.md, as typed endpoints. Request bodies live in Models/Requests.swift.
enum API {
    static let aiTimeout: TimeInterval = 75

    // MARK: Auth (public)

    static func login(username: String, password: String) -> Endpoint<AuthResponse> {
        Endpoint(path: "/api/mobile/auth/login", method: .post,
                 body: CredentialsRequest(username: username, password: password), requiresAuth: false)
    }

    static func register(username: String, password: String) -> Endpoint<AuthResponse> {
        Endpoint(path: "/api/mobile/auth/register", method: .post,
                 body: CredentialsRequest(username: username, password: password), requiresAuth: false)
    }

    // MARK: Public

    static var config: Endpoint<AppConfig> {
        Endpoint(path: "/api/config", requiresAuth: false)
    }

    // MARK: User

    static var user: Endpoint<UserProfile> { Endpoint(path: "/api/user") }

    static var deleteAccount: Endpoint<EmptyResponse> {
        Endpoint(path: "/api/user", method: .delete, body: DeleteAccountRequest())
    }

    static func submitSurvey(responses: [String: String]) -> Endpoint<SurveyResponse> {
        Endpoint(path: "/api/onboarding/survey", method: .post, body: SurveyRequest(responses: responses))
    }

    // MARK: Debates

    static func personaPreview(tier: DifficultyTier) -> Endpoint<PersonaPreview> {
        Endpoint(path: "/api/personas/preview", query: [URLQueryItem(name: "tier", value: tier.string)])
    }

    static func createDebate(_ request: CreateDebateRequest) -> Endpoint<CreateDebateResponse> {
        Endpoint(path: "/api/debates", method: .post, body: request, timeout: aiTimeout)
    }

    static var debates: Endpoint<[DebateSummary]> { Endpoint(path: "/api/debates") }

    static func debate(id: String) -> Endpoint<DebateDetail> {
        Endpoint(path: "/api/debates", query: [URLQueryItem(name: "id", value: id)])
    }

    static func chat(_ request: ChatRequest) -> Endpoint<ChatResponse> {
        Endpoint(path: "/api/chat", method: .post, body: request, timeout: aiTimeout)
    }

    static func analyze(debateId: String) -> Endpoint<AnalyzeResponse> {
        Endpoint(path: "/api/debates/\(debateId)/analyze", method: .post, timeout: aiTimeout)
    }

    // MARK: Leaderboard

    static func leaderboard(sort: LeaderboardSort) -> Endpoint<[LeaderboardEntry]> {
        Endpoint(path: "/api/leaderboard", query: [URLQueryItem(name: "sort", value: sort.rawValue)])
    }

    // MARK: Modules

    static var modules: Endpoint<[ModuleSummary]> { Endpoint(path: "/api/modules") }

    static func startModule(key: String, variant: ModuleVariant?) -> Endpoint<ModuleStartResponse> {
        Endpoint(path: "/api/modules/\(key)/start", method: .post,
                 body: ModuleStartRequest(variant: variant?.string))
    }

    static func advanceModule(key: String, _ request: ModuleAdvanceRequest) -> Endpoint<ModuleAdvanceResponse> {
        Endpoint(path: "/api/modules/\(key)/advance", method: .post, body: request, timeout: aiTimeout)
    }

    static func completeModule(key: String, sessionId: String) -> Endpoint<ModuleCompleteResponse> {
        Endpoint(path: "/api/modules/\(key)/complete", method: .post,
                 body: ModuleCompleteRequest(sessionId: sessionId))
    }

    // MARK: Shop

    static var shop: Endpoint<ShopResponse> { Endpoint(path: "/api/shop") }

    static func purchase(itemId: String) -> Endpoint<PurchaseResponse> {
        Endpoint(path: "/api/shop/purchase", method: .post, body: PurchaseRequest(itemId: itemId))
    }

    static func equip(slot: ShopSlot, itemId: String?) -> Endpoint<EquipResponse> {
        Endpoint(path: "/api/shop/equip", method: .patch, body: EquipRequest(slot: slot.string, itemId: itemId))
    }
}

enum LeaderboardSort: String, CaseIterable {
    case xp, civility, streak
}
