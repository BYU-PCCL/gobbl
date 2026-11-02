import Foundation

/// Scores on a 0-10 scale. The server does not clamp them.
struct CivilityDimensions: Codable, Equatable {
    var participation: Double
    var selfExpressionReason: Double
    var mutualExchange: Double
    var interrogation: Double
}

struct TurnFeedback: Codable, Equatable, Identifiable {
    var turn: Int
    var wellDone: String
    var tryInstead: String
    var id: Int { turn }
}

/// Any subset of the slots, each holding a shop item id. Always an object, never null.
struct EquippedCosmetics: Codable, Equatable {
    var hat: String?
    var face: String?
    var neck: String?
    var chest: String?
    var cape: String?
    var background: String?

    static let none = EquippedCosmetics()

    init(hat: String? = nil, face: String? = nil, neck: String? = nil,
         chest: String? = nil, cape: String? = nil, background: String? = nil) {
        self.hat = hat; self.face = face; self.neck = neck
        self.chest = chest; self.cape = cape; self.background = background
    }

    subscript(slot: ShopSlot) -> String? {
        get {
            switch slot {
            case .hat: return hat
            case .face: return face
            case .neck: return neck
            case .chest: return chest
            case .cape: return cape
            case .background: return background
            case .unknown: return nil
            }
        }
        set {
            switch slot {
            case .hat: hat = newValue
            case .face: face = newValue
            case .neck: neck = newValue
            case .chest: chest = newValue
            case .cape: cape = newValue
            case .background: background = newValue
            case .unknown: break
            }
        }
    }

    var isEmpty: Bool { ShopSlot.allCases.allSatisfy { self[$0] == nil } }

    /// Equipped (slot, itemId) pairs in server display order.
    var equippedPairs: [(slot: ShopSlot, itemId: String)] {
        ShopSlot.allCases.compactMap { slot in self[slot].map { (slot, $0) } }
    }
}

struct PersonaPreview: Codable, Equatable {
    var id: String
    var initials: String
    var beliefKey: BeliefKey
}

struct SurveyResponse: Codable, Equatable {
    var onboardingCompletedAt: Date
}

struct SlotOffset: Codable, Equatable {
    var x: Double
    var y: Double
    static let zero = SlotOffset(x: 0, y: 0)
}

/// Per-stage item offsets in the 200x200 avatar space. Stages without an entry use zero.
struct StageAnchors: Codable, Equatable {
    var hat: SlotOffset?
    var face: SlotOffset?
    var neck: SlotOffset?
    var chest: SlotOffset?
    var cape: SlotOffset?

    subscript(slot: ShopSlot) -> SlotOffset {
        switch slot {
        case .hat: return hat ?? .zero
        case .face: return face ?? .zero
        case .neck: return neck ?? .zero
        case .chest: return chest ?? .zero
        case .cape: return cape ?? .zero
        case .background, .unknown: return .zero
        }
    }
}
