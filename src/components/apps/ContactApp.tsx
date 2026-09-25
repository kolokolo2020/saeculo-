"use client";

import { useState } from "react";
import { PROFILE } from "@/data/profile";
import Glyph from "@/components/ui/Glyph";

const TOPICS = ["Booking inquiry", "Collab", "Beat licensing", "Just saying hi"];

// A compose-mail window. "Send" hands a pre-filled message to the
// visitor's own mail app via mailto: — no backend, nothing stored here.
export default function ContactApp() {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = name.trim() ? `${topic} — ${name.trim()}` : topic;
    const body = `${message.trim()}${name.trim() ? `\n\n— ${name.trim()}` : ""}`;
    window.location.href = `mailto:${PROFILE.bookingEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.bookingEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard blocked — the address is visible and selectable anyway
    }
  };

  return (
    <form onSubmit={send} className="flex h-full flex-col text-ink">
      <div className="aero-toolbar flex h-9 shrink-0 items-center gap-2 px-2">
        <button type="submit" className="aero-btn flex items-center gap-1.5 px-3 py-1 text-[12px]">
          <Glyph name="arrow" size={12} className="text-[#1f6fd1]" />
          Send
        </button>
        <button type="button" onClick={copy} className="aero-btn px-3 py-1 text-[12px]">
          {copied ? "Copied!" : "Copy address"}
        </button>
        <span className="ml-auto text-[11px] text-mute">Usually replies within a day or two</span>
      </div>

      <div className="grid shrink-0 grid-cols-[4.5rem_1fr] items-center gap-x-2 gap-y-1.5 border-b border-[#d4dbe4] bg-[#f7f9fc] px-3 py-2.5 text-[12.5px]">
        <span className="text-right text-mute">To:</span>
        <span className="aero-input bg-[#f3f3f3] px-2 py-1 select-all">{PROFILE.bookingEmail}</span>

        <label htmlFor="mail-topic" className="text-right text-mute">
          Subject:
        </label>
        <select id="mail-topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="aero-input px-1.5 py-1">
          {TOPICS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>

        <label htmlFor="mail-name" className="text-right text-mute">
          From:
        </label>
        <input
          id="mail-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name or artist name"
          className="aero-input px-2 py-1"
        />
      </div>

      <label htmlFor="mail-body" className="sr-only">
        Message
      </label>
      <textarea
        id="mail-body"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Tell me about the project, the vibe, the deadline…"
        className="min-h-0 flex-1 resize-none p-3 text-[13.5px] outline-none"
      />
    </form>
  );
}
