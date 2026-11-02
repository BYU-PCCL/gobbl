import Foundation

/// `user` object in the login/register response; also what the Keychain remembers between launches.
struct AuthUser: Codable, Equatable {
    var id: String
    var username: String
    var onboardingCompletedAt: Date?
}

/// `POST /api/mobile/auth/login` and `/register`.
struct AuthResponse: Codable, Equatable {
    var accessToken: String
    var expiresAt: Date
    var user: AuthUser
}

/// What survives relaunch, stored in the Keychain as one blob.
struct MobileSession: Codable, Equatable {
    var accessToken: String
    var expiresAt: Date
    var user: AuthUser

    init(accessToken: String, expiresAt: Date, user: AuthUser) {
        self.accessToken = accessToken
        self.expiresAt = expiresAt
        self.user = user
    }

    init(_ response: AuthResponse) {
        self.init(accessToken: response.accessToken, expiresAt: response.expiresAt, user: response.user)
    }

    func isExpired(at now: Date = Date()) -> Bool { expiresAt <= now }
}
