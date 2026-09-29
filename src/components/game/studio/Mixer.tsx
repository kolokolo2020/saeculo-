"use client";

import type { Channel, Master, Project } from "./project";
import { voiceById } from "./voices";
import { CAT_COLORS, Slider } from "./ui";

// Levels and colour: per channel volume, pan, tuning, a low-pass, and how
// much goes to the reverb and the delay; then the master bus.

const pct = (v: number) => `${Math.round(v * 100)}`;

export default function Mixer({
  project,
  onChannel,
  onMaster,
}: {
  project: Project;
  onChannel: (id: string, partial: Partial<Channel>) => void;
  onMaster: (partial: Partial<Master>) => void;
}) {
  const m = project.master;
  return (
    <div className="flex flex-col gap-3" data-testid="studio-mixer">
      <div className="grid gap-x-4 gap-y-1.5 rounded-[3px] border border-[#3a3733] bg-[#1b1a18] p-2.5 sm:grid-cols-3 lg:grid-cols-5">
        <p className="col-span-full font-lcd text-[18px] leading-none text-amber">master</p>
        <Slider label="volume" value={m.vol} onChange={(vol) => onMaster({ vol })} format={pct} />
        <Slider label="filter" value={m.cutoff} onChange={(cutoff) => onMaster({ cutoff })} format={pct} />
        <Slider label="tape drive" value={m.drive} onChange={(drive) => onMaster({ drive })} format={pct} />
        <Slider label="reverb" value={m.reverb} onChange={(reverb) => onMaster({ reverb })} format={pct} />
        <Slider label="delay" value={m.delay} onChange={(delay) => onMaster({ delay })} format={pct} />
      </div>
      {project.channels.map((c) => {
        const v = voiceById(c.voice);
        return (
          <div key={c.id} className="grid items-center gap-x-4 gap-y-1 border-b border-[#24221f] pb-2 sm:grid-cols-[130px_repeat(3,minmax(0,1fr))] lg:grid-cols-[140px_repeat(6,minmax(0,1fr))]">
            <p className="truncate text-[13px]" style={{ color: v ? CAT_COLORS[v.cat] : undefined }}>
              {v?.name}
            </p>
            <Slider label="vol" value={c.vol} onChange={(vol) => onChannel(c.id, { vol })} format={pct} />
            <Slider label="pan" value={c.pan} min={-1} max={1} step={0.05} onChange={(pan) => onChannel(c.id, { pan })} format={(p) => (Math.abs(p) < 0.03 ? "C" : p < 0 ? `L${Math.round(-p * 100)}` : `R${Math.round(p * 100)}`)} />
            <Slider label="tune" value={c.pitch} min={-12} max={12} step={1} onChange={(pitch) => onChannel(c.id, { pitch })} format={(p) => (p > 0 ? `+${p}` : String(p))} />
            <Slider label="tone" value={c.cutoff} onChange={(cutoff) => onChannel(c.id, { cutoff })} format={pct} />
            <Slider label="verb" value={c.rev} onChange={(rev) => onChannel(c.id, { rev })} format={pct} />
            <Slider label="delay" value={c.dly} onChange={(dly) => onChannel(c.id, { dly })} format={pct} />
          </div>
        );
      })}
    </div>
  );
}
