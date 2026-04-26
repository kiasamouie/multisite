/**
 * Curated emoji list for UniversalPicker (emoji mode).
 * Organized by category; each entry includes search keywords for filtering.
 * Kept compact to avoid bundle bloat.
 */
export interface EmojiEntry {
  char: string;
  name: string;
  keywords: string[];
  category: EmojiCategory;
}

export type EmojiCategory =
  | "smileys"
  | "people"
  | "nature"
  | "food"
  | "travel"
  | "activities"
  | "objects"
  | "symbols";

export const EMOJI_CATEGORIES: Array<{ key: EmojiCategory; label: string; icon: string }> = [
  { key: "smileys", label: "Smileys", icon: "😀" },
  { key: "people", label: "People", icon: "👤" },
  { key: "nature", label: "Nature", icon: "🌿" },
  { key: "food", label: "Food", icon: "🍔" },
  { key: "travel", label: "Travel", icon: "✈️" },
  { key: "activities", label: "Activities", icon: "⚽" },
  { key: "objects", label: "Objects", icon: "💡" },
  { key: "symbols", label: "Symbols", icon: "⭐" },
];

export const EMOJI_LIST: EmojiEntry[] = [
  // Smileys
  { char: "😀", name: "grinning", keywords: ["happy", "smile"], category: "smileys" },
  { char: "😃", name: "smiley", keywords: ["happy"], category: "smileys" },
  { char: "😄", name: "smile", keywords: ["happy", "joy"], category: "smileys" },
  { char: "😁", name: "grin", keywords: ["happy"], category: "smileys" },
  { char: "🥰", name: "loving", keywords: ["love", "heart"], category: "smileys" },
  { char: "😍", name: "heart eyes", keywords: ["love"], category: "smileys" },
  { char: "🤩", name: "star struck", keywords: ["excited"], category: "smileys" },
  { char: "😎", name: "cool", keywords: ["sunglasses"], category: "smileys" },
  { char: "🤔", name: "thinking", keywords: ["hmm"], category: "smileys" },
  { char: "😴", name: "sleeping", keywords: ["tired", "sleep"], category: "smileys" },
  { char: "🥳", name: "party", keywords: ["celebrate"], category: "smileys" },
  { char: "😇", name: "angel", keywords: ["halo"], category: "smileys" },

  // People
  { char: "👤", name: "person", keywords: ["user"], category: "people" },
  { char: "👥", name: "people", keywords: ["team", "group"], category: "people" },
  { char: "👨", name: "man", keywords: [], category: "people" },
  { char: "👩", name: "woman", keywords: [], category: "people" },
  { char: "🧑", name: "adult", keywords: [], category: "people" },
  { char: "👨‍💼", name: "office worker", keywords: ["business"], category: "people" },
  { char: "👩‍💼", name: "office worker", keywords: ["business"], category: "people" },
  { char: "👨‍💻", name: "developer", keywords: ["code", "tech"], category: "people" },
  { char: "👩‍💻", name: "developer", keywords: ["code", "tech"], category: "people" },
  { char: "🧑‍🍳", name: "cook", keywords: ["chef"], category: "people" },
  { char: "🧑‍⚕️", name: "health worker", keywords: ["doctor", "nurse"], category: "people" },
  { char: "🧑‍🎓", name: "student", keywords: ["graduate"], category: "people" },
  { char: "🤝", name: "handshake", keywords: ["deal"], category: "people" },
  { char: "👏", name: "clap", keywords: ["applause"], category: "people" },
  { char: "💪", name: "strong", keywords: ["muscle"], category: "people" },

  // Nature
  { char: "🌿", name: "herb", keywords: ["plant", "leaf"], category: "nature" },
  { char: "🌳", name: "tree", keywords: [], category: "nature" },
  { char: "🌲", name: "evergreen", keywords: [], category: "nature" },
  { char: "🌺", name: "flower", keywords: ["hibiscus"], category: "nature" },
  { char: "🌸", name: "cherry blossom", keywords: ["flower"], category: "nature" },
  { char: "🌻", name: "sunflower", keywords: [], category: "nature" },
  { char: "🌞", name: "sun", keywords: ["sunny"], category: "nature" },
  { char: "🌙", name: "moon", keywords: ["night"], category: "nature" },
  { char: "⭐", name: "star", keywords: [], category: "nature" },
  { char: "🌈", name: "rainbow", keywords: [], category: "nature" },
  { char: "🔥", name: "fire", keywords: ["hot"], category: "nature" },
  { char: "💧", name: "water", keywords: ["drop"], category: "nature" },
  { char: "🌊", name: "wave", keywords: ["water", "ocean"], category: "nature" },
  { char: "🐶", name: "dog", keywords: ["pet"], category: "nature" },
  { char: "🐱", name: "cat", keywords: ["pet"], category: "nature" },

  // Food
  { char: "🍔", name: "burger", keywords: ["food"], category: "food" },
  { char: "🍕", name: "pizza", keywords: [], category: "food" },
  { char: "🍟", name: "fries", keywords: [], category: "food" },
  { char: "🌮", name: "taco", keywords: [], category: "food" },
  { char: "🍣", name: "sushi", keywords: [], category: "food" },
  { char: "🍜", name: "noodle", keywords: ["ramen"], category: "food" },
  { char: "🥗", name: "salad", keywords: [], category: "food" },
  { char: "🍰", name: "cake", keywords: ["dessert"], category: "food" },
  { char: "☕", name: "coffee", keywords: ["drink"], category: "food" },
  { char: "🍺", name: "beer", keywords: ["drink"], category: "food" },
  { char: "🍷", name: "wine", keywords: ["drink"], category: "food" },
  { char: "🥂", name: "cheers", keywords: ["toast"], category: "food" },

  // Travel
  { char: "✈️", name: "plane", keywords: ["flight"], category: "travel" },
  { char: "🚗", name: "car", keywords: [], category: "travel" },
  { char: "🚕", name: "taxi", keywords: ["cab"], category: "travel" },
  { char: "🚌", name: "bus", keywords: [], category: "travel" },
  { char: "🚂", name: "train", keywords: [], category: "travel" },
  { char: "🚲", name: "bike", keywords: ["cycle"], category: "travel" },
  { char: "🛵", name: "scooter", keywords: [], category: "travel" },
  { char: "🏠", name: "home", keywords: ["house"], category: "travel" },
  { char: "🏢", name: "office", keywords: ["building"], category: "travel" },
  { char: "🏖️", name: "beach", keywords: [], category: "travel" },
  { char: "🗺️", name: "map", keywords: [], category: "travel" },
  { char: "📍", name: "pin", keywords: ["location"], category: "travel" },

  // Activities
  { char: "⚽", name: "soccer", keywords: ["football"], category: "activities" },
  { char: "🏀", name: "basketball", keywords: [], category: "activities" },
  { char: "🎾", name: "tennis", keywords: [], category: "activities" },
  { char: "🏊", name: "swim", keywords: [], category: "activities" },
  { char: "🏃", name: "run", keywords: ["running"], category: "activities" },
  { char: "🧘", name: "yoga", keywords: ["meditate"], category: "activities" },
  { char: "🎨", name: "art", keywords: ["paint"], category: "activities" },
  { char: "🎵", name: "music", keywords: ["note"], category: "activities" },
  { char: "🎬", name: "film", keywords: ["movie"], category: "activities" },
  { char: "🎮", name: "gaming", keywords: ["game"], category: "activities" },
  { char: "📷", name: "camera", keywords: ["photo"], category: "activities" },
  { char: "✂️", name: "scissors", keywords: ["cut"], category: "activities" },

  // Objects
  { char: "💡", name: "bulb", keywords: ["idea", "light"], category: "objects" },
  { char: "📱", name: "phone", keywords: ["mobile"], category: "objects" },
  { char: "💻", name: "laptop", keywords: ["computer"], category: "objects" },
  { char: "⌨️", name: "keyboard", keywords: [], category: "objects" },
  { char: "🖥️", name: "desktop", keywords: [], category: "objects" },
  { char: "📧", name: "email", keywords: ["mail"], category: "objects" },
  { char: "📞", name: "telephone", keywords: ["call"], category: "objects" },
  { char: "📅", name: "calendar", keywords: ["date"], category: "objects" },
  { char: "📊", name: "chart", keywords: ["stats", "bar"], category: "objects" },
  { char: "📈", name: "growth", keywords: ["trend", "up"], category: "objects" },
  { char: "💰", name: "money", keywords: ["cash"], category: "objects" },
  { char: "💳", name: "card", keywords: ["credit"], category: "objects" },
  { char: "🔒", name: "lock", keywords: ["secure"], category: "objects" },
  { char: "🔑", name: "key", keywords: [], category: "objects" },
  { char: "🎁", name: "gift", keywords: ["present"], category: "objects" },
  { char: "🛒", name: "cart", keywords: ["shopping"], category: "objects" },
  { char: "📦", name: "package", keywords: ["box"], category: "objects" },
  { char: "🔧", name: "wrench", keywords: ["tool"], category: "objects" },
  { char: "⚙️", name: "gear", keywords: ["settings"], category: "objects" },
  { char: "🛠️", name: "tools", keywords: [], category: "objects" },

  // Symbols
  { char: "✅", name: "check", keywords: ["yes", "ok"], category: "symbols" },
  { char: "❌", name: "cross", keywords: ["no", "wrong"], category: "symbols" },
  { char: "⚡", name: "lightning", keywords: ["bolt", "fast"], category: "symbols" },
  { char: "❤️", name: "heart", keywords: ["love"], category: "symbols" },
  { char: "💯", name: "hundred", keywords: ["perfect"], category: "symbols" },
  { char: "🎯", name: "target", keywords: ["goal"], category: "symbols" },
  { char: "🚀", name: "rocket", keywords: ["launch"], category: "symbols" },
  { char: "🏆", name: "trophy", keywords: ["winner"], category: "symbols" },
  { char: "🥇", name: "gold", keywords: ["first"], category: "symbols" },
  { char: "🎖️", name: "medal", keywords: ["award"], category: "symbols" },
  { char: "⚠️", name: "warning", keywords: ["alert"], category: "symbols" },
  { char: "🔔", name: "bell", keywords: ["notification"], category: "symbols" },
  { char: "➕", name: "plus", keywords: ["add"], category: "symbols" },
  { char: "➖", name: "minus", keywords: [], category: "symbols" },
  { char: "✨", name: "sparkle", keywords: ["new"], category: "symbols" },
  { char: "♾️", name: "infinity", keywords: [], category: "symbols" },
];
