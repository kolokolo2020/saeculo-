"use client";

import { FOOTAGE_FOOTER, FOOTAGE_HEADER, FOOTAGE_LOG } from "@/data/lore";

const MENU = ["File", "Edit", "Format", "View", "Help"];

/** Blacked-out runs (██) read as "redacted" to screen readers. */
function Redacted({ text }: { text: string }) {
  return (
    <>
      {text.split(/(█+)/).map((part, i) =>
        part.startsWith("█") ? (
          <span key={i} className="bg-[#111] text-[#111] select-none" aria-label="redacted" role="img">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

// found_footage.txt: the lore, as a log typed up in Notepad.
export default function FootageApp() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 gap-3 border-b border-[#d4dbe4] bg-[#f5f7fa] px-2 py-0.5 text-[12px] text-ink" aria-hidden>
        {MENU.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <article tabIndex={0} aria-label="found_footage.txt" className="min-h-0 flex-1 overflow-y-auto bg-white p-3 text-[13.5px] leading-relaxed text-[#1a1712] [font-family:var(--font-type)]">
        {FOOTAGE_HEADER.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <p className="text-[#777]">{"-".repeat(34)}</p>
        <dl>
          {FOOTAGE_LOG.map((entry) => (
            <div key={entry.time} className="mt-2.5 flex gap-3">
              <dt className="shrink-0 text-[#8e1b1b]">{entry.time}</dt>
              <dd>
                <Redacted text={entry.text} />
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-[#777]">{FOOTAGE_FOOTER}</p>
      </article>
    </div>
  );
}
