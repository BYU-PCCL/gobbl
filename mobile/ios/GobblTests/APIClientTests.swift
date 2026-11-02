import XCTest
@testable import Gobbl

final class APIClientTests: XCTestCase {
    private var vault: SessionVault!
    private var unauthorizedCount = 0
    private var client: APIClient!

    override func setUp() {
        super.setUp()
        StubURLProtocol.reset()
        unauthorizedCount = 0
        vault = SessionVault(session: MobileSession(
            accessToken: "tok", expiresAt: Date().addingTimeInterval(3600),
            user: AuthUser(id: "u1", username: "tester", onboardingCompletedAt: nil)))
        let counter = Counter()
        client = APIClient(baseURL: URL(string: "https://example.test")!,
                           session: StubURLProtocol.makeSession(),
                           clientVersion: "1.0.0",
                           vault: vault,
                           onUnauthorized: { counter.increment() })
        self.counter = counter
    }

    private var counter: Counter!
    private final class Counter: @unchecked Sendable {
        var value = 0
        func increment() { value += 1 }
    }

    func testSendsBearerAndClientHeaders() async throws {
        StubURLProtocol.stubs["/api/user"] = .init(status: 200, body: try Fixtures.data("user"))
        let user = try await client.send(API.user)
        XCTAssertEqual(user.username, "fixture_1793041302")
        let request = try XCTUnwrap(StubURLProtocol.requests.first)
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer tok")
        XCTAssertEqual(request.value(forHTTPHeaderField: "X-Gobbl-Client"), "ios/1.0.0")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Accept"), "application/json")
    }

    func testPublicEndpointSendsNoAuthorization() async throws {
        vault.session = nil
        StubURLProtocol.stubs["/api/config"] = .init(status: 200, body: try Fixtures.data("config"))
        _ = try await client.send(API.config)
        XCTAssertNil(StubURLProtocol.requests.first?.value(forHTTPHeaderField: "Authorization"))
    }

    func testMissingTokenOnAuthenticatedEndpointThrowsWithoutNetwork() async {
        vault.session = nil
        do {
            _ = try await client.send(API.user)
            XCTFail("expected unauthorized")
        } catch APIError.unauthorized {
            XCTAssertTrue(StubURLProtocol.requests.isEmpty)
        } catch {
            XCTFail("unexpected \(error)")
        }
    }

    func testUnauthorizedTriggersCallbackOnlyForAuthenticatedEndpoints() async throws {
        StubURLProtocol.stubs["/api/user"] = .init(status: 401, body: Data(#"{"error":"Unauthorized"}"#.utf8))
        StubURLProtocol.stubs["/api/mobile/auth/login"] = .init(status: 401, body: Data(#"{"error":"Invalid username or password"}"#.utf8))
        await XCTAssertThrowsAPIError(try await client.send(API.user)) { if case .unauthorized = $0 { return true }; return false }
        XCTAssertEqual(counter.value, 1)
        await XCTAssertThrowsAPIError(try await client.send(API.login(username: "a", password: "b"))) { if case .unauthorized = $0 { return true }; return false }
        XCTAssertEqual(counter.value, 1, "a failed login must not sign the user out")
    }

    func testErrorCodesAndStatuses() async throws {
        StubURLProtocol.stubs["/api/chat"] = .init(status: 409, body: try Fixtures.data("error-already-completed"))
        await XCTAssertThrowsAPIError(try await client.send(API.chat(.wrapUp(debateId: "d")))) {
            $0.code == APIErrorCode.alreadyCompleted && $0.status == 409
        }
        StubURLProtocol.stubs["/api/shop/purchase"] = .init(status: 402, body: try Fixtures.data("shop-purchase"))
        await XCTAssertThrowsAPIError(try await client.send(API.purchase(itemId: "crown"))) {
            $0.code == APIErrorCode.notEnoughFeathers && $0.body?.featherBalance == 25
        }
        StubURLProtocol.stubs["/api/debates"] = .init(status: 404, body: Data(#"{"error":"Debate not found"}"#.utf8))
        await XCTAssertThrowsAPIError(try await client.send(API.debate(id: "nope"))) {
            if case .notFound(let body) = $0 { return body?.error == "Debate not found" }; return false
        }
        StubURLProtocol.stubs["/api/modules"] = .init(status: 500, body: Data("<html>".utf8))
        await XCTAssertThrowsAPIError(try await client.send(API.modules)) {
            if case .server(500, nil) = $0 { return true }; return false
        }
    }

    func testTransportFailureIsWrapped() async {
        StubURLProtocol.stubs["/api/user"] = .init(status: 0, body: Data(), error: URLError(.notConnectedToInternet))
        await XCTAssertThrowsAPIError(try await client.send(API.user)) { $0.isTransport }
        XCTAssertEqual(counter.value, 0)
    }

    func testEmptyResponse() async throws {
        StubURLProtocol.stubs["/api/user"] = .init(status: 204, body: Data())
        let empty = try await client.send(API.deleteAccount)
        XCTAssertEqual(empty, EmptyResponse())
        XCTAssertEqual(StubURLProtocol.requests.first?.httpMethod, "DELETE")
    }

    func testQueryEncoding() throws {
        let request = try client.makeRequest(API.personaPreview(tier: .fullGobble))
        XCTAssertEqual(request.url?.absoluteString, "https://example.test/api/personas/preview?tier=Full%20Gobble")
    }
}

/// Asserts that an async call throws an `APIError` satisfying `matches`.
func XCTAssertThrowsAPIError<T>(_ expression: @autoclosure () async throws -> T,
                                file: StaticString = #filePath, line: UInt = #line,
                                _ matches: (APIError) -> Bool) async {
    do {
        _ = try await expression()
        XCTFail("expected an APIError", file: file, line: line)
    } catch let error as APIError {
        XCTAssertTrue(matches(error), "unexpected APIError \(error)", file: file, line: line)
    } catch {
        XCTFail("unexpected \(error)", file: file, line: line)
    }
}
