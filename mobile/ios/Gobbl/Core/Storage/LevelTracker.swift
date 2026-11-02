import Foundation

struct LevelChange: Equatable {
    var from: Int
    var to: Int
}

/// Remembers the last level we showed per user so the dashboard can celebrate a level-up exactly once.
/// Mirrors the web's `sessionStorage["gobbl:lastLevel"]`, but survives relaunch (`UserDefaults`, reason CA92.1).
struct LevelTracker {
    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    private func key(_ userId: String) -> String { "lastLevel.\(userId)" }

    func lastLevel(for userId: String) -> Int? {
        let value = defaults.integer(forKey: key(userId))
        return value == 0 ? nil : value
    }

    /// Records `level` and returns the change if it went up. The first observation records silently.
    @discardableResult
    func observe(level: Int, for userId: String) -> LevelChange? {
        let previous = lastLevel(for: userId)
        defaults.set(level, forKey: key(userId))
        guard let previous, level > previous else { return nil }
        return LevelChange(from: previous, to: level)
    }

    func reset(for userId: String) {
        defaults.removeObject(forKey: key(userId))
    }
}
