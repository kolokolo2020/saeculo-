"use client";

import { useState, useSyncExternalStore } from "react";

interface Entry {
  name: string;
  message: string;
  date: string;
}

const STORAGE_KEY = "saeculo-guestbook";
const CHANGE_EVENT = "saeculo-guestbook-change";
const EMPTY: Entry[] = [];

let cache: Entry[] | null = null;

function readEntries(): Entry[] {
  if (cache === null) {
    try {
      cache = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Entry[];
    } catch {
      cache = [];
    }
  }
  return cache;
}

function writeEntries(entries: Entry[]) {
  cache = entries;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 50)));
  } catch {
    // storage full/unavailable — cache still serves this session
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

export default function GuestbookApp() {
  const entries = useSyncExternalStore(subscribe, readEntries, () => EMPTY);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const sign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    const entry: Entry = {
      name: name.trim().slice(0, 40),
      message: message.trim().slice(0, 280),
      date: new Date().toISOString().slice(0, 10),
    };
    writeEntries([entry, ...entries]);
    setName("");
    setMessage("");
  };

  return (
    <div className="font-body flex h-full flex-col p-4 text-lg text-black">
      <h3 className="font-pixel mb-3 text-xs text-[#000080]">sign the guestbook</h3>
      <form onSubmit={sign} className="mb-4 space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="your name"
          aria-label="Your name"
          className="bevel-in w-full bg-white px-2 py-1 text-base focus:outline-none"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="leave a message..."
          aria-label="Your message"
          rows={2}
          className="bevel-in w-full resize-none bg-white px-2 py-1 text-base focus:outline-none"
        />
        <button
          type="submit"
          className="bevel-out bg-chrome font-pixel px-4 py-1.5 text-[10px] text-black hover:bg-[#d8d4cc] active:translate-y-px"
        >
          sign ✎
        </button>
      </form>
      <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto border-t border-dashed border-[#808080] pt-3">
        <li className="text-base">
          <span className="font-bold text-[#000080]">webmaster</span>
          <span className="ml-2 text-sm text-[#555]">1997-04-01</span>
          <p>welcome to my corner of the internet. sign the book!</p>
        </li>
        {entries.map((entry, i) => (
          <li key={i} className="text-base">
            <span className="font-bold text-[#000080]">{entry.name}</span>
            <span className="ml-2 text-sm text-[#555]">{entry.date}</span>
            <p>{entry.message}</p>
          </li>
        ))}
      </ul>
      <p className="pt-2 text-sm text-[#555]">entries are stored in your browser only.</p>
    </div>
  );
}
