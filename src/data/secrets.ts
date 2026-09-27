// PLACEHOLDER CONTENT — the secret hunt and the vault.
//
// The vault.zip in the Recycle Bin opens with the three hidden words joined
// together, in order. Each word is found somewhere else on the desktop:
//   1. about.txt  — written in white-on-white; selecting the text reveals it
//   2. Beat Deck  — the first boss you beat drops it
//   3. the Konami code (↑ ↑ ↓ ↓ ← → ← → B A) on the desktop, or typed
//      into Start Search as "up up down down left right left right b a"
// Change the words here and the whole hunt follows.
export const SECRET_WORDS = [
  { id: "about", word: "late", where: "about.txt" },
  { id: "brawl", word: "night", where: "Beat Deck" },
  { id: "konami", word: "loops", where: "an old cheat code" },
] as const;

export type SecretId = (typeof SECRET_WORDS)[number]["id"];

export const VAULT_PASSWORD = SECRET_WORDS.map((s) => s.word).join("");

export interface VaultItem {
  title: string;
  /** Shown in the "Date modified" column. */
  date: string;
  note: string;
  /** Audio file under public/. Placeholder snippets reuse the demo loops. */
  src: string;
}

// Unreleased snippets, only playable once the vault is open.
export const VAULT_ITEMS: VaultItem[] = [
  {
    title: "untitled_0412 (snippet)",
    date: "4/12/2026",
    note: "the one that almost opened the tape",
    src: "/audio/neon-rain.wav",
  },
  {
    title: "rooftop idea (snippet)",
    date: "7/03/2026",
    note: "sampled a broken music box",
    src: "/audio/velvet-static.wav",
  },
  {
    title: "boss_theme_v3 (snippet)",
    date: "8/21/2026",
    note: "boss music, before it had a boss",
    src: "/audio/arcade-dust.wav",
  },
];

export const VAULT_LETTER = [
  "if you're reading this, you dug through the bin, read between the lines, beat the boss and remembered a cheat code from 1986.",
  "these are ideas that aren't finished yet. some will turn into songs, some will stay here. you're hearing them before anyone else.",
  "don't tell everyone how you got in. tell them there's a way.",
  "— saeculo",
];
