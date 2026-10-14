export type ShopSlot = "hat" | "face" | "neck" | "chest" | "cape" | "background";

export interface ShopItem {
  id: string;
  name: string;
  slot: ShopSlot;
  cost: number;
  accent: string;
  accentBg: string;
  isNew?: boolean;
  unlockAt?: number;
}

export const SHOP_SLOTS: ShopSlot[] = ["background", "cape", "hat", "face", "neck", "chest"];

export const SHOP_CATALOG: ShopItem[] = [
  // Hats
  { id: "mortarboard", name: "Scholar Cap",    slot: "hat",        cost: 250,  accent: "#1F4937", accentBg: "#D5DFD4" },
  { id: "crown",       name: "Tiny Crown",     slot: "hat",        cost: 800,  accent: "#E4A547", accentBg: "#FBE9C4", isNew: true },
  { id: "beanie",      name: "Knit Beanie",    slot: "hat",        cost: 60,   accent: "#7A2916", accentBg: "#F4D9CC" },
  { id: "tophat",      name: "Top Hat",        slot: "hat",        cost: 420,  accent: "#1A1612", accentBg: "#E8DDC6" },
  { id: "wizard",      name: "Wizard Hat",     slot: "hat",        cost: 650,  accent: "#1F4937", accentBg: "#D5DFD4" },
  { id: "beret",       name: "Painter Beret",  slot: "hat",        cost: 220,  accent: "#7A2916", accentBg: "#F4E3D5" },
  { id: "baseball",    name: "Ball Cap",       slot: "hat",        cost: 80,   accent: "#1F4937", accentBg: "#D5DFD4" },
  { id: "pumpkin",     name: "Pumpkin Lid",    slot: "hat",        cost: 320,  accent: "#C0461C", accentBg: "#FBE9C4", isNew: true },
  // Face
  { id: "aviators",   name: "Aviators",        slot: "face",       cost: 70,   accent: "#1A1612", accentBg: "#F4D9CC" },
  { id: "round",      name: "Wire Frames",     slot: "face",       cost: 50,   accent: "#1A1612", accentBg: "#D5DFD4" },
  { id: "monocle",    name: "Gold Monocle",    slot: "face",       cost: 380,  accent: "#E4A547", accentBg: "#FBE9C4" },
  { id: "eyepatch",   name: "Eye Patch",       slot: "face",       cost: 240,  accent: "#1A1612", accentBg: "#E8DDC6" },
  { id: "starshades", name: "Star Shades",     slot: "face",       cost: 300,  accent: "#C0461C", accentBg: "#F4D9CC" },
  // Neck
  { id: "bowtie",     name: "Bow Tie",         slot: "neck",       cost: 220,  accent: "#7A2916", accentBg: "#F4D9CC" },
  { id: "scarf",      name: "Striped Scarf",   slot: "neck",       cost: 340,  accent: "#1F4937", accentBg: "#D5DFD4" },
  { id: "pearls",     name: "Pearl Necklace",  slot: "neck",       cost: 540,  accent: "#F4E3D5", accentBg: "#FBE9C4" },
  // Chest
  { id: "sheriff",    name: "Sheriff Star",    slot: "chest",      cost: 280,  accent: "#E4A547", accentBg: "#FBE9C4" },
  { id: "medal",      name: "Gold Medal",      slot: "chest",      cost: 460,  accent: "#E4A547", accentBg: "#FBE9C4" },
  // Cape
  { id: "cape",       name: "Hero Cape",       slot: "cape",       cost: 520,  accent: "#C0461C", accentBg: "#F4D9CC" },
  { id: "wings",      name: "Spirit Wings",    slot: "cape",       cost: 900,  accent: "#1F4937", accentBg: "#D5DFD4", unlockAt: 6 },
  // Background
  { id: "forest",     name: "Forest Glade",    slot: "background", cost: 600,  accent: "#1F4937", accentBg: "#D5DFD4" },
  { id: "sunset",     name: "Sunset Glow",     slot: "background", cost: 700,  accent: "#C0461C", accentBg: "#FCE2C0" },
  { id: "cosmic",     name: "Cosmic Drift",    slot: "background", cost: 1200, accent: "#3A2D5C", accentBg: "#2A2440", unlockAt: 6 },
  { id: "dots",       name: "Polka Dots",      slot: "background", cost: 240,  accent: "#C0461C", accentBg: "#F4ECDD" },
  { id: "confetti",   name: "Confetti Party",  slot: "background", cost: 380,  accent: "#1F4937", accentBg: "#1F4937", isNew: true },
];

const catalogById = new Map(SHOP_CATALOG.map((item) => [item.id, item]));

export function getShopItem(itemId: string): ShopItem | undefined {
  return catalogById.get(itemId);
}

export function isValidItemId(itemId: string): boolean {
  return catalogById.has(itemId);
}

export type EquippedCosmetics = Partial<Record<ShopSlot, string>>;

export function parseEquippedCosmetics(raw: unknown): EquippedCosmetics {
  if (raw == null || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: EquippedCosmetics = {};
  for (const slot of SHOP_SLOTS) {
    const v = o[slot];
    if (typeof v === "string" && isValidItemId(v)) {
      const item = getShopItem(v);
      if (item && item.slot === slot) out[slot] = v;
    }
  }
  return out;
}

export function serializeEquippedCosmetics(equipped: EquippedCosmetics): EquippedCosmetics {
  const out: EquippedCosmetics = {};
  for (const slot of SHOP_SLOTS) {
    const id = equipped[slot];
    if (id && isValidItemId(id)) {
      const item = getShopItem(id);
      if (item && item.slot === slot) out[slot] = id;
    }
  }
  return out;
}
