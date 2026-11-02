import Foundation

/// `GET /api/user`.
struct UserProfile: Codable, Equatable, Identifiable {
    var id: String
    var username: String
    var xp: Int
    var featherBalance: Int
    var level: Int
    var levelInfo: LevelInfo
    var equippedCosmetics: EquippedCosmetics
    var ownedItemIds: [String]
    var civilityScore: Double
    var currentStreak: Int
    var longestStreak: Int
    var dailyCompleted: Bool
    var badges: [String]
    var beliefKey: BeliefKey?
    var recentDebates: [RecentDebate]
    var createdAt: Date
    var onboardingCompletedAt: Date?

    /// The web renders `stage={user.level}`; levels and avatar stages are both 1-8.
    var avatarStage: Int { min(max(level, 1), 8) }

    var authUser: AuthUser {
        AuthUser(id: id, username: username, onboardingCompletedAt: onboardingCompletedAt)
    }
}

struct RecentDebate: Codable, Equatable, Identifiable {
    var id: String
    var topic: String
    var category: String
    var difficulty: DifficultyTier
    var score: Double?
    var xpEarned: Int
    var feathersEarned: Int
    var completedAt: Date?
}
