import XCTest
@testable import Gobbl

@MainActor
final class AuthStoreTests: XCTestCase {
    private var store: InMemorySessionStore!
    private var vault: SessionVault!
    private var auth: AuthStore!

    private let validSession = MobileSession(
        accessToken: "tok", expiresAt: Date().addingTimeInterval(86_400),
        user: AuthUser(id: "u1", username: "tester", onboardingCompletedAt: nil))

    override func setUp() {
        super.setUp()
        StubURLProtocol.reset()
        store = InMemorySessionStore()
        vault = SessionVault()
        let relay = Relay()
        let client = APIClient(baseURL: URL(string: "https://example.test")!,
                               session: StubURLProtocol.makeSession(),
                               clientVersion: "1.0.0", vault: vault,
                               onUnauthorized: { relay.fire() })
        auth = AuthStore(client: client, store: store, vault: vault)
        relay.handler = { [auth] in auth?.handleUnauthorized() }
    }

    private final class Relay: @unchecked Sendable {
        var handler: (@Sendable () -> Void)?
        func fire() { handler?() }
    }

    func testBootstrapWithoutSessionIsSignedOut() async {
        await auth.bootstrap()
        XCTAssertEqual(auth.state, .signedOut(reason: nil))
    }

    func testBootstrapValidatesStoredSession() async throws {
        store.session = validSession
        StubURLProtocol.stubs["/api/user"] = .init(status: 200, body: try Fixtures.data("user"))
        await auth.bootstrap()
        guard case .signedIn(let user) = auth.state else { return XCTFail("expected signedIn, got \(auth.state)") }
        XCTAssertEqual(user.username, "fixture_1793041302", "summary is refreshed from /api/user")
        XCTAssertEqual(store.session?.user.username, "fixture_1793041302")
        XCTAssertEqual(vault.accessToken, "tok")
    }

    func testBootstrapWithExpiredSessionSignsOut() async {
        var expired = validSession
        expired.expiresAt = Date().addingTimeInterval(-60)
        store.session = expired
        await auth.bootstrap()
        XCTAssertEqual(auth.state, .signedOut(reason: .sessionExpired))
        XCTAssertNil(store.session)
        XCTAssertTrue(StubURLProtocol.requests.isEmpty)
    }

    func testBootstrap401SignsOutAsExpired() async {
        store.session = validSession
        StubURLProtocol.stubs["/api/user"] = .init(status: 401, body: Data(#"{"error":"Unauthorized"}"#.utf8))
        await auth.bootstrap()
        XCTAssertEqual(auth.state, .signedOut(reason: .sessionExpired))
        XCTAssertNil(vault.session)
    }

    func testBootstrap404SignsOutAsAccountMissing() async {
        store.session = validSession
        StubURLProtocol.stubs["/api/user"] = .init(status: 404, body: Data(#"{"error":"User not found"}"#.utf8))
        await auth.bootstrap()
        XCTAssertEqual(auth.state, .signedOut(reason: .accountMissing))
    }

    func testBootstrapOfflineKeepsTokenAndShowsRetry() async {
        store.session = validSession
        StubURLProtocol.stubs["/api/user"] = .init(status: 0, body: Data(), error: URLError(.notConnectedToInternet))
        await auth.bootstrap()
        guard case .unreachable = auth.state else { return XCTFail("expected unreachable, got \(auth.state)") }
        XCTAssertEqual(store.session, validSession, "a transport error must never sign the user out")
        XCTAssertEqual(vault.accessToken, "tok")
    }

    func testLoginStoresSession() async throws {
        StubURLProtocol.stubs["/api/mobile/auth/login"] = .init(status: 200, body: try Fixtures.data("mobile-auth-login"))
        try await auth.login(username: "fixture", password: "secret")
        XCTAssertEqual(auth.currentUser?.username, "fixture_1793041258")
        XCTAssertEqual(store.session?.accessToken, "REDACTED.FIXTURE.TOKEN")
        XCTAssertEqual(vault.accessToken, "REDACTED.FIXTURE.TOKEN")
        XCTAssertTrue(auth.needsOnboarding)
    }

    func testFailedLoginLeavesStateUntouched() async throws {
        StubURLProtocol.stubs["/api/mobile/auth/login"] = .init(status: 401, body: Data(#"{"error":"Invalid username or password"}"#.utf8))
        await auth.bootstrap()
        do {
            try await auth.login(username: "a", password: "b")
            XCTFail("expected failure")
        } catch APIError.unauthorized {}
        XCTAssertEqual(auth.state, .signedOut(reason: nil))
    }

    func testSignOutIsIdempotentAndFirstReasonWins() async {
        store.session = validSession
        StubURLProtocol.stubs["/api/user"] = .init(status: 401, body: Data())
        await auth.bootstrap()
        auth.signOut(.userRequested)
        XCTAssertEqual(auth.state, .signedOut(reason: .sessionExpired))
    }

    func testMarkOnboardingCompleted() async throws {
        store.session = validSession
        StubURLProtocol.stubs["/api/user"] = .init(status: 200, body: try Fixtures.data("user"))
        await auth.bootstrap()
        let now = Date()
        auth.markOnboardingCompleted(at: now)
        XCTAssertEqual(auth.currentUser?.onboardingCompletedAt, now)
        XCTAssertEqual(store.session?.user.onboardingCompletedAt, now)
        XCTAssertFalse(auth.needsOnboarding)
    }
}

