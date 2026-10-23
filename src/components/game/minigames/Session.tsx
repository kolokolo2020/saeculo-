"use client";

import { useEffect, useRef, useState } from "react";
import { Engine } from "../studio/engine";
import { clone, type Project } from "../studio/project";
import Frame, { miniBtn } from "./Frame";

// A session: your beat on the monitors, the artist in the booth. Eight
// takes: their level swings, and you punch in when it's in the green band
// (dead centre is a keeper). Then the mix: three faders and your ears (what
// it sounds like is written under them); bounce when it's right. What you
// get out of it, 0..100, is how good the song is.

const TAKES = 8;
/** The mix that sounds right for this session (each 0..1), picked once. */
const target = () => [0.55 + Math.random() * 0.3, 0.35 + Math.random() * 0.3, 0.15 + Math.random() * 0.35];
const FADERS = ["vocal", "beat", "reverb"];
const say = (i: number, d: number) => {
  if (Math.abs(d) < 0.08) return null;
  const hi = d > 0;
  return [hi ? "the vocal's shouting over everything" : "the vocal's buried", hi ? "the beat's swallowing the words" : "the beat's too thin under them", hi ? "it's all washed out, like a cave" : "it's dry, like a phone call"][i];
};

export default function Session({ artist, line, tape, volume, reduced, onFinish, onClose }: { artist: string; line: string; tape: Project | null; volume: number; reduced: boolean; onFinish: (q: number) => void; onClose: () => void }) {
  const [phase, setPhase] = useState<"ready" | "takes" | "mix" | "done">("ready");
  const [takes, setTakes] = useState<number[]>([]);
  const [needle, setNeedle] = useState(0.5);
  const [mix, setMix] = useState([0.5, 0.5, 0.5]);
  const [want] = useState(target);
  const [q, setQ] = useState(0);
  const [msg, setMsg] = useState(line);
  const t0 = useRef(0);
  const engine = useRef<Engine | null>(null);
  // the band moves a little every take, and the swing gets quicker
  const band = 0.5 + Math.sin(takes.length * 2.3) * 0.25;
  const speed = 0.9 + takes.length * 0.12;

  // the beat on the monitors, quietly, for as long as the session lasts
  useEffect(() => {
    if (!tape) return;
    const p = clone(tape);
    p.mode = "pattern";
    p.master = { ...p.master, vol: 0.35 * volume };
    const e = new Engine(p);
    engine.current = e;
    void e.start();
    return () => e.dispose();
  }, [tape, volume]);

  useEffect(() => {
    if (phase !== "takes") return;
    let raf = 0;
    t0.current = performance.now();
    const tick = (now: number) => {
      const x = ((now - t0.current) / 1000) * speed;
      setNeedle(reduced ? (x % 2 < 1 ? x % 1 : 1 - (x % 1)) : 0.5 - Math.cos(x * Math.PI) * 0.5);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, speed, reduced, takes.length]);

  const punch = () => {
    if (phase !== "takes") return;
    const d = Math.abs(needle - band);
    const score = d < 0.04 ? 100 : d < 0.1 ? 70 : d < 0.18 ? 35 : 0;
    const next = [...takes, score];
    setTakes(next);
    setMsg(score === 100 ? "Keeper. They point at you through the glass." : score >= 70 ? "Usable. “One more for safety?”" : score ? "Rough. You'll have to comp around it." : "Missed it. “Are you even listening?”");
    if (next.length >= TAKES) {
      setPhase("mix");
      setMsg("All the takes are in. Now the mix: make it sound right.");
    }
  };

  const bounce = () => {
    const takeScore = takes.reduce((a, b) => a + b, 0) / TAKES;
    const off = mix.reduce((n, v, i) => n + Math.abs(v - want[i]), 0) / 3;
    const mixScore = Math.max(0, 100 - off * 260);
    const final = Math.round(takeScore * 0.7 + mixScore * 0.3);
    setQ(final);
    setPhase("done");
    setMsg(final >= 85 ? `${artist} plays it back twice and just says “Yeah.”` : final >= 60 ? `${artist} nods along. “That'll do numbers.”` : final >= 35 ? `${artist} shrugs. “It's out, anyway.”` : `${artist} winces. “We'll fix it in the next one.”`);
    onFinish(final);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === "Space" || e.code === "KeyE" || e.code === "Enter") && !(e.target as HTMLElement).closest("button, input")) {
        e.preventDefault();
        punch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const notes = mix.map((v, i) => say(i, v - want[i])).filter(Boolean);
  return (
    <Frame title="The session" sub={`you and ${artist}`} onClose={onClose} testid="session">
      <div className="flex flex-col gap-3">
        <p aria-live="polite" data-testid="session-line">
          {msg}
        </p>
        {phase === "ready" && (
          <button className={miniBtn} onClick={() => setPhase("takes")} data-testid="session-start" data-autofocus>
            Hit record
          </button>
        )}
        {phase === "takes" && (
          <>
            <div className="relative h-8 w-full rounded-[2px] border border-[#3a3733] bg-[#0b0a09]" aria-hidden>
              <div className="absolute inset-y-0 bg-[#2f6b3a]/70" style={{ left: `${(band - 0.1) * 100}%`, width: "20%" }} />
              <div className="absolute inset-y-0 bg-[#7ddc3a]" style={{ left: `${(band - 0.04) * 100}%`, width: "8%" }} />
              <div className="absolute inset-y-0 w-1 bg-[#ffd23a]" style={{ left: `calc(${needle * 100}% - 2px)` }} />
            </div>
            <div className="flex items-center gap-2">
              <button className={miniBtn} onClick={punch} data-testid="session-punch">
                Punch in (Space)
              </button>
              <span className="text-[17px] text-[#8a8170]">
                take {takes.length + 1}/{TAKES}
              </span>
            </div>
          </>
        )}
        {(phase === "mix" || phase === "done") && (
          <div className="flex flex-col gap-2">
            {FADERS.map((f, i) => (
              <label key={f} className="flex items-center gap-3">
                <span className="w-16 text-[#b9b09e]">{f}</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={mix[i]}
                  disabled={phase === "done"}
                  onChange={(e) => setMix((m) => m.map((v, k) => (k === i ? Number(e.target.value) : v)))}
                  className="deck-range min-w-0 flex-1"
                  style={{ ["--fill" as string]: `${mix[i] * 100}%` }}
                  aria-label={`${f} level`}
                />
              </label>
            ))}
            <p className="text-[17px] leading-tight text-[#b9b09e]" data-testid="session-ears">
              {notes.length ? notes.join(" · ") : "It sits right. Everything where it should be."}
            </p>
            {phase === "mix" ? (
              <button className={miniBtn} onClick={bounce} data-testid="session-bounce">
                Bounce it
              </button>
            ) : (
              <p className="text-amber" data-testid="session-score">
                The song: {q}/100
              </p>
            )}
          </div>
        )}
        {takes.length > 0 && (
          <p className="text-[16px] text-[#8a8170]" aria-label="Takes">
            {takes.map((t) => (t === 100 ? "●" : t >= 70 ? "◐" : t ? "○" : "×")).join(" ")}
          </p>
        )}
      </div>
    </Frame>
  );
}
