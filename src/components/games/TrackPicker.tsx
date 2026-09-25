"use client";

import { TRACKS } from "@/data/tracks";

export default function TrackPicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number;
  onChange: (index: number) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-[12px] text-[#b7c7dc]">
      Beat
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="aero-input px-2 py-1 text-[12px]"
      >
        {TRACKS.map((t, i) => (
          <option key={t.id} value={i}>
            {t.title} — {t.bpm} bpm
          </option>
        ))}
      </select>
    </label>
  );
}
