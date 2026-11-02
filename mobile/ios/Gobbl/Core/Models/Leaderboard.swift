import Foundation

/// One row of `GET /api/leaderboard`, rank 1 first.
struct LeaderboardEntry: Codable, Equatable, Identifiable {
    var rank: Int
    var id: String
    var username: String
    var xp: Int
    var level: Int
    var civilityScore: Double
    var streak: Int
    var longestStreak: Int
    var totalDebates: Int
    var isCurrentUser: Bool
    var equippedCosmetics: EquippedCosmetics
}
