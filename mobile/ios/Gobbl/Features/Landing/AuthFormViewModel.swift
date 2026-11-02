import Foundation
import Observation

enum AuthMode: Equatable {
    case login, register

    var title: String { self == .login ? "Welcome back." : "Hatch your turkey." }
    var subtitle: String {
        self == .login ? "Sign in to pick up where you left off."
                       : "Every Thunderbird starts as an egg. Pick a username to begin."
    }
    var submitTitle: String { self == .login ? "Sign in" : "Create account" }
    var switchPrompt: String { self == .login ? "New here?" : "Already have an account?" }
    var switchTitle: String { self == .login ? "Create an account" : "Sign in" }
    var usernamePlaceholder: String { self == .login ? "Your username" : "Pick a name for your turkey" }
    var passwordPlaceholder: String { self == .login ? "Your password" : "At least 6 characters" }
    var heroStage: Int { self == .login ? 5 : 1 }
    var other: AuthMode { self == .login ? .register : .login }
}

/// Form state for the login / register screen. Validation mirrors the server's rules so
/// obvious mistakes never leave the device.
@MainActor
@Observable
final class AuthFormViewModel {
    var username = ""
    var password = ""
    var errorMessage: String?
    var isSubmitting = false

    var trimmedUsername: String { username.trimmingCharacters(in: .whitespacesAndNewlines) }

    var canSubmit: Bool {
        !trimmedUsername.isEmpty && !password.isEmpty && !isSubmitting
    }

    /// Returns true when the user is signed in afterwards.
    @discardableResult
    func submit(mode: AuthMode, auth: AuthStore) async -> Bool {
        errorMessage = nil
        if let validation = Self.validate(mode: mode, username: trimmedUsername, password: password) {
            errorMessage = validation
            return false
        }
        isSubmitting = true
        defer { isSubmitting = false }
        do {
            switch mode {
            case .login: try await auth.login(username: trimmedUsername, password: password)
            case .register: try await auth.register(username: trimmedUsername, password: password)
            }
            return true
        } catch let error as APIError {
            errorMessage = Self.message(for: error, mode: mode)
        } catch {
            errorMessage = Self.genericMessage(for: mode)
        }
        return false
    }

    /// Rules from `POST /api/mobile/auth/register`: username 3-20 characters, password 6+.
    static func validate(mode: AuthMode, username: String, password: String) -> String? {
        if username.isEmpty || password.isEmpty { return "Username and password are required." }
        guard mode == .register else { return nil }
        if !(3...20).contains(username.count) { return "Username must be 3-20 characters." }
        if password.count < 6 { return "Password must be at least 6 characters." }
        return nil
    }

    static func message(for error: APIError, mode: AuthMode) -> String {
        switch error {
        case .unauthorized where mode == .login:
            return "That username and password don't match. Check them and try again."
        case .transport:
            return "Couldn't reach the server. Check your connection and try again."
        case .conflict, .clientError:
            return error.serverMessage ?? genericMessage(for: mode)
        default:
            return genericMessage(for: mode)
        }
    }

    static func genericMessage(for mode: AuthMode) -> String {
        mode == .login ? "Couldn't sign you in. Try again in a moment."
                       : "Your account couldn't be created. Try again in a moment."
    }
}
