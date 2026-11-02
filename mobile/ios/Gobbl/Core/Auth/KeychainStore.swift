import Foundation
import Security

/// Where the signed-in session lives between launches.
protocol SessionStore: AnyObject {
    func load() throws -> MobileSession?
    func save(_ session: MobileSession) throws
    func clear() throws
}

struct KeychainError: Error, Equatable {
    var status: OSStatus
}

/// One generic-password item holding the whole `MobileSession` as JSON.
/// `kSecAttrAccessibleAfterFirstUnlock`: readable in the background after the first unlock, never synced to iCloud.
final class KeychainStore: SessionStore {
    private let service: String
    private let account = "session"

    init(service: String) {
        self.service = service
    }

    private var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }

    func load() throws -> MobileSession? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        switch status {
        case errSecSuccess:
            guard let data = result as? Data else { return nil }
            do {
                return try JSONCoding.decoder.decode(MobileSession.self, from: data)
            } catch {
                // A blob from an older build we can no longer read: treat as signed out.
                try? clear()
                return nil
            }
        case errSecItemNotFound:
            return nil
        default:
            throw KeychainError(status: status)
        }
    }

    func save(_ session: MobileSession) throws {
        let data = try JSONCoding.encoder.encode(session)
        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
        ]
        let updateStatus = SecItemUpdate(baseQuery as CFDictionary, attributes as CFDictionary)
        if updateStatus == errSecSuccess { return }
        guard updateStatus == errSecItemNotFound else { throw KeychainError(status: updateStatus) }
        var insert = baseQuery
        attributes.forEach { insert[$0.key] = $0.value }
        let addStatus = SecItemAdd(insert as CFDictionary, nil)
        guard addStatus == errSecSuccess else { throw KeychainError(status: addStatus) }
    }

    func clear() throws {
        let status = SecItemDelete(baseQuery as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError(status: status)
        }
    }
}

/// For tests and previews.
final class InMemorySessionStore: SessionStore {
    var session: MobileSession?
    init(session: MobileSession? = nil) { self.session = session }
    func load() throws -> MobileSession? { session }
    func save(_ session: MobileSession) throws { self.session = session }
    func clear() throws { session = nil }
}
