import Foundation
import Observation

/// Drives the onboarding survey (web: `onboarding/survey/page.tsx`). One question per page.
@MainActor
@Observable
final class SurveyViewModel {
    let questions: [SurveyQuestion]
    private(set) var step = 0
    private(set) var responses: [String: String] = [:]
    private(set) var isSubmitting = false
    private(set) var errorMessage: String?

    private let auth: AuthStore

    /// Questions of an unknown type are skipped; the server only validates the ones it knows.
    init(questions: [SurveyQuestion], auth: AuthStore) {
        self.questions = questions.filter {
            if case .unknown = $0 { return false }
            return true
        }
        self.auth = auth
    }

    var question: SurveyQuestion? {
        questions.indices.contains(step) ? questions[step] : nil
    }

    var isLast: Bool { step >= questions.count - 1 }
    var canGoBack: Bool { step > 0 && !isSubmitting }

    var currentAnswer: String {
        guard let question else { return "" }
        return responses[question.key] ?? ""
    }

    var canAdvance: Bool {
        guard let question, !isSubmitting else { return false }
        return question.isValidAnswer(currentAnswer)
    }

    func setAnswer(_ value: String) {
        guard let question else { return }
        var value = value
        if case .shortText(_, _, let maxLength) = question, value.count > maxLength {
            value = String(value.prefix(maxLength))
        }
        responses[question.key] = value
        errorMessage = nil
    }

    func back() {
        guard canGoBack else { return }
        step -= 1
        errorMessage = nil
    }

    /// Advances, or submits on the last question.
    func next() async {
        guard canAdvance else { return }
        if !isLast {
            step += 1
            errorMessage = nil
            return
        }
        await submit()
    }

    private func submit() async {
        isSubmitting = true
        errorMessage = nil
        defer { isSubmitting = false }
        // Send only answers for the questions we showed, trimmed of stray whitespace.
        var payload: [String: String] = [:]
        for q in questions {
            let answer = responses[q.key] ?? ""
            if case .shortText = q {
                payload[q.key] = answer.trimmingCharacters(in: .whitespacesAndNewlines)
            } else {
                payload[q.key] = answer
            }
        }
        do {
            let response = try await auth.client.send(API.submitSurvey(responses: payload))
            auth.markOnboardingCompleted(at: response.onboardingCompletedAt)
        } catch let error as APIError {
            switch error {
            case .conflict:
                // Already submitted elsewhere: adopt the server's date, which dismisses the cover.
                _ = try? await auth.refreshProfile()
            case .notFound:
                auth.signOut(.accountMissing)
            case .clientError(_, let body):
                errorMessage = body?.fieldErrors?.values.first ?? error.errorDescription
            default:
                errorMessage = error.errorDescription
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
