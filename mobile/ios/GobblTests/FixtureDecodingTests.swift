import XCTest
@testable import Gobbl

/// Every captured payload must decode into its model (docs/api.md is the contract).
final class FixtureDecodingTests: XCTestCase {
    func testUser() throws {
        let user = try Fixtures.decode(UserProfile.self, "user")
        XCTAssertEqual(user.level, 1)
        XCTAssertEqual(user.xp, 48)
        XCTAssertEqual(user.levelInfo.xpForNext, 200)
        XCTAssertEqual(user.levelInfo.progressPercent, 24)
        XCTAssertEqual(user.beliefKey, .center)
        XCTAssertTrue(user.equippedCosmetics.isEmpty)
        XCTAssertEqual(user.recentDebates.first?.difficulty, .spiritedStrut)
        XCTAssertNotNil(user.onboardingCompletedAt)
        XCTAssertEqual(user.avatarStage, 1)
    }

    func testLogin() throws {
        let auth = try Fixtures.decode(AuthResponse.self, "mobile-auth-login")
        XCTAssertEqual(auth.accessToken, "REDACTED.FIXTURE.TOKEN")
        XCTAssertNil(auth.user.onboardingCompletedAt)
        XCTAssertEqual(JSONCoding.utcDayKey(for: auth.expiresAt), "2026-11-25")
    }

    func testConfig() throws {
        let config = try Fixtures.decode(AppConfig.self, "config")
        XCTAssertEqual(config.rules.maxTurns, 8)
        XCTAssertEqual(config.rules.maxMessageChars, 500)
        XCTAssertEqual(config.today.date, "2026-10-26")
        XCTAssertEqual(config.difficulties.map(\.key), [.friendlyCluck, .spiritedStrut, .fullGobble])
        XCTAssertEqual(config.levels.count, 8)
        XCTAssertEqual(config.level(8)?.name, "Thunderbird")
        XCTAssertEqual(config.badges.count, 8)
        XCTAssertEqual(config.shop.slots, [.background, .cape, .hat, .face, .neck, .chest])
        XCTAssertEqual(config.shop.catalog.count, 25)
        XCTAssertEqual(config.shopItem(id: "wings")?.unlockAt, 6)
        XCTAssertNil(config.shopItem(id: "mortarboard")?.isNew)
        XCTAssertEqual(config.shopItem(id: "crown")?.isNew, true)
        XCTAssertEqual(config.anchors(forStage: 3)[.hat], SlotOffset(x: -28, y: -10))
        XCTAssertEqual(config.anchors(forStage: 5)[.hat], .zero)
        XCTAssertEqual(config.survey.questions.count, 3)
        XCTAssertEqual(config.ideologyOptions.map(\.key), [.left, .leanLeft, .center, .leanRight, .right])
        XCTAssertEqual(config.civility.dimensions.count, 4)
        XCTAssertEqual(config.minClientVersion.ios, "1.0.0")

        // The disk cache round-trips through our encoder.
        let data = try JSONCoding.encoder.encode(config)
        XCTAssertEqual(try JSONCoding.decoder.decode(AppConfig.self, from: data), config)
    }

    func testDebatesList() throws {
        let debates = try Fixtures.decode([DebateSummary].self, "debates")
        XCTAssertFalse(debates.isEmpty)
        XCTAssertEqual(debates.first?.beliefKey, .right)
        XCTAssertEqual(debates.first?.overallScore, 6.125)
    }

    func testDebateDetailCompleted() throws {
        let detail = try Fixtures.decode(DebateDetail.self, "debate-detail-completed")
        XCTAssertEqual(detail.id, detail.summary.id)
        XCTAssertEqual(detail.messages.first?.role, .assistant)
        XCTAssertNil(detail.messages.first?.civilityScore)
        XCTAssertGreaterThan(detail.analysis?.count ?? 0, 0)
        XCTAssertGreaterThanOrEqual(detail.userTurnCount, 1)
    }

    func testDebateDetailInProgress() throws {
        let detail = try Fixtures.decode(DebateDetail.self, "debate-detail-in-progress")
        XCTAssertNil(detail.analysis)
        XCTAssertFalse(detail.summary.completed)
    }

    func testCreateDebate() throws {
        let created = try Fixtures.decode(CreateDebateResponse.self, "debates-create")
        XCTAssertEqual(created.personaInitials, "R.T.")
        XCTAssertFalse(created.wasResumed)
    }

    func testChatTurnAndFinish() throws {
        guard case .turn(let turn) = try Fixtures.decode(ChatResponse.self, "chat-turn") else {
            return XCTFail("chat-turn should decode as a turn")
        }
        XCTAssertEqual(turn.turnNumber, 1)
        XCTAssertEqual(turn.maxTurns, 8)
        XCTAssertEqual(turn.civility.overall, 6.5)

        guard case .finished(let finish) = try Fixtures.decode(ChatResponse.self, "chat-finish") else {
            return XCTFail("chat-finish should decode as finished")
        }
        XCTAssertEqual(finish.xp.total, 48)
        XCTAssertEqual(finish.feathers.total, 25)
        XCTAssertEqual(finish.newBadges, ["first-gobble"])
        XCTAssertFalse(finish.leveledUp)
    }

    func testAnalyzePersonaSurvey() throws {
        XCTAssertEqual(try Fixtures.decode(AnalyzeResponse.self, "debates-analyze").analysis.first?.turn, 1)
        let persona = try Fixtures.decode(PersonaPreview.self, "personas-preview")
        XCTAssertEqual(persona.beliefKey, .leanRight)
        XCTAssertEqual(persona.initials, "T.S.")
        _ = try Fixtures.decode(SurveyResponse.self, "onboarding-survey")
    }

    func testLeaderboard() throws {
        let rows = try Fixtures.decode([LeaderboardEntry].self, "leaderboard")
        XCTAssertEqual(rows.first?.rank, 1)
        XCTAssertEqual(rows.first?.username, "EmpathyElla")
    }

    func testModules() throws {
        let modules = try Fixtures.decode([ModuleSummary].self, "modules")
        XCTAssertEqual(modules.first?.skill, .participation)
        XCTAssertEqual(modules.first?.progress?.inProgress, true)
        let start = try Fixtures.decode(ModuleStartResponse.self, "modules-start")
        guard case .diagnostic(let id, let questions)? = start.step else {
            return XCTFail("modules-start step should be diagnostic")
        }
        XCTAssertEqual(id, "diagnostic")
        XCTAssertEqual(questions.count, 2)
        XCTAssertEqual(start.stepCount, 4)
    }

    func testShop() throws {
        let shop = try Fixtures.decode(ShopResponse.self, "shop")
        XCTAssertEqual(shop.items.count, 25)
        XCTAssertEqual(shop.items.first?.item.id, "mortarboard")
        XCTAssertEqual(shop.items.first?.owned, false)
        XCTAssertEqual(shop.items.first { $0.id == "crown" }?.item.isNew, true)
    }

    func testErrorBodies() throws {
        XCTAssertEqual(try Fixtures.decode(APIErrorBody.self, "error-already-completed").code, APIErrorCode.alreadyCompleted)
        let purchase = try Fixtures.decode(APIErrorBody.self, "shop-purchase")
        XCTAssertEqual(purchase.code, APIErrorCode.notEnoughFeathers)
        XCTAssertEqual(purchase.featherBalance, 25)
        XCTAssertNil(try Fixtures.decode(APIErrorBody.self, "shop-equip").code)
    }

    func testUnknownEnumValuesSurvive() throws {
        XCTAssertEqual(DifficultyTier(string: "Devil's Advocate").displayName, "Full Gobble")
        XCTAssertEqual(ShopSlot(string: "tail"), .unknown("tail"))
        let question = try JSONCoding.decoder.decode([SurveyQuestion].self,
                                                     from: Data(#"[{"type":"slider","key":"k"}]"#.utf8))
        XCTAssertEqual(question.first?.key, "k")
        let step = try JSONCoding.decoder.decode(ModuleStep.self,
                                                 from: Data(#"{"id":"x","kind":"video","url":"u"}"#.utf8))
        XCTAssertEqual(step, .unknown(id: "x", kind: "video"))
    }

    func testRequestEncoding() throws {
        let equip = String(decoding: try JSONCoding.encoder.encode(EquipRequest(slot: "hat", itemId: nil)), as: UTF8.self)
        XCTAssertTrue(equip.contains(#""itemId":null"#), "unequip must send an explicit null")
        let daily = String(decoding: try JSONCoding.encoder.encode(
            CreateDebateRequest(dailyWith: .fullGobble, personaId: nil, allowProfanity: true)), as: UTF8.self)
        XCTAssertFalse(daily.contains("topic"))
        XCTAssertTrue(daily.contains(#""isDaily":true"#))
        XCTAssertEqual(String(decoding: try JSONCoding.encoder.encode(DeleteAccountRequest()), as: UTF8.self),
                       #"{"confirm":"DELETE"}"#)
    }

    func testDateParsing() {
        XCTAssertNotNil(JSONCoding.ISO8601.parse("2026-10-26T19:01:42Z"))
        XCTAssertNotNil(JSONCoding.ISO8601.parse("2026-10-26T19:01:42.365Z"))
        XCTAssertNil(JSONCoding.ISO8601.parse("yesterday"))
    }
}
