import XCTest
@testable import Gobbl

@MainActor
final class SurveyViewModelTests: XCTestCase {
    private var store: InMemorySessionStore!
    private var vault: SessionVault!
    private var auth: AuthStore!

    private let session = MobileSession(
        accessToken: "tok", expiresAt: Date().addingTimeInterval(86_400),
        user: AuthUser(id: "u1", username: "tester", onboardingCompletedAt: nil))

    private let questions: [SurveyQuestion] = [
        .singleChoice(key: "a", prompt: "A?", options: [SurveyOption(value: "x", label: "X"),
                                                        SurveyOption(value: "y", label: "Y")]),
        .unknown(key: "u", type: "slider"),
        .shortText(key: "b", prompt: "B?", maxLength: 5),
    ]

    override func setUp() {
        super.setUp()
        StubURLProtocol.reset()
        store = InMemorySessionStore(session: session)
        vault = SessionVault(session: session)
        let client = APIClient(baseURL: URL(string: "https://example.test")!,
                               session: StubURLProtocol.makeSession(),
                               clientVersion: "1.0.0", vault: vault, onUnauthorized: {})
        auth = AuthStore(client: client, store: store, vault: vault)
    }

    private func makeModel() -> SurveyViewModel { SurveyViewModel(questions: questions, auth: auth) }

    private func answerAll(_ model: SurveyViewModel) async {
        model.setAnswer("x")
        await model.next()
        model.setAnswer("hello")
    }

    func testUnknownQuestionsAreSkippedAndNextIsGated() async {
        let model = makeModel()
        XCTAssertEqual(model.questions.count, 2)
        XCTAssertFalse(model.canAdvance)
        model.setAnswer("nope")
        XCTAssertFalse(model.canAdvance, "value not among the options")
        model.setAnswer("x")
        XCTAssertTrue(model.canAdvance)
        await model.next()
        XCTAssertEqual(model.step, 1)
        XCTAssertTrue(model.isLast)
        XCTAssertFalse(model.canAdvance, "empty text")
        model.setAnswer("   ")
        XCTAssertFalse(model.canAdvance, "whitespace only")
        model.setAnswer("toolongvalue")
        XCTAssertEqual(model.currentAnswer.count, 5, "clamped to maxLength")
        XCTAssertTrue(model.canAdvance)
        model.back()
        XCTAssertEqual(model.step, 0)
    }

    func testSuccessMarksOnboardingCompleted() async throws {
        StubURLProtocol.stubs["/api/onboarding/survey"] = .init(status: 200, body: try Fixtures.data("onboarding-survey"))
        StubURLProtocol.stubs["/api/user"] = .init(status: 200, body: try Fixtures.data("user"))
        await auth.bootstrap()
        auth.markOnboardingCompleted(at: .distantPast) // fixture user may already be onboarded
        XCTAssertEqual(auth.currentUser?.onboardingCompletedAt, .distantPast)
        let model = makeModel()
        await answerAll(model)
        await model.next()
        XCTAssertNil(model.errorMessage)
        XCTAssertFalse(model.isSubmitting)
        XCTAssertNotEqual(auth.currentUser?.onboardingCompletedAt, .distantPast, "set from the response")
        XCTAssertFalse(auth.needsOnboarding)
        let body = try XCTUnwrap(StubURLProtocol.requests.last(where: { $0.url?.path == "/api/onboarding/survey" }))
        XCTAssertEqual(body.httpMethod, "POST")
    }

    func test409RefreshesProfile() async throws {
        StubURLProtocol.stubs["/api/onboarding/survey"] = .init(status: 409, body: Data(#"{"error":"Survey already completed"}"#.utf8))
        StubURLProtocol.stubs["/api/user"] = .init(status: 200, body: try Fixtures.data("user"))
        store.session = session
        await auth.bootstrap()
        let model = makeModel()
        await answerAll(model)
        await model.next()
        XCTAssertNil(model.errorMessage)
        XCTAssertTrue(StubURLProtocol.requests.filter { $0.url?.path == "/api/user" }.count >= 2,
                      "profile re-fetched after the conflict")
        XCTAssertEqual(auth.needsOnboarding, auth.currentUser?.onboardingCompletedAt == nil)
    }

    func test404SignsOutAsAccountMissing() async throws {
        StubURLProtocol.stubs["/api/onboarding/survey"] = .init(status: 404, body: Data(#"{"error":"User not found"}"#.utf8))
        let model = makeModel()
        await answerAll(model)
        await model.next()
        XCTAssertEqual(auth.state, .signedOut(reason: .accountMissing))
    }

    func testServerErrorShowsMessageAndReenables() async throws {
        StubURLProtocol.stubs["/api/onboarding/survey"] = .init(status: 400, body: Data(#"{"error":"Invalid","fieldErrors":{"b":"Too long"}}"#.utf8))
        let model = makeModel()
        await answerAll(model)
        await model.next()
        XCTAssertEqual(model.errorMessage, "Too long")
        XCTAssertFalse(model.isSubmitting)
        XCTAssertTrue(model.canAdvance)
    }
}
