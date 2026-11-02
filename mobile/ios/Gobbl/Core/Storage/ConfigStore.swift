import Foundation
import Observation

/// `GET /api/config`, cached on disk so the app can start offline. Refetched on launch and when the UTC day changes.
@MainActor
@Observable
final class ConfigStore {
    private(set) var config: AppConfig?
    private(set) var isLoading = false
    private(set) var lastError: String?

    private let client: APIClient
    private let cacheURL: URL?
    private let now: () -> Date

    init(client: APIClient, cacheURL: URL? = ConfigStore.defaultCacheURL(), now: @escaping () -> Date = Date.init) {
        self.client = client
        self.cacheURL = cacheURL
        self.now = now
        config = loadCache()
    }

    nonisolated static func defaultCacheURL() -> URL? {
        guard let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
        else { return nil }
        return dir.appendingPathComponent("gobbl-config.json")
    }

    /// True when the cached `today.date` is not the current UTC day.
    var isStale: Bool {
        guard let config else { return true }
        return config.today.date != JSONCoding.utcDayKey(for: now())
    }

    /// Fetch unless we already have today's config. A failure keeps the cached copy.
    func refreshIfNeeded() async {
        if config != nil, !isStale { return }
        await refresh()
    }

    func refresh() async {
        if isLoading { return }
        isLoading = true
        defer { isLoading = false }
        do {
            let fresh = try await client.send(API.config)
            config = fresh
            lastError = nil
            saveCache(fresh)
        } catch {
            lastError = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }

    // MARK: - Disk cache

    private func loadCache() -> AppConfig? {
        guard let cacheURL, let data = try? Data(contentsOf: cacheURL) else { return nil }
        return try? JSONCoding.decoder.decode(AppConfig.self, from: data)
    }

    private func saveCache(_ config: AppConfig) {
        guard let cacheURL else { return }
        do {
            try FileManager.default.createDirectory(at: cacheURL.deletingLastPathComponent(),
                                                    withIntermediateDirectories: true)
            let data = try JSONCoding.encoder.encode(config)
            try data.write(to: cacheURL, options: .atomic)
        } catch {
            // Cache is best-effort.
        }
    }
}
