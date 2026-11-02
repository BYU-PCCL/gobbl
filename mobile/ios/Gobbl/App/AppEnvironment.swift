import Foundation
import SwiftUI

/// Builds the object graph once at launch. Views reach the pieces through the SwiftUI environment.
@MainActor
final class AppEnvironment {
    let baseURL: URL
    let vault: SessionVault
    let client: APIClient
    let auth: AuthStore
    let config: ConfigStore
    let levelTracker: LevelTracker
    let router: AppRouter
    let profile: ProfileStore
    let consent: AIConsentStore

    private init(baseURL: URL, sessionStore: SessionStore, urlSession: URLSession? = nil,
                 configCacheURL: URL?, defaults: UserDefaults) {
        self.baseURL = baseURL
        let vault = SessionVault()
        let relay = UnauthorizedRelay()
        let client = APIClient(baseURL: baseURL,
                               session: urlSession ?? APIClient.makeSession(),
                               clientVersion: AppEnvironment.clientVersion,
                               vault: vault,
                               onUnauthorized: { relay.fire() })
        let auth = AuthStore(client: client, store: sessionStore, vault: vault)
        relay.handler = { auth.handleUnauthorized() }
        self.vault = vault
        self.client = client
        self.auth = auth
        self.config = ConfigStore(client: client, cacheURL: configCacheURL)
        self.levelTracker = LevelTracker(defaults: defaults)
        self.router = AppRouter()
        self.profile = ProfileStore(auth: auth)
        self.consent = AIConsentStore(defaults: defaults)
    }

    /// The real app: Keychain session, Info.plist base URL (overridable with `GOBBL_API_BASE` in Debug).
    static func live() -> AppEnvironment {
        AppEnvironment(baseURL: resolveBaseURL(),
                       sessionStore: KeychainStore(service: keychainService),
                       configCacheURL: ConfigStore.defaultCacheURL(),
                       defaults: .standard)
    }

    /// Previews and tests: nothing persists and no network is reachable.
    static func preview(session: MobileSession? = nil) -> AppEnvironment {
        AppEnvironment(baseURL: URL(string: "https://preview.invalid")!,
                       sessionStore: InMemorySessionStore(session: session),
                       configCacheURL: nil,
                       defaults: UserDefaults(suiteName: "gobbl.preview") ?? .standard)
    }

    // MARK: - Configuration

    static var keychainService: String {
        (Bundle.main.bundleIdentifier ?? "com.gobbl.ios") + ".session"
    }

    static var clientVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0.0.0"
    }

    static func resolveBaseURL() -> URL {
        #if DEBUG
        if let override = ProcessInfo.processInfo.environment["GOBBL_API_BASE"],
           let url = URL(string: override), url.host != nil {
            return url
        }
        #endif
        if let raw = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
           let url = URL(string: raw.trimmingCharacters(in: .whitespacesAndNewlines)), url.host != nil {
            return url
        }
        assertionFailure("API_BASE_URL is missing from Info.plist; check Config/*.xcconfig")
        return URL(string: "https://invalid.local")!
    }

    /// Breaks the APIClient <-> AuthStore construction cycle.
    private final class UnauthorizedRelay: @unchecked Sendable {
        var handler: (@Sendable () -> Void)?
        func fire() { handler?() }
    }
}

private struct AppEnvironmentKey: EnvironmentKey {
    static let defaultValue: AppEnvironment? = nil
}

extension EnvironmentValues {
    var appEnvironment: AppEnvironment? {
        get { self[AppEnvironmentKey.self] }
        set { self[AppEnvironmentKey.self] = newValue }
    }
}

extension View {
    /// Injects everything a screen needs. Used by `GobblApp` and by previews.
    func gobblEnvironment(_ env: AppEnvironment) -> some View {
        self.environment(env.auth)
            .environment(env.config)
            .environment(env.router)
            .environment(env.profile)
            .environment(env.consent)
            .environment(\.appEnvironment, env)
    }
}
