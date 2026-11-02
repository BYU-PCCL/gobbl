import Foundation
import Observation

/// Records that a user agreed to their debate text being sent to xAI (App Review guideline 5.1.2(i)).
/// Asked once per account on this device, before the first message or debate. `UserDefaults`, reason CA92.1.
@MainActor
@Observable
final class AIConsentStore {
    /// Bump the version if what is shared, or with whom, changes; everyone is asked again.
    static let version = 1

    private let defaults: UserDefaults
    /// Mirrors the stored flags so views re-render when consent is granted.
    private var granted: Set<String> = []

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    private func key(_ userId: String) -> String { "aiConsent.v\(Self.version).\(userId)" }

    func hasConsented(userId: String) -> Bool {
        granted.contains(userId) || defaults.bool(forKey: key(userId))
    }

    func grant(userId: String) {
        defaults.set(true, forKey: key(userId))
        granted.insert(userId)
    }
}
