import Foundation

/// Thread-safe holder for the current bearer session, shared by `AuthStore` (writer) and `APIClient` (reader).
final class SessionVault: @unchecked Sendable {
    private let lock = NSLock()
    private var _session: MobileSession?

    init(session: MobileSession? = nil) { _session = session }

    var session: MobileSession? {
        get { lock.lock(); defer { lock.unlock() }; return _session }
        set { lock.lock(); _session = newValue; lock.unlock() }
    }

    var accessToken: String? { session?.accessToken }
}

/// The only way the app talks to the Next.js API. Stateless apart from the vault it reads tokens from.
final class APIClient: @unchecked Sendable {
    let baseURL: URL
    let session: URLSession
    let clientVersion: String
    private let vault: SessionVault
    /// Sent on every request. Debug builds use it for the Vercel preview protection bypass.
    private let defaultHeaders: [String: String]
    private let onUnauthorized: @Sendable () -> Void

    /// - Parameters:
    ///   - onUnauthorized: called on every 401 from an endpoint that `requiresAuth`. `AuthStore` signs the user out here.
    init(baseURL: URL,
         session: URLSession = APIClient.makeSession(),
         clientVersion: String,
         vault: SessionVault,
         defaultHeaders: [String: String] = [:],
         onUnauthorized: @escaping @Sendable () -> Void) {
        self.baseURL = baseURL
        self.session = session
        self.clientVersion = clientVersion
        self.vault = vault
        self.defaultHeaders = defaultHeaders
        self.onUnauthorized = onUnauthorized
    }

    static func makeSession(configuration: URLSessionConfiguration = .default) -> URLSession {
        configuration.waitsForConnectivity = false
        configuration.timeoutIntervalForResource = 90
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        return URLSession(configuration: configuration)
    }

    func send<T: Decodable>(_ endpoint: Endpoint<T>) async throws -> T {
        let request = try makeRequest(endpoint)
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.transport(error)
        }
        guard let http = response as? HTTPURLResponse else {
            throw APIError.transport(URLError(.badServerResponse))
        }
        return try decode(T.self, status: http.statusCode, data: data, requiresAuth: endpoint.requiresAuth)
    }

    // MARK: - Request building

    func makeRequest<T>(_ endpoint: Endpoint<T>) throws -> URLRequest {
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            throw APIError.transport(URLError(.badURL))
        }
        let basePath = components.path.hasSuffix("/") ? String(components.path.dropLast()) : components.path
        components.path = basePath + (endpoint.path.hasPrefix("/") ? endpoint.path : "/" + endpoint.path)
        components.queryItems = endpoint.query.isEmpty ? nil : endpoint.query
        guard let url = components.url else { throw APIError.transport(URLError(.badURL)) }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.timeoutInterval = endpoint.timeout
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("ios/\(clientVersion)", forHTTPHeaderField: "X-Gobbl-Client")
        for (field, value) in defaultHeaders { request.setValue(value, forHTTPHeaderField: field) }

        if endpoint.requiresAuth {
            guard let token = vault.accessToken else { throw APIError.unauthorized }
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body = endpoint.body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONCoding.encoder.encode(AnyEncodable(body))
        }
        return request
    }

    // MARK: - Response mapping

    func decode<T: Decodable>(_ type: T.Type, status: Int, data: Data, requiresAuth: Bool) throws -> T {
        switch status {
        case 200..<300:
            if T.self == EmptyResponse.self { return EmptyResponse() as! T }
            do {
                return try JSONCoding.decoder.decode(T.self, from: data)
            } catch {
                throw APIError.decoding(error)
            }
        case 401:
            if requiresAuth { onUnauthorized() }
            throw APIError.unauthorized
        default:
            let body = try? JSONCoding.decoder.decode(APIErrorBody.self, from: data)
            switch status {
            case 404: throw APIError.notFound(body)
            case 409: throw APIError.conflict(body)
            case 400..<500: throw APIError.clientError(status: status, body)
            default: throw APIError.server(status: status, body)
            }
        }
    }
}

/// Type-erases `any Encodable` so `JSONEncoder.encode` can take it.
struct AnyEncodable: Encodable {
    private let encodeImpl: (Encoder) throws -> Void
    init(_ wrapped: any Encodable) { encodeImpl = { try wrapped.encode(to: $0) } }
    func encode(to encoder: Encoder) throws { try encodeImpl(encoder) }
}
