"use client";

import { useEffect, useRef, useState } from "react";
import { SECRET_WORDS, VAULT_ITEMS, VAULT_LETTER } from "@/data/secrets";
import { useSecretStore } from "@/components/secrets/secretStore";
import { usePlayerStore } from "@/components/player/playerStore";
import Glyph from "@/components/ui/Glyph";

// vault.zip: locked behind the three hidden words until the password is
// right, then a folder of unreleased snippets and a note.
export default function VaultApp() {
  const unlocked = useSecretStore((s) => s.unlocked);
  return unlocked ? <VaultContents /> : <PasswordPrompt />;
}

function PasswordPrompt() {
  const found = useSecretStore((s) => s.found);
  const tryUnlock = useSecretStore((s) => s.tryUnlock);
  const [password, setPassword] = useState("");
  const [wrong, setWrong] = useState(0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tryUnlock(password)) {
      setWrong((n) => n + 1);
      setPassword("");
    }
  };

  return (
    <form onSubmit={submit} className="flex h-full flex-col text-ink">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="flex items-start gap-3">
          <LockIcon />
          <div>
            <h3 className="text-[15px] text-[#1e3287]">Password needed</h3>
            <p className="mt-0.5 text-[12px] text-mute">
              The file &quot;vault.zip&quot; is password protected. Please enter the password below.
            </p>
          </div>
        </div>

        <label className="mt-4 block text-[12px]">
          Password:
          <input
            key={wrong}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
            autoFocus
            aria-label="Vault password"
            className={`aero-input mt-1 block w-full px-2 py-1 text-[13px] ${wrong ? "animate-[vault-shake_0.35s]" : ""}`}
          />
        </label>
        <p className="mt-1 h-4 text-[11.5px] text-[#c42b1c]" aria-live="polite">
          {wrong > 0 && "The password is incorrect. Try again."}
        </p>

        <fieldset className="mt-2 rounded-[4px] border border-[#d4dbe4] bg-[#f7f9fc] px-3 py-2">
          <legend className="px-1 text-[11.5px] text-mute">Hint</legend>
          <p className="text-[12px]">Three words are hidden on this desktop. Put them together.</p>
          <ol className="mt-2 flex flex-wrap gap-2" aria-label="Hidden words">
            {SECRET_WORDS.map((s, i) => {
              const got = found.includes(s.id);
              return (
                <li
                  key={s.id}
                  className={`min-w-[5.5rem] rounded-[3px] border px-2 py-1 text-center font-mono text-[12px] ${
                    got ? "border-[#7fb4ea] bg-[#e6f1fd] text-[#1e3287]" : "border-dashed border-[#a9b5c4] text-[#8a96a6]"
                  }`}
                >
                  {got ? s.word : `word ${i + 1}`}
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-[11px] text-mute">
            {found.length}/{SECRET_WORDS.length} found
            {found.length === 0 && " · start by reading very carefully"}
          </p>
        </fieldset>
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-[#d4dbe4] bg-[#f1f5fa] px-4 py-2.5">
        <button type="submit" className="aero-btn aero-btn-primary w-24 py-1 text-[12px]">
          Extract
        </button>
      </div>
    </form>
  );
}

function VaultContents() {
  const [playing, setPlaying] = useState<number | null>(null);
  const [tab, setTab] = useState<"files" | "letter">("files");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    [],
  );

  const toggle = (i: number) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => setPlaying(null);
    }
    const audio = audioRef.current;
    if (playing === i) {
      audio.pause();
      setPlaying(null);
      return;
    }
    // one soundtrack at a time: the media player steps aside
    usePlayerStore.getState().pause();
    audio.src = VAULT_ITEMS[i].src;
    void audio.play().catch(() => setPlaying(null));
    setPlaying(i);
  };

  return (
    <div className="flex h-full flex-col text-ink">
      <div className="aero-toolbar flex h-9 shrink-0 items-center gap-1 px-2" role="tablist">
        {(
          [
            ["files", "Unreleased"],
            ["letter", "letter.txt"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-[3px] px-3 py-1 text-[12px] ${tab === id ? "aero-row-selected" : "hover:bg-[#eef5fd]"}`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-mute">C:\saeculo\vault</span>
      </div>

      {tab === "files" ? (
        <ul className="min-h-0 flex-1 overflow-y-auto p-1.5" aria-label="Unreleased snippets">
          {VAULT_ITEMS.map((item, i) => (
            <li key={item.title} className="flex items-center gap-3 rounded-[3px] px-2 py-2 hover:bg-[#eef5fd]">
              <button
                onClick={() => toggle(i)}
                aria-label={`${playing === i ? "Pause" : "Play"} ${item.title}`}
                className="aero-orb grid h-8 w-8 shrink-0 place-items-center text-white"
              >
                <Glyph name={playing === i ? "pause" : "play"} size={12} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px]">{item.title}</p>
                <p className="truncate text-[11.5px] text-mute">{item.note}</p>
              </div>
              <span className="shrink-0 text-[11px] text-mute">{item.date}</span>
            </li>
          ))}
        </ul>
      ) : (
        <article className="min-h-0 flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed text-[#111]">
          {VAULT_LETTER.map((p, i) => (
            <p key={i} className={i ? "mt-3" : ""}>
              {p}
            </p>
          ))}
        </article>
      )}

      <div className="shrink-0 border-t border-[#d4dbe4] bg-[#f1f5fa] px-3 py-1 text-[11px] text-mute">
        You got in. {VAULT_ITEMS.length} unreleased snippets, heard here first.
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 48 48" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id="vault-lock-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="1" stopColor="#c98a12" />
        </linearGradient>
      </defs>
      <path d="M15 22v-6a9 9 0 0 1 18 0v6" fill="none" stroke="#7d8a9c" strokeWidth="4" />
      <rect x="9" y="21" width="30" height="22" rx="4" fill="url(#vault-lock-body)" stroke="#8a5a06" />
      <circle cx="24" cy="30" r="3" fill="#6b4504" />
      <rect x="22.8" y="31" width="2.4" height="6" rx="1" fill="#6b4504" />
    </svg>
  );
}
