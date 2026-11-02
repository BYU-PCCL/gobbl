import Foundation
import Observation

/// One rendered message. Local (unsent or just-sent) user lines get a `local-` id.
struct ChatLine: Identifiable, Equatable {
    var id: String
    var role: MessageRole
    var content: String
    var civilityScore: Double?
}

/// The debate state machine behind `DebateView` (web: `chat/[id]/page.tsx` + `ChatInterface.tsx`).
///
/// - `load()` fetches `GET /api/debates?id=`. A finished debate becomes a read-only transcript
///   (with Analyze); an unfinished one becomes the live chat.
/// - `send()` posts one turn. The user's line appears immediately; on failure it is removed and
///   the text goes back into the draft (the web instead fakes a partner reply; we do not).
/// - `finish()` wraps up. The server is the authority on the turn limit: `MAX_TURNS` flips the
///   input to "See results", `ALREADY_COMPLETED` reloads into the transcript.
@MainActor
@Observable
final class ChatViewModel {
    enum Phase: Equatable {
        case loading
        case loadFailed(String)
        /// Unfinished debate; the input is live.
        case active
        /// `POST /api/chat { finish: true }` in flight: the "Wrapping up…" overlay.
        case finishing
        /// Finishing failed; overlay shows the message with Try again / Back to the chat.
        case finishFailed(String)
        /// Opened an already-finished debate: read-only transcript + Analyze.
        case transcript
        /// Just finished in this session: show results.
        case finished(ChatFinishResponse)
    }

    let debateId: String
    let maxTurns: Int
    let maxChars: Int

    private(set) var phase: Phase = .loading
    private(set) var summary: DebateSummary?
    private(set) var lines: [ChatLine] = []
    /// The user's turns so far (1-based count after a send), mirrored from the server.
    private(set) var turnNumber = 0
    private(set) var isSending = false
    private(set) var sendError: String?

    private(set) var analysis: [TurnFeedback]?
    private(set) var isAnalyzing = false
    private(set) var analyzeError: String?

    /// Bound to the text field. `limitDraft()` keeps it within `maxChars` UTF-16 units, which is
    /// how the server (JavaScript `string.length`) counts.
    var draft = ""

    private let client: APIClient
    private let onFinished: (ChatFinishResponse) -> Void

    /// - Parameter onFinished: runs once when this session finishes the debate (record the level,
    ///   refresh the profile). Not called when an already-finished debate is opened.
    init(debateId: String,
         client: APIClient,
         rules: AppConfig.Rules?,
         onFinished: @escaping (ChatFinishResponse) -> Void = { _ in }) {
        self.debateId = debateId
        self.client = client
        self.maxTurns = rules?.maxTurns ?? 8
        self.maxChars = rules?.maxMessageChars ?? 500
        self.onFinished = onFinished
    }

    // MARK: - Derived state

    var trimmedDraft: String { draft.trimmingCharacters(in: .whitespacesAndNewlines) }
    var draftLength: Int { draft.utf16.count }
    /// The web shows the counter past 80 % of the limit.
    var showsCharacterCount: Bool { Double(draftLength) > Double(maxChars) * 0.8 }

    var atMaxTurns: Bool { turnNumber >= maxTurns }
    var isBusy: Bool { isSending || phase == .finishing }

    var canSend: Bool {
        phase == .active && !isBusy && !atMaxTurns
            && !trimmedDraft.isEmpty && trimmedDraft.utf16.count <= maxChars
    }

    /// "Wrap up" appears from turn 2 (web parity).
    var canWrapUp: Bool { phase == .active && !isBusy && turnNumber >= 2 }

    var turnProgress: Double { maxTurns > 0 ? min(Double(turnNumber) / Double(maxTurns), 1) : 0 }

    /// Rolling average of the user's scored messages, on the web's 0-100 scale.
    var liveCivility: Int? {
        let scores = lines.filter { $0.role == .user }.compactMap(\.civilityScore)
        guard !scores.isEmpty else { return nil }
        return Int((scores.reduce(0, +) / Double(scores.count) * 10).rounded())
    }

    /// Analysis feedback for a user line, matched by 1-based user turn number.
    func feedback(for line: ChatLine) -> TurnFeedback? {
        guard line.role == .user, let analysis,
              let index = lines.filter({ $0.role == .user }).firstIndex(where: { $0.id == line.id })
        else { return nil }
        return analysis.first { $0.turn == index + 1 }
    }

    // MARK: - Loading

    func load() async {
        if lines.isEmpty { phase = .loading }
        do {
            let detail = try await client.send(API.debate(id: debateId))
            apply(detail)
        } catch let error as APIError {
            if case .notFound = error {
                phase = .loadFailed("This debate couldn't be found.")
            } else {
                phase = .loadFailed(error.errorDescription ?? "Couldn't load this debate.")
            }
        } catch {
            phase = .loadFailed(error.localizedDescription)
        }
    }

    private func apply(_ detail: DebateDetail) {
        summary = detail.summary
        // Older debates stored a blank user message when the user wrapped up; never render it.
        lines = detail.messages
            .filter { $0.role != .user || !$0.content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            .map { ChatLine(id: $0.id, role: $0.role, content: $0.content, civilityScore: $0.civilityScore) }
        turnNumber = lines.filter { $0.role == .user }.count
        analysis = detail.analysis
        phase = detail.summary.completed ? .transcript : .active
    }

    // MARK: - Sending

    /// Truncates the draft to the server's limit. Call from the text field's `onChange`.
    func limitDraft() {
        while draft.utf16.count > maxChars { draft.removeLast() }
    }

    func send() async {
        guard canSend else { return }
        let text = trimmedDraft
        let local = ChatLine(id: "local-\(UUID().uuidString)", role: .user, content: text, civilityScore: nil)
        lines.append(local)
        draft = ""
        sendError = nil
        isSending = true
        defer { isSending = false }

        do {
            let response = try await client.send(API.chat(.turn(debateId: debateId, message: text)))
            switch response {
            case .turn(let turn):
                if let i = lines.firstIndex(where: { $0.id == local.id }) {
                    lines[i].civilityScore = turn.civility.overall
                }
                lines.append(ChatLine(id: "local-\(UUID().uuidString)", role: .assistant,
                                      content: turn.aiResponse, civilityScore: nil))
                turnNumber = turn.turnNumber
            case .finished(let result):
                // Not expected for a plain turn, but the server is the authority.
                complete(with: result)
            }
        } catch let error as APIError {
            removeLine(local.id)
            switch error.code {
            case APIErrorCode.maxTurns:
                // The limit was reached elsewhere (another device): switch to "See results".
                turnNumber = maxTurns
            case APIErrorCode.alreadyCompleted:
                await load()
            default:
                restoreDraft(text)
                sendError = error.errorDescription
            }
        } catch {
            removeLine(local.id)
            restoreDraft(text)
            sendError = error.localizedDescription
        }
    }

    func dismissSendError() { sendError = nil }

    private func removeLine(_ id: String) {
        lines.removeAll { $0.id == id }
    }

    /// Puts a failed message back unless the user already started typing something new.
    private func restoreDraft(_ text: String) {
        if draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { draft = text }
    }

    // MARK: - Finishing

    /// "Wrap up" or "See results": finish without sending a message.
    func finish() async {
        guard phase == .active || isFinishFailed, !isSending else { return }
        phase = .finishing
        do {
            let response = try await client.send(API.chat(.wrapUp(debateId: debateId)))
            switch response {
            case .finished(let result):
                complete(with: result)
            case .turn:
                phase = .finishFailed("We couldn't wrap that up. Give it another try.")
            }
        } catch let error as APIError where error.code == APIErrorCode.alreadyCompleted {
            // Finished elsewhere: rewards were already paid there. Show the transcript.
            await load()
        } catch let error as APIError {
            phase = .finishFailed(error.errorDescription ?? "We couldn't wrap that up. Give it another try.")
        } catch {
            phase = .finishFailed(error.localizedDescription)
        }
    }

    /// Finish overlay → "Back to the chat".
    func dismissFinishError() {
        if isFinishFailed { phase = .active }
    }

    private var isFinishFailed: Bool {
        if case .finishFailed = phase { return true }
        return false
    }

    private func complete(with result: ChatFinishResponse) {
        phase = .finished(result)
        onFinished(result)
    }

    // MARK: - Analysis

    func analyze() async {
        guard phase == .transcript, analysis == nil, !isAnalyzing else { return }
        isAnalyzing = true
        analyzeError = nil
        defer { isAnalyzing = false }
        do {
            analysis = try await client.send(API.analyze(debateId: debateId)).analysis
        } catch let error as APIError {
            analyzeError = error.errorDescription
        } catch {
            analyzeError = error.localizedDescription
        }
    }
}
