import Foundation

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case patch = "PATCH"
    case delete = "DELETE"
}

/// One API call: where it goes, what it sends, what it decodes.
struct Endpoint<Response: Decodable> {
    var path: String
    var method: HTTPMethod = .get
    var query: [URLQueryItem] = []
    var body: (any Encodable)? = nil
    var requiresAuth: Bool = true
    /// Blocking AI routes (`/api/chat`, `POST /api/debates`, analyze, module advance) need >= 60 s.
    var timeout: TimeInterval = 30
}

/// For `204 No Content` responses such as `DELETE /api/user`.
struct EmptyResponse: Decodable, Equatable {}
