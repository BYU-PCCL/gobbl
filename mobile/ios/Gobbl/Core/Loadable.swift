import Foundation

/// Screen state for anything fetched from the API. Every feature view model exposes one of these.
enum Loadable<Value> {
    case idle
    case loading
    case loaded(Value)
    case failed(message: String, retryable: Bool)

    var value: Value? {
        if case .loaded(let v) = self { return v }
        return nil
    }

    var isLoading: Bool {
        if case .loading = self { return true }
        return false
    }

    var errorMessage: String? {
        if case .failed(let message, _) = self { return message }
        return nil
    }

    static func failure(_ error: Error) -> Loadable {
        let api = error as? APIError
        return .failed(message: api?.errorDescription ?? error.localizedDescription,
                       retryable: api?.isTransport ?? true)
    }
}

extension Loadable: Equatable where Value: Equatable {}
