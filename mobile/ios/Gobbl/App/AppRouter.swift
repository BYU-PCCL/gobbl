import Foundation
import Observation

enum AppTab: Hashable {
    case home, debate, skills, shop, you
}

/// Screens pushed onto a tab's `NavigationStack`.
enum AppRoute: Hashable {
    /// Debate setup. `daily` locks the topic to today's Daily Gobble (web: `/chat?daily=true`).
    case setup(daily: Bool)
    /// A debate: live chat, read-only transcript, or results once finished (web: `/chat/[id]`).
    case debate(id: String)
}

/// Owns tab selection and each tab's navigation path so any screen can send the user elsewhere
/// (results → "Start another debate", level-up → shop) without threading closures through views.
@MainActor
@Observable
final class AppRouter {
    var selectedTab: AppTab = .home
    var homePath: [AppRoute] = []
    var debatePath: [AppRoute] = []

    /// Pushes onto the selected tab's stack. Tabs without a routed stack ignore it.
    func push(_ route: AppRoute) {
        switch selectedTab {
        case .home: homePath.append(route)
        case .debate: debatePath.append(route)
        case .skills, .shop, .you: break
        }
    }

    /// Opens a newly created debate. When setup is on top it is replaced, so Back from the chat
    /// returns to wherever setup was opened from instead of to a spent setup screen.
    func openDebate(id: String) {
        switch selectedTab {
        case .home: Self.replaceSetup(in: &homePath, with: .debate(id: id))
        case .debate: Self.replaceSetup(in: &debatePath, with: .debate(id: id))
        case .skills, .shop, .you: break
        }
    }

    /// Results → "Start another debate".
    func startAnotherDebate() {
        homePath = []
        debatePath = []
        selectedTab = .debate
    }

    /// Results → "Back to home".
    func goHome() {
        homePath = []
        debatePath = []
        selectedTab = .home
    }

    func show(_ tab: AppTab) {
        selectedTab = tab
    }

    /// Sign-out: forget every pushed screen so the next account starts clean.
    func reset() {
        selectedTab = .home
        homePath = []
        debatePath = []
    }

    private static func replaceSetup(in path: inout [AppRoute], with route: AppRoute) {
        if case .setup = path.last {
            path[path.count - 1] = route
        } else {
            path.append(route)
        }
    }
}
