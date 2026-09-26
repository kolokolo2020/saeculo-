import { create } from "zustand";
import { SECRET_WORDS, VAULT_PASSWORD, type SecretId } from "@/data/secrets";
import { useBalloonStore } from "@/components/desktop/balloonStore";

const STORAGE_KEY = "saeculo-secrets";

interface SecretState {
  found: SecretId[];
  unlocked: boolean;
  /** Record a hidden word; announces it the first time. */
  find: (id: SecretId) => void;
  /** Returns whether the password opened the vault. */
  tryUnlock: (password: string) => boolean;
  /** Load progress. Called from an effect after mount, so the first client
   *  render matches the server. */
  hydrate: () => void;
}

function save(found: SecretId[], unlocked: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ found, unlocked }));
  } catch {
    // storage unavailable — progress lasts for this visit only
  }
}

const isSecretId = (v: unknown): v is SecretId => SECRET_WORDS.some((s) => s.id === v);

export const useSecretStore = create<SecretState>((set, get) => ({
  found: [],
  unlocked: false,
  find: (id) => {
    const { found, unlocked } = get();
    if (found.includes(id)) return;
    const next = [...found, id];
    set({ found: next });
    save(next, unlocked);
    const index = SECRET_WORDS.findIndex((s) => s.id === id);
    const word = SECRET_WORDS[index].word.toUpperCase();
    useBalloonStore
      .getState()
      .show(
        `Hidden word found (${next.length}/${SECRET_WORDS.length})`,
        next.length === SECRET_WORDS.length
          ? `Word ${index + 1} is ${word}. That's all of them. Something in the Recycle Bin wants a password.`
          : `Word ${index + 1} is ${word}. Keep looking.`,
      );
  },
  tryUnlock: (password) => {
    const ok = password.trim().toLowerCase().replace(/\s+/g, "") === VAULT_PASSWORD;
    if (ok) {
      set({ unlocked: true });
      save(get().found, true);
    }
    return ok;
  },
  hydrate: () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (!saved || typeof saved !== "object") return;
      const found = Array.isArray(saved.found) ? saved.found.filter(isSecretId) : [];
      set({ found, unlocked: saved.unlocked === true });
    } catch {
      // corrupted or blocked storage — start the hunt fresh
    }
  },
}));
