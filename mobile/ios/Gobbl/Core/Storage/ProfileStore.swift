import Foundation
import Observation

/// The signed-in user's `GET /api/user`, shared by Dashboard and Debate setup (and Profile in Phase 3).
/// A refresh keeps the last good value on screen; only a first load shows a spinner or an error.
@MainActor
@Observable
final class ProfileStore {
    private(set) var profile: Loadable<UserProfile> = .idle
    private(set) var isRefreshing = false

    private let auth: AuthStore

    init(auth: AuthStore) {
        self.auth = auth
    }

    var current: UserProfile? { profile.value }

    /// Fetches `/api/user`. Returns the fresh profile, or nil if the fetch failed.
    @discardableResult
    func refresh() async -> UserProfile? {
        if isRefreshing { return nil }
        isRefreshing = true
        defer { isRefreshing = false }
        if profile.value == nil { profile = .loading }
        do {
            let fresh = try await auth.refreshProfile()
            profile = .loaded(fresh)
            return fresh
        } catch {
            // A failed refresh over good data keeps the data; pull-to-refresh can try again.
            if profile.value == nil { profile = .failure(error) }
            return nil
        }
    }

    /// Called on sign-out so the next account never sees the previous one's numbers.
    func clear() {
        profile = .idle
    }
}
