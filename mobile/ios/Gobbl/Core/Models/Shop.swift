import Foundation

/// A catalog item plus the user's relationship to it (`GET /api/shop`).
struct ShopInventoryItem: Codable, Equatable, Identifiable {
    var item: ShopItem
    var owned: Bool
    /// `featherBalance >= cost`; does not account for `unlockAt`.
    var canAfford: Bool

    var id: String { item.id }

    private enum CodingKeys: String, CodingKey { case owned, canAfford }

    init(item: ShopItem, owned: Bool, canAfford: Bool) {
        self.item = item
        self.owned = owned
        self.canAfford = canAfford
    }

    init(from decoder: Decoder) throws {
        item = try ShopItem(from: decoder)
        let c = try decoder.container(keyedBy: CodingKeys.self)
        owned = try c.decode(Bool.self, forKey: .owned)
        canAfford = try c.decode(Bool.self, forKey: .canAfford)
    }

    func encode(to encoder: Encoder) throws {
        try item.encode(to: encoder)
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(owned, forKey: .owned)
        try c.encode(canAfford, forKey: .canAfford)
    }
}

struct ShopResponse: Codable, Equatable {
    var featherBalance: Int
    var level: Int
    var equipped: EquippedCosmetics
    var items: [ShopInventoryItem]
}

struct PurchaseResponse: Codable, Equatable {
    var success: Bool
    var featherBalance: Int
    var itemId: String
}

struct EquipResponse: Codable, Equatable {
    var equipped: EquippedCosmetics
}
