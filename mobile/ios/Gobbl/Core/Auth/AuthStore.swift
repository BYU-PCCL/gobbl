import Foundation
import Observation

enum SignOutReason: Equatable {
    case userRequested
    case sessionExpired
    case accountMissing
    case accountDeleted
}

/// Owns the signed-in state. Views switch on `state`; everything else goes through `APIClient`.
@MainActor
@Observable
final class AuthStore {
    enum State: Equatable {
        /// Cold launch: a stored token is being validated against `GET /api/user`.
        case loading
        case signedOut(reason: SignOutReason?)
        /// We have a token but could not reach the server to validate it. Show retry, not login (plan B5).
        case unreachable(message: String)
        case signedIn(AuthUser)
    }

    private(set) var state: State = .loading

    let client: APIClient
    private let store: SessionStore
    private let vault: SessionVault
    private let now: () -> Date

    init(client: APIClient, store: SessionStore, vault: SessionVault, now: @escaping () -> Date = Date.init) {
        self.client = client
        self.store = store
        self.vault = vault
        self.now = now
    }

    var currentUser: AuthUser? {
        if case .signedIn(let user) = state { return user }
        return nil
    }

    var isSignedIn: Bool { currentUser != nil }

    var needsOnboarding: Bool { currentUser.map { $0.onboardingCompletedAt == nil } ?? false }

    // MARK: - Launch

    /// Restores the Keychain session and validates it. Safe to call again from a retry button.
    func bootstrap() async {
        let stored: MobileSession?
        do {
            stored = try store.load()
        } catch {
            stored = nil
        }
        guard let session = stored else {
            vault.session = nil
            state = .signedOut(reason: nil)
            return
        }
        if session.isExpired(at: now()) {
            signOut(.sessionExpired)
            return
        }
        vault.session = session
        state = .loading
        do {
            let profile = try await client.send(API.user)
            adopt(session: session, user: profile.authUser)
        } catch let error as APIError {
            switch error {
            case .unauthorized:
                signOut(.sessionExpired)
            case .notFound:
                signOut(.accountMissing)
            default:
                state = .unreachable(message: error.errorDescription ?? "Couldn't reach the server.")
            }
        } catch {
            state = .unreachable(message: error.localizedDescription)
        }
    }

    // MARK: - Credentials

    func login(username: String, password: String) async throws {
        let response = try await client.send(API.login(username: username, password: password))
        adopt(session: MobileSession(response), user: response.user)
    }

    func register(username: String, password: String) async throws {
        let response = try await client.send(API.register(username: username, password: password))
        adopt(session: MobileSession(response), user: response.user)
    }

    private func adopt(session: MobileSession, user: AuthUser) {
        var session = session
        session.user = user
        vault.session = session
        try? store.save(session)
        state = .signedIn(user)
    }

    // MARK: - Sign out

    /// Idempotent: the first reason wins, so an `APIClient` 401 callback racing a thrown error does not flip the message.
    func signOut(_ reason: SignOutReason?) {
        vault.session = nil
        try? store.clear()
        if case .signedOut = state { return }
        state = .signedOut(reason: reason)
    }

    /// Called from `APIClient.onUnauthorized` on any 401 to an authenticated endpoint.
    nonisolated func handleUnauthorized() {
        Task { @MainActor in self.signOut(.sessionExpired) }
    }

    // MARK: - Profile sync

    /// Fetches `GET /api/user`, keeps the stored summary in sync, and signs out on 404 (account gone).
    @discardableResult
    func refreshProfile() async throws -> UserProfile {
        do {
            let profile = try await client.send(API.user)
            if var session = vault.session {
                session.user = profile.authUser
                vault.session = session
                try? store.save(session)
            }
            if case .signedIn = state { state = .signedIn(profile.authUser) }
            return profile
        } catch APIError.notFound {
            signOut(.accountMissing)
            throw APIError.notFound(nil)
        }
    }

    func markOnboardingCompleted(at date: Date) {
        guard var session = vault.session else { return }
        session.user.onboardingCompletedAt = date
        vault.session = session
        try? store.save(session)
        state = .signedIn(session.user)
    }

    /// `DELETE /api/user` then wipe everything local.
    func deleteAccount() async throws {
        _ = try await client.send(API.deleteAccount)
        signOut(.accountDeleted)
    }
}
