"use client";

import { useEffect, useRef } from "react";
import { PROFILE } from "@/data/profile";
import { SECRET_WORDS } from "@/data/secrets";
import { useSecretStore } from "@/components/secrets/secretStore";

const MENU = ["File", "Edit", "Format", "View", "Help"];
const HIDDEN_LINE = `word one is "${SECRET_WORDS.find((s) => s.id === "about")!.word}"`;

// about.txt, open in Notepad. The bio is real selectable text (not a
// textarea) so the links at the bottom stay clickable. One line is written
// white-on-white: it only shows up when the text is selected.
export default function AboutApp() {
  const articleRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onSelection = () => {
      const selected = document.getSelection()?.toString() ?? "";
      if (selected.includes(HIDDEN_LINE)) useSecretStore.getState().find("about");
    };
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, []);

  // Edit → Select All, like the real Notepad
  const selectAll = () => {
    const el = articleRef.current;
    const sel = document.getSelection();
    if (!el || !sel) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 gap-3 border-b border-[#d4dbe4] bg-[#f5f7fa] px-2 py-0.5 text-[12px] text-ink">
        {MENU.map((m) =>
          m === "Edit" ? (
            <button key={m} onClick={selectAll} title="Select All" className="hover:underline">
              {m}
            </button>
          ) : (
            <span key={m} aria-hidden>
              {m}
            </span>
          ),
        )}
      </div>
      <article
        ref={articleRef}
        className="min-h-0 flex-1 overflow-y-auto bg-white p-3 font-mono text-[13.5px] leading-relaxed text-[#111]"
      >
        <p className="font-semibold">
          {PROFILE.artistName} — {PROFILE.tagline}
        </p>
        <p className="text-[#777]">{"=".repeat(28)}</p>
        {PROFILE.bio.map((paragraph, i) => (
          <p key={i} className="mt-3">
            {paragraph}
          </p>
        ))}
        <p className="mt-5 text-[#777]">-- links --</p>
        <ul>
          {PROFILE.socials.map((social) => (
            <li key={social.label}>
              <a
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0645ad] underline hover:text-[#0b2a5b]"
              >
                {social.label}
              </a>{" "}
              <span className="text-[#777]">{social.handle}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[#777]">p.s. not everything on this desktop is visible.</p>
        <p className="mt-6 text-white selection:bg-[#316ac5] selection:text-white">{HIDDEN_LINE}</p>
      </article>
    </div>
  );
}
