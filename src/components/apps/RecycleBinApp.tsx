"use client";

import { useRef, useState } from "react";
import { playBlip, playSnare } from "@/lib/synth";
import { useWindowStore } from "@/components/window-manager/windowStore";
import { getAudioContext } from "@/lib/audioContext";

interface Scrap {
  name: string;
  from: string;
  deleted: string;
  size: string;
  // a little melody sketch, as scale degrees, played on double-click
  sketch: number[];
}

const SCRAPS: Scrap[] = [
  { name: "beat_v1_FINAL_final2.wav", from: "C:\\Beats\\2019", deleted: "3/14/2021", size: "41.2 MB", sketch: [0, 4, 7, 4, 0] },
  { name: "sounded better at 3am.wav", from: "C:\\Beats\\Late", deleted: "11/02/2022", size: "18.9 MB", sketch: [9, 7, 5, 4, 2, 0] },
  { name: "sample i couldnt clear.wav", from: "C:\\Samples", deleted: "6/30/2023", size: "7.4 MB", sketch: [0, 0, 7, 7, 9, 9, 7] },
  { name: "trap_beat_347.wav", from: "C:\\Beats\\Trap", deleted: "1/09/2024", size: "22.0 MB", sketch: [0, 3, 0, 3, 5, 3] },
];

const SCALE = [0, 2, 4, 5, 7, 9, 11];
const noteFreq = (degree: number) =>
  523.25 * Math.pow(2, (SCALE[degree % 7] + 12 * Math.floor(degree / 7)) / 12);

const VAULT = { name: "vault.zip", from: "C:\\saeculo", deleted: "??/??/????", size: "128 MB" };

// An easter egg: the beats that didn't make it. Double-click one to hear
// the idea, or empty the bin for good. vault.zip can't be deleted: it's the
// door to the secret hunt.
export default function RecycleBinApp() {
  const [items, setItems] = useState(SCRAPS);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const openWindow = useWindowStore((s) => s.openWindow);

  const ctx = () => {
    ctxRef.current = getAudioContext();
    return ctxRef.current;
  };

  const playSketch = (scrap: Scrap) => {
    const c = ctx();
    scrap.sketch.forEach((deg, i) => playBlip(c, c.destination, c.currentTime + i * 0.16, noteFreq(deg), 0.14));
  };

  const empty = () => {
    const c = ctx();
    // a paper-crumple made of three quick noise bursts
    [0, 0.07, 0.15].forEach((t) => playSnare(c, c.destination, c.currentTime + t, 0.22));
    setItems([]);
    setSelected(null);
    setConfirming(false);
    setNote("vault.zip could not be deleted: the file is in use.");
  };

  return (
    <div className="relative flex h-full flex-col text-ink">
      <div className="aero-toolbar flex h-9 shrink-0 items-center gap-2 px-2">
        <button
          onClick={() => setConfirming(true)}
          className="aero-btn px-3 py-1 text-[12px]"
        >
          Empty Recycle Bin
        </button>
        <button
          onClick={() => setNote("Some beats are better left in the bin.")}
          disabled={!items.length}
          className="aero-btn px-3 py-1 text-[12px]"
        >
          Restore all items
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-left text-[12px]">
          <thead className="sticky top-0 bg-gradient-to-b from-white to-[#eef2f7] text-mute">
            <tr>
              <th className="border-r border-b border-[#d4dbe4] px-2 py-1 font-normal">Name</th>
              <th className="border-r border-b border-[#d4dbe4] px-2 py-1 font-normal max-sm:hidden">Original Location</th>
              <th className="border-r border-b border-[#d4dbe4] px-2 py-1 font-normal">Date Deleted</th>
              <th className="border-b border-[#d4dbe4] px-2 py-1 text-right font-normal">Size</th>
            </tr>
          </thead>
          <tbody>
            <tr
              tabIndex={0}
              onClick={() => setSelected(VAULT.name)}
              onDoubleClick={() => openWindow("vault")}
              onKeyDown={(e) => e.key === "Enter" && openWindow("vault")}
              className={`cursor-default ${selected === VAULT.name ? "aero-row-selected" : "hover:bg-[#eef5fd]"}`}
            >
              <td className="px-2 py-1">
                {VAULT.name} <span className="text-[10.5px] text-[#a0782c]">(password protected)</span>
              </td>
              <td className="px-2 py-1 text-mute max-sm:hidden">{VAULT.from}</td>
              <td className="px-2 py-1 text-mute">{VAULT.deleted}</td>
              <td className="px-2 py-1 text-right text-mute">{VAULT.size}</td>
            </tr>
            {items.map((scrap) => (
              <tr
                key={scrap.name}
                tabIndex={0}
                onClick={() => setSelected(scrap.name)}
                onDoubleClick={() => playSketch(scrap)}
                onKeyDown={(e) => e.key === "Enter" && playSketch(scrap)}
                className={`cursor-default ${selected === scrap.name ? "aero-row-selected" : "hover:bg-[#eef5fd]"}`}
              >
                <td className="px-2 py-1">{scrap.name}</td>
                <td className="px-2 py-1 text-mute max-sm:hidden">{scrap.from}</td>
                <td className="px-2 py-1 text-mute">{scrap.deleted}</td>
                <td className="px-2 py-1 text-right text-mute">{scrap.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="shrink-0 border-t border-[#d4dbe4] bg-[#f1f5fa] px-3 py-1 text-[11px] text-mute">
        {note ?? `${items.length + 1} items · double-click one to hear what could have been`}
      </div>

      {confirming && (
        <div className="absolute inset-0 grid place-items-center bg-black/20" role="dialog" aria-label="Delete multiple items">
          <div className="w-[300px] rounded-[6px] border border-[#6a7f99] bg-white p-4 shadow-2xl">
            <p className="text-[13px]">
              Are you sure you want to permanently delete these {items.length + 1} items?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={empty} className="aero-btn aero-btn-primary px-5 py-1 text-[12px]">
                Yes
              </button>
              <button onClick={() => setConfirming(false)} className="aero-btn px-5 py-1 text-[12px]">
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
