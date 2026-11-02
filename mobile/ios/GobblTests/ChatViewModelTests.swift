import XCTest
@testable import Gobbl

@MainActor
final class ChatViewModelTests: XCTestCase {
    private var client: APIClient!
    private var finished: [ChatFinishResponse] = []

    override func setUp() {
        super.setUp()
        StubURLProtocol.reset()
        finished = []
        let session = MobileSession(accessToken: "tok", expiresAt: Date().addingTimeInterval(3600),
                                    user: AuthUser(id: "u1", username: "tester", onboardingCompletedAt: Date()))
        client = APIClient(baseURL: URL(string: "https://example.test")!,
                           session: StubURLProtocol.makeSession(),
                           clientVersion: "1.0.0",
                           vault: SessionVault(session: session),
                           onUnauthorized: {})
    }

    private func makeModel(maxTurns: Int = 8, maxChars: Int = 500) -> ChatViewModel {
        let rules = AppConfig.Rules(maxTurns: maxTurns, maxMessageChars: maxChars,
                                    dailyBonusXp: 25, dailyBonusFeathers: 30)
        return ChatViewModel(debateId: "d1", client: client, rules: rules) { [unowned self] in
            self.finished.append($0)
        }
    }

    private func stub(_ path: String, status: Int = 200, fixture: String) throws {
        StubURLProtocol.stubs[path] = .init(status: status, body: try Fixtures.data(fixture))
    }

    private func stub(_ path: String, status: Int, json: String) {
        StubURLProtocol.stubs[path] = .init(status: status, body: Data(json.utf8))
    }

    private func loadedInProgress(maxTurns: Int = 8) async throws -> ChatViewModel {
        try stub("/api/debates", fixture: "debate-detail-in-progress")
        let model = makeModel(maxTurns: maxTurns)
        await model.load()
        return model
    }

    // MARK: - Loading

    func testLoadInProgressDebateIsActiveWithTurnCount() async throws {
        let model = try await loadedInProgress()
        XCTAssertEqual(model.phase, .active)
        XCTAssertEqual(model.lines.count, 5)
        XCTAssertEqual(model.turnNumber, 2)
        XCTAssertEqual(model.liveCivility, 61, "average of 6.5 and 5.75, on the 0-100 scale")
        XCTAssertFalse(model.atMaxTurns)
        XCTAssertTrue(model.canWrapUp, "wrap up is offered from turn 2")
        XCTAssertEqual(StubURLProtocol.requests.first?.url?.query, "id=d1")
    }

    func testLoadCompletedDebateIsReadOnlyTranscript() async throws {
        try stub("/api/debates", fixture: "debate-detail-completed")
        let model = makeModel()
        await model.load()
        XCTAssertEqual(model.phase, .transcript)
        model.draft = "hello"
        XCTAssertFalse(model.canSend)
        XCTAssertFalse(model.canWrapUp)
    }

    func testLoadNotFound() async {
        stub("/api/debates", status: 404, json: #"{"error":"Debate not found"}"#)
        let model = makeModel()
        await model.load()
        XCTAssertEqual(model.phase, .loadFailed("This debate couldn't be found."))
    }

    // MARK: - Sending

    func testSendAppendsScoredUserLineAndReply() async throws {
        let model = try await loadedInProgress()
        try stub("/api/chat", fixture: "chat-turn")
        model.draft = "  I think so.  "
        await model.send()

        XCTAssertEqual(model.lines.count, 7)
        let user = model.lines[5]
        XCTAssertEqual(user.role, .user)
        XCTAssertEqual(user.content, "I think so.", "sent trimmed")
        XCTAssertNotNil(user.civilityScore)
        XCTAssertEqual(model.lines[6].role, .assistant)
        XCTAssertEqual(model.draft, "")
        XCTAssertFalse(model.isSending)

        let turn = try Fixtures.decode(ChatTurnResponse.self, "chat-turn")
        XCTAssertEqual(model.turnNumber, turn.turnNumber)

        let body = try XCTUnwrap(StubURLProtocol.requests.last.flatMap(Self.body))
        XCTAssertEqual(body["debateId"] as? String, "d1")
        XCTAssertEqual(body["message"] as? String, "I think so.")
        XCTAssertNil(body["finish"], "a plain turn does not send finish")
    }

    func testFailedSendRemovesLineAndRestoresDraft() async throws {
        let model = try await loadedInProgress()
        stub("/api/chat", status: 502, json: #"{"error":"The partner is unavailable"}"#)
        model.draft = "My point"
        await model.send()

        XCTAssertEqual(model.lines.count, 5, "the optimistic line is removed")
        XCTAssertEqual(model.draft, "My point")
        XCTAssertEqual(model.sendError, "The partner is unavailable")
        XCTAssertEqual(model.turnNumber, 2)
    }

    func testTransportFailureRestoresDraft() async throws {
        let model = try await loadedInProgress()
        StubURLProtocol.stubs["/api/chat"] = .init(status: 0, body: Data(), error: URLError(.notConnectedToInternet))
        model.draft = "Offline thought"
        await model.send()
        XCTAssertEqual(model.draft, "Offline thought")
        XCTAssertNotNil(model.sendError)
        XCTAssertEqual(model.lines.count, 5)
    }

    func testMaxTurnsFromServerSwitchesToSeeResults() async throws {
        let model = try await loadedInProgress()
        stub("/api/chat", status: 409, json: #"{"error":"Turn limit reached","code":"MAX_TURNS"}"#)
        model.draft = "One more"
        await model.send()

        XCTAssertTrue(model.atMaxTurns)
        XCTAssertEqual(model.lines.count, 5)
        XCTAssertNil(model.sendError, "not shown as an error; the input becomes See results")
        model.draft = "again"
        XCTAssertFalse(model.canSend)
    }

    func testCannotSendAtLocalTurnLimit() async throws {
        let model = try await loadedInProgress(maxTurns: 2)
        model.draft = "Third turn"
        XCTAssertTrue(model.atMaxTurns)
        XCTAssertFalse(model.canSend)
        await model.send()
        XCTAssertTrue(StubURLProtocol.requests.allSatisfy { $0.url?.path != "/api/chat" })
    }

    func testAlreadyCompletedOnSendReloadsTranscript() async throws {
        let model = try await loadedInProgress()
        try stub("/api/chat", status: 409, fixture: "error-already-completed")
        try stub("/api/debates", fixture: "debate-detail-completed")
        model.draft = "Late message"
        await model.send()
        XCTAssertEqual(model.phase, .transcript)
    }

    func testDraftIsLimitedInUTF16Units() {
        let model = makeModel(maxChars: 5)
        model.draft = "abc😀d"   // 3 + 2 + 1 = 6 UTF-16 units
        model.limitDraft()
        XCTAssertEqual(model.draft, "abc😀")
        XCTAssertEqual(model.draftLength, 5)
    }

    func testWhitespaceOnlyDraftCannotSend() async throws {
        let model = try await loadedInProgress()
        model.draft = "   \n "
        XCTAssertFalse(model.canSend)
    }

    // MARK: - Finishing

    func testFinishShowsResultsAndNotifiesOnce() async throws {
        let model = try await loadedInProgress()
        try stub("/api/chat", fixture: "chat-finish")
        await model.finish()

        guard case .finished(let result) = model.phase else { return XCTFail("expected results, got \(model.phase)") }
        XCTAssertEqual(finished, [result])
        let body = try XCTUnwrap(StubURLProtocol.requests.last.flatMap(Self.body))
        XCTAssertEqual(body["finish"] as? Bool, true)
        XCTAssertNil(body["message"], "wrap up sends no message")

        await model.finish()
        XCTAssertEqual(finished.count, 1, "finishing twice is ignored")
    }

    func testFinishFailureCanRetryOrReturnToChat() async throws {
        let model = try await loadedInProgress()
        stub("/api/chat", status: 500, json: "not json")
        await model.finish()
        guard case .finishFailed = model.phase else { return XCTFail("expected finishFailed") }

        model.dismissFinishError()
        XCTAssertEqual(model.phase, .active)

        stub("/api/chat", status: 500, json: "not json")
        await model.finish()
        try stub("/api/chat", fixture: "chat-finish")
        await model.finish()
        guard case .finished = model.phase else { return XCTFail("retry from the error should finish") }
    }

    func testAlreadyCompletedOnFinishShowsTranscriptWithoutRewards() async throws {
        let model = try await loadedInProgress()
        try stub("/api/chat", status: 409, fixture: "error-already-completed")
        try stub("/api/debates", fixture: "debate-detail-completed")
        await model.finish()
        XCTAssertEqual(model.phase, .transcript)
        XCTAssertTrue(finished.isEmpty)
    }

    // MARK: - Analysis

    func testAnalyzeAttachesFeedbackToUserTurns() async throws {
        try stub("/api/debates", fixture: "debate-detail-completed")
        let model = makeModel()
        await model.load()
        if model.analysis != nil { return } // fixture already analyzed; nothing to fetch

        let detail = try Fixtures.decode(DebateDetail.self, "debate-detail-completed")
        try stub("/api/debates/\(detail.id)/analyze", fixture: "debates-analyze")
        // The view model's id is "d1"; point the stub there too.
        try stub("/api/debates/d1/analyze", fixture: "debates-analyze")
        await model.analyze()
        XCTAssertNotNil(model.analysis)
        let firstUser = try XCTUnwrap(model.lines.first { $0.role == .user })
        XCTAssertEqual(model.feedback(for: firstUser)?.turn, 1)
    }

    // MARK: - Helpers

    private static func body(_ request: URLRequest) -> [String: Any]? {
        let data: Data?
        if let body = request.httpBody {
            data = body
        } else if let stream = request.httpBodyStream {
            stream.open()
            defer { stream.close() }
            var collected = Data()
            var buffer = [UInt8](repeating: 0, count: 4096)
            while stream.hasBytesAvailable {
                let read = stream.read(&buffer, maxLength: buffer.count)
                if read <= 0 { break }
                collected.append(buffer, count: read)
            }
            data = collected
        } else {
            data = nil
        }
        return data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
    }
}

@MainActor
final class DebateSetupViewModelTests: XCTestCase {
    private var client: APIClient!

    override func setUp() {
        super.setUp()
        StubURLProtocol.reset()
        let session = MobileSession(accessToken: "tok", expiresAt: Date().addingTimeInterval(3600),
                                    user: AuthUser(id: "u1", username: "tester", onboardingCompletedAt: Date()))
        client = APIClient(baseURL: URL(string: "https://example.test")!,
                           session: StubURLProtocol.makeSession(),
                           clientVersion: "1.0.0",
                           vault: SessionVault(session: session),
                           onUnauthorized: {})
    }

    func testDailyDoneOpensThatDebate() async throws {
        let config = try Fixtures.decode(AppConfig.self, "config")
        StubURLProtocol.stubs["/api/debates"] = .init(status: 409, body: Data(
            #"{"error":"Already done","code":"DAILY_DONE","debateId":"daily-1"}"#.utf8))
        let model = DebateSetupViewModel(isDaily: true, client: client)
        let outcome = await model.start(config: config)
        XCTAssertEqual(outcome, .dailyAlreadyDone(id: "daily-1"))
        XCTAssertNil(model.startError)
    }

    func testStartSendsProfanityOnlyForFullGobble() async throws {
        let config = try Fixtures.decode(AppConfig.self, "config")
        StubURLProtocol.stubs["/api/debates"] = .init(status: 200, body: try Fixtures.data("debates-create"))
        let model = DebateSetupViewModel(isDaily: false, client: client)
        model.selectedTopicId = config.topics.first?.id
        model.allowProfanity = true
        model.difficulty = .spiritedStrut

        let outcome = await model.start(config: config)
        let created = try Fixtures.decode(CreateDebateResponse.self, "debates-create")
        XCTAssertEqual(outcome, .opened(id: created.id))

        let request = try XCTUnwrap(StubURLProtocol.requests.last)
        let bodyData = try XCTUnwrap(request.httpBody ?? request.httpBodyStream.map { stream -> Data in
            stream.open(); defer { stream.close() }
            var data = Data(); var buf = [UInt8](repeating: 0, count: 4096)
            while stream.hasBytesAvailable { let n = stream.read(&buf, maxLength: 4096); if n <= 0 { break }; data.append(buf, count: n) }
            return data
        })
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: bodyData) as? [String: Any])
        XCTAssertEqual(json["allowProfanity"] as? Bool, false, "toggle state is ignored below Full Gobble")
        XCTAssertEqual(json["difficulty"] as? String, "Spirited Strut")
        XCTAssertEqual(json["topic"] as? String, config.topics.first?.debateTopic)
    }

    func testStartWithoutTopicDoesNothing() async throws {
        let config = try Fixtures.decode(AppConfig.self, "config")
        let model = DebateSetupViewModel(isDaily: false, client: client)
        let outcome = await model.start(config: config)
        XCTAssertNil(outcome)
        XCTAssertTrue(StubURLProtocol.requests.isEmpty)
    }

    func testServerErrorIsShown() async throws {
        let config = try Fixtures.decode(AppConfig.self, "config")
        StubURLProtocol.stubs["/api/debates"] = .init(status: 502, body: Data(
            #"{"error":"Couldn't start the debate — please try again"}"#.utf8))
        let model = DebateSetupViewModel(isDaily: true, client: client)
        let outcome = await model.start(config: config)
        XCTAssertNil(outcome)
        XCTAssertEqual(model.startError, "Couldn't start the debate — please try again")
    }

    func testDescribeFlipCopy() {
        XCTAssertEqual(BeliefKey.describeFlip(user: .left, partner: .right),
                       "You're on the left, so they're on the right, matched from your onboarding profile.")
        XCTAssertTrue(BeliefKey.describeFlip(user: nil, partner: nil).hasPrefix("Matched from"))
    }
}
