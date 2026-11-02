import SwiftUI

/// Names from the web's `Icon.tsx`, mapped to SF Symbols.
enum GIconName {
    case home, debate, skills, shop, profile, flock
    case chevronRight, chevronLeft, chevronDown, arrowRight, close, check, plus, send
    case feather, xp, streak, civility, lock, info, warning, refresh, signOut, trash, eye, eyeSlash, question, badge

    var systemName: String {
        switch self {
        case .home: return "house.fill"
        case .debate: return "bubble.left.and.bubble.right.fill"
        case .skills: return "graduationcap.fill"
        case .shop: return "bag.fill"
        case .profile: return "person.fill"
        case .flock: return "bird.fill"
        case .chevronRight: return "chevron.right"
        case .chevronLeft: return "chevron.left"
        case .chevronDown: return "chevron.down"
        case .arrowRight: return "arrow.right"
        case .close: return "xmark"
        case .check: return "checkmark"
        case .plus: return "plus"
        case .send: return "arrow.up"
        case .feather: return "leaf.fill"
        case .xp: return "sparkles"
        case .streak: return "flame.fill"
        case .civility: return "hand.raised.fill"
        case .lock: return "lock.fill"
        case .info: return "info.circle"
        case .warning: return "exclamationmark.triangle.fill"
        case .refresh: return "arrow.clockwise"
        case .signOut: return "rectangle.portrait.and.arrow.right"
        case .trash: return "trash"
        case .eye: return "eye"
        case .eyeSlash: return "eye.slash"
        case .question: return "questionmark.circle"
        case .badge: return "rosette"
        }
    }
}

struct GIcon: View {
    let name: GIconName
    var size: CGFloat = 18
    var weight: Font.Weight = .semibold

    init(_ name: GIconName, size: CGFloat = 18, weight: Font.Weight = .semibold) {
        self.name = name
        self.size = size
        self.weight = weight
    }

    var body: some View {
        Image(systemName: name.systemName)
            .font(.system(size: size, weight: weight))
            .frame(width: size, height: size)
    }
}
