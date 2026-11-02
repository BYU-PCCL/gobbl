import XCTest
@testable import Gobbl

final class LevelTrackerTests: XCTestCase {
    private var defaults: UserDefaults!
    private var tracker: LevelTracker!

    override func setUp() {
        super.setUp()
        defaults = UserDefaults(suiteName: "LevelTrackerTests.\(UUID().uuidString)")
        tracker = LevelTracker(defaults: defaults)
    }

    func testFirstObservationIsSilent() {
        XCTAssertNil(tracker.observe(level: 1, for: "u"))
        XCTAssertEqual(tracker.lastLevel(for: "u"), 1)
    }

    func testLevelUpFiresOnce() {
        tracker.observe(level: 1, for: "u")
        XCTAssertNil(tracker.observe(level: 1, for: "u"))
        XCTAssertEqual(tracker.observe(level: 3, for: "u"), LevelChange(from: 1, to: 3))
        XCTAssertNil(tracker.observe(level: 3, for: "u"))
    }

    func testLevelDownIsSilent() {
        tracker.observe(level: 4, for: "u")
        XCTAssertNil(tracker.observe(level: 2, for: "u"))
    }

    func testUsersAreIndependent() {
        tracker.observe(level: 2, for: "a")
        XCTAssertNil(tracker.observe(level: 5, for: "b"))
        XCTAssertEqual(tracker.observe(level: 5, for: "a"), LevelChange(from: 2, to: 5))
    }

    func testReset() {
        tracker.observe(level: 2, for: "u")
        tracker.reset(for: "u")
        XCTAssertNil(tracker.lastLevel(for: "u"))
        XCTAssertNil(tracker.observe(level: 3, for: "u"))
    }

    @MainActor
    func testAuthFormValidationMirrorsServerRules() {
        XCTAssertNil(AuthFormViewModel.validate(mode: .register, username: "abc", password: "123456"))
        XCTAssertNotNil(AuthFormViewModel.validate(mode: .register, username: "ab", password: "123456"))
        XCTAssertNotNil(AuthFormViewModel.validate(mode: .register, username: "abc", password: "12345"))
        XCTAssertNil(AuthFormViewModel.validate(mode: .login, username: "ab", password: "1"), "login does not enforce signup rules")
        XCTAssertNotNil(AuthFormViewModel.validate(mode: .login, username: "", password: "x"))
    }
}
