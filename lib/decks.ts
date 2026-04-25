export type Deck = {
  id: string
  name: string
  emoji: string
}

export const META_DECKS: Deck[] = [
  { id: "charizard-ex", name: "Charizard ex", emoji: "🔥" },
  { id: "gardevoir-ex", name: "Gardevoir ex", emoji: "🌸" },
  { id: "regidrago-vstar", name: "Regidrago VSTAR", emoji: "🐉" },
  { id: "lugia-vstar", name: "Lugia VSTAR", emoji: "🌬️" },
  { id: "chien-pao-ex", name: "Chien-Pao ex", emoji: "❄️" },
  { id: "roaring-moon-ex", name: "Roaring Moon ex", emoji: "🌙" },
  { id: "miraidon-ex", name: "Miraidon ex", emoji: "⚡" },
  { id: "iron-valiant-ex", name: "Iron Valiant ex", emoji: "⚔️" },
  { id: "snorlax-stall", name: "Snorlax Stall", emoji: "😴" },
  { id: "other", name: "Other", emoji: "❓" },
]