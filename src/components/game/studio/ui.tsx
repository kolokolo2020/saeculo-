"use client";

import type { Category } from "./voices";

// Small shared pieces for the studio's panels.

export const CAT_COLORS: Record<Category, string> = {
  Kicks: "#e4b95a",
  "Snares & claps": "#d0694f",
  Hats: "#9ab8c9",
  Percussion: "#c9a36b",
  "808 & bass": "#8fb37a",
  Keys: "#b59be0",
  Synths: "#e08fb0",
  Found: "#7fc4b8",
  Chops: "#f0a35a",
  "Your samples": "#cfc6b3",
};

export const chip =
  "rounded-[3px] border border-[#3a3733] bg-[#1d1b19] px-2 py-1 text-[12.5px] text-[#e8e0cf] hover:border-[#6d6558] disabled:opacity-40 aria-pressed:border-amber aria-pressed:text-amber";

export function Slider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  format,
  className = "",
  hideLabel = false,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  className?: string;
  hideLabel?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className={`flex min-w-0 items-center gap-1.5 text-[11.5px] text-[#b9b09e] ${className}`}>
      <span className={hideLabel ? "sr-only" : "shrink-0"}>{label}</span>
      <input
        type="range"
        className="deck-range min-w-0 flex-1"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: `${pct}%` }}
        aria-valuetext={format ? format(value) : undefined}
      />
      {format && <span className="w-9 shrink-0 text-right font-mono text-[10.5px] tabular-nums">{format(value)}</span>}
    </label>
  );
}
