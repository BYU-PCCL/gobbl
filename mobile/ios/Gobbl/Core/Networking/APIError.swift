import Foundation

/// The documented error body: `{ error, code? }` plus the per-endpoint extras.
struct APIErrorBody: Decodable, Equatable {
    var error: String
    var code: String?
    var featherBalance: Int?
    var unlockAt: Int?
    var debateId: String?
    var currentStage: String?
    var fieldErrors: [String: String]?
}

/// Error codes the server attaches to some responses (docs/api.md §5).
enum APIErrorCode {
    static let confirmRequired = "CONFIRM_REQUIRED"
    static let messageTooLong = "MESSAGE_TOO_LONG"
    static let alreadyCompleted = "ALREADY_COMPLETED"
    static let maxTurns = "MAX_TURNS"
    static let dailyDone = "DAILY_DONE"
    static let notEnoughFeathers = "NOT_ENOUGH_FEATHERS"
    static let locked = "LOCKED"
    static let alreadyOwned = "ALREADY_OWNED"
}

enum APIError: Error {
    /// 401. The client has already reported it through `onUnauthorized` when the endpoint required auth.
    case unauthorized
    /// 404.
    case notFound(APIErrorBody?)
    /// 409.
    case conflict(APIErrorBody?)
    /// Any other 4xx (400, 402, 403, ...).
    case clientError(status: Int, APIErrorBody?)
    /// 5xx, including framework-generated 500s with no JSON body.
    case server(status: Int, APIErrorBody?)
    /// 2xx whose body did not match the expected model.
    case decoding(Error)
    /// URLSession failure: offline, timeout, DNS, TLS.
    case transport(Error)

    var body: APIErrorBody? {
        switch self {
        case .notFound(let b), .conflict(let b), .clientError(_, let b), .server(_, let b): return b
        case .unauthorized, .decoding, .transport: return nil
        }
    }

    /// The server's `code`, when it sent one. Switch on this before the status.
    var code: String? { body?.code }

    var status: Int? {
        switch self {
        case .unauthorized: return 401
        case .notFound: return 404
        case .conflict: return 409
        case .clientError(let s, _), .server(let s, _): return s
        case .decoding, .transport: return nil
        }
    }

    /// The server's `error` text, or a generic fallback. Never parse this; it is for display only.
    var serverMessage: String? { body?.error }

    var isTransport: Bool {
        if case .transport = self { return true }
        return false
    }
}

extension APIError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .unauthorized:
            return "Your session has ended. Please sign in again."
        case .transport:
            return "Couldn't reach the server. Check your connection and try again."
        case .decoding:
            return "The server sent something we didn't understand. Try again in a moment."
        case .server:
            return serverMessage ?? "Something went wrong on the server. Try again in a moment."
        case .notFound, .conflict, .clientError:
            return serverMessage ?? "That request couldn't be completed."
        }
    }
}
