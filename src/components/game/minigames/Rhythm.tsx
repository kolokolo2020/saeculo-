"use client";

import { useEffect, useRef, useState } from "react";
import { Engine } from "../studio/engine";
import { PRESETS } from "../studio/presets";
import { clone, type Project } from "../studio/project";
import { voiceById } from "../studio/voices";
import Frame, { miniBtn } from "./Frame";

// Playing the beat live. Under the bridge (the cypher) or in the booth at
// the club (a set): one loop of the whole beat to get the feel, then the
// kick, the snare and the keys (or the 808) drop out and it's on you: hit
// each one as it reaches the line and it plays; miss and there's a hole.
// The hats keep time either way. Keys: D F J K (or the arrows); on a
// phone, the four pads. A beat battle is the hard one: the rival's beat
// (a different one each time), the hats on you too, and less room either
// side.

export type RhythmMode = "cypher" | "dj" | "battle";

interface Hit {
  t: number;
  /** Which step of the pattern it's on. */
  step: number;
  lane: number;
  channel: string;
  voice: string;
  midi: number;
  len: number;
  /** 0 waiting, 1 perfect, 2 good, 3 missed */
  state: 0 | 1 | 2 | 3;
}

/**
 * The beats a battle can be on, in the order the rival picks them: the
 * studio's starters that have all four parts (a kick, a snare or clap,
 * hats, an 808 or bass). `hats`: every how many steps the hats are yours
 * (the ones in between keep playing; the trap's run every eighth, so you
 * take the quarters). `ease`: how much kinder it plays than the drill
 * (slower, fewer hits), so the rival scores that much more on it.
 */
export const BATTLE_BEATS: { preset: string; hats: number; ease: number }[] = [
  { preset: "drill", hats: 2, ease: 0 },
  { preset: "trap", hats: 4, ease: 0 },
  { preset: "boombap", hats: 2, ease: 3 },
  { preset: "lofi", hats: 2, ease: 6 },
];

const LANES = [
  { name: "kick", key: "D", color: "#4fe3ff" },
  { name: "snare", key: "F", color: "#a98bff" },
  { name: "hats", key: "J", color: "#ffd23a" },
  { name: "keys", key: "K", color: "#7ddc3a" },
];
const KEYS: Record<string, number> = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 };
/** How long a bar takes to fall, and how close counts, per mode (and the beat, unless the rival picks one). */
const FEEL: Record<RhythmMode, { fall: number; perfect: number; late: number; gap: number; loops: number; preset: string; hats: number }> = {
  cypher: { fall: 1.5, perfect: 0.06, late: 0.17, gap: 0.2, loops: 4, preset: "boombap", hats: 4 },
  dj: { fall: 1.5, perfect: 0.06, late: 0.17, gap: 0.17, loops: 5, preset: "trap", hats: 4 },
  battle: { fall: 1.2, perfect: 0.045, late: 0.13, gap: 0.13, loops: 4, preset: "drill", hats: 2 },
};

/** The beat a game is played on: the mode's own, or the one the rival picked. */
function beatFor(mode: RhythmMode, pick?: string) {
  const b = (mode === "battle" && BATTLE_BEATS.find((x) => x.preset === pick)) || { preset: FEEL[mode].preset, hats: FEEL[mode].hats };
  const preset = PRESETS.find((p) => p.id === b.preset) ?? PRESETS[0];
  return { preset, hats: b.hats, name: preset.name.split(" · ")[0] };
}

/** The channel each lane plays: kick, snare (or clap), hats, and the keys under the bridge or the 808 (or bass) anywhere else. */
function lanesOf(p: Project, mode: RhythmMode) {
  const byCat = (cats: string[], melodic = false) => p.channels.find((c) => cats.includes(voiceById(c.voice)?.cat ?? "") && (!melodic || voiceById(c.voice)?.kind === "melodic"));
  return [byCat(["Kicks"]), byCat(["Snares & claps"]), byCat(["Hats"]), mode !== "cypher" ? byCat(["808 & bass"], true) : (byCat(["Keys"], true) ?? byCat(["Synths"], true))];
}

/** What a lane's called, from what's in it. */
function laneLabel(lane: number, voice: string | undefined, mode: RhythmMode) {
  if (lane === 1 && voice?.startsWith("clap")) return "clap";
  if (lane === 2 && voice === "shaker") return "shaker";
  if (lane === 3 && mode !== "cypher") return voice && !voice.startsWith("808") ? "bass" : "808";
  return LANES[lane].name;
}

export function chart(p: Project, start: number, loops: number, mode: RhythmMode, hats = FEEL[mode].hats): { hits: Hit[]; lanes: (string | null)[]; end: number } {
  const lanes = lanesOf(p, mode);
  const step = 60 / p.tempo / 4;
  const pat = p.patterns[0];
  const hits: Hit[] = [];
  const last = [-9, -9, -9, -9];
  for (let L = 1; L <= loops; L++)
    for (let s = 0; s < p.length; s++) {
      const t = start + (L * p.length + s) * step + (s % 2 ? p.swing * step : 0);
      lanes.forEach((ch, lane) => {
        if (!ch) return;
        let midi = 60;
        let len = 1;
        if (lane === 3) {
          const n = pat.notes[ch.id]?.find((x) => x.step === s);
          if (!n) return;
          midi = n.midi;
          len = n.len;
        } else {
          if (!(pat.steps[ch.id]?.[s] > 0)) return;
          if (lane === 2 && s % hats !== 0) return;
        }
        // keep it playable: no two in a lane closer than this
        if (t - last[lane] < FEEL[mode].gap) return;
        last[lane] = t;
        hits.push({ t, step: s, lane, channel: ch.id, voice: ch.voice, midi, len, state: 0 });
      });
    }
  return { hits, lanes: lanes.map((c) => c?.id ?? null), end: start + (loops + 1) * p.length * step };
}

/** For the browser tests: what a battle on each of the rival's beats asks of you. */
export function battleCharts() {
  return BATTLE_BEATS.map((b) => {
    const { preset, name } = beatFor("battle", b.preset);
    const p = preset.make();
    const c = chart(p, 0, FEEL.battle.loops, "battle", b.hats);
    const voices = c.lanes.map((id) => p.channels.find((ch) => ch.id === id)?.voice);
    const secs = FEEL.battle.loops * p.length * (60 / p.tempo / 4);
    return { id: b.preset, name, tempo: p.tempo, lanes: voices.map((v, i) => laneLabel(i, v, "battle")), voices, hits: [0, 1, 2, 3].map((l) => c.hits.filter((h) => h.lane === l).length), perSecond: Math.round((c.hits.length / secs) * 100) / 100 };
  });
}

export default function Rhythm({ mode, volume, touch, onFinish, onClose, rival }: { mode: RhythmMode; volume: number; touch: boolean; onFinish: (score: number) => void; onClose: () => void; rival?: { name: string; score: number; beat?: string } }) {
  const { fall: FALL, perfect: PERFECT, late: LATE } = FEEL[mode];
  const beat = beatFor(mode, rival?.beat);
  // the lanes are named for what's in them on this beat (a clap, a shaker, a bass)
  const [laneVoices] = useState(() => {
    const p = beat.preset.make();
    return lanesOf(p, mode).map((c) => c?.voice);
  });
  const laneName = (i: number) => laneLabel(i, laneVoices[i], mode);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"ready" | "play" | "done">("ready");
  const [result, setResult] = useState({ score: 0, perfect: 0, good: 0, missed: 0, combo: 0 });
  const [down, setDown] = useState<number | null>(null);
  const run = useRef<{ engine: Engine; hits: Hit[]; lanes: (string | null)[]; end: number; muted: boolean; start: number; loopLen: number; combo: number; best: number; hype: number; flash: { lane: number; text: string; at: number }[] } | null>(null);

  const begin = () => {
    run.current?.engine.dispose();
    run.current = null;
    const base = clone(beat.preset.make());
    base.mode = "pattern";
    base.master = { ...base.master, vol: base.master.vol * Math.max(0.15, volume) };
    const engine = new Engine(base);
    void engine.start().then(() => {
      const c = chart(base, engine.startTime, FEEL[mode].loops, mode, beat.hats);
      run.current = { engine, ...c, muted: false, start: engine.startTime, loopLen: base.length * (60 / base.tempo / 4), combo: 0, best: 0, hype: 0.5, flash: [] };
      setPhase("play");
    });
  };

  // tidy up whichever way we leave
  useEffect(() => () => run.current?.engine.dispose(), []);

  const press = (lane: number) => {
    const r = run.current;
    if (!r || phase !== "play") return;
    const now = r.engine.now();
    const cand = r.hits.find((h) => h.lane === lane && h.state === 0 && Math.abs(h.t - now) < LATE);
    const ch = r.lanes[lane];
    if (!cand) {
      // a hit in a gap still sounds (it's your beat), it just breaks the run
      if (ch && lane !== 2) {
        const v = r.engine.project.channels.find((c) => c.id === ch)!;
        const stop = r.engine.noteOn(v.voice, 60, ch, 0.5);
        setTimeout(stop, 120);
      }
      r.combo = 0;
      r.hype = Math.max(0, r.hype - 0.03);
      r.flash.push({ lane, text: "off", at: now });
      return;
    }
    const d = Math.abs(cand.t - now);
    cand.state = d <= PERFECT ? 1 : 2;
    if (lane !== 2 || mode === "battle") {
      const stop = r.engine.noteOn(cand.voice, cand.midi, cand.channel, cand.state === 1 ? 1 : 0.75);
      setTimeout(stop, Math.max(100, cand.len * (60 / r.engine.project.tempo / 4) * 1000));
    }
    r.combo++;
    r.best = Math.max(r.best, r.combo);
    r.hype = Math.min(1, r.hype + (cand.state === 1 ? 0.04 : 0.02));
    r.flash.push({ lane, text: cand.state === 1 ? "perfect" : "good", at: now });
  };

  // keys
  useEffect(() => {
    if (phase !== "play") return;
    const onDown = (e: KeyboardEvent) => {
      const lane = KEYS[e.code];
      if (lane === undefined || e.repeat) return;
      e.preventDefault();
      e.stopPropagation();
      setDown(lane);
      press(lane);
    };
    const onUp = (e: KeyboardEvent) => KEYS[e.code] !== undefined && setDown(null);
    window.addEventListener("keydown", onDown, true);
    window.addEventListener("keyup", onUp, true);
    return () => {
      window.removeEventListener("keydown", onDown, true);
      window.removeEventListener("keyup", onUp, true);
    };
  });

  // the picture, and the clock
  useEffect(() => {
    if (phase !== "play") return;
    const c = canvas.current;
    const g = c?.getContext("2d");
    const r = run.current;
    if (!c || !g || !r) return;
    let raf = 0;
    const W = c.width;
    const H = c.height;
    const lw = W / 4;
    const lineY = H - 34;
    const frame = () => {
      const now = r.engine.now();
      // the first loop is the whole beat; then your parts drop out
      if (!r.muted && now > r.start + r.loopLen - 0.2) {
        r.muted = true;
        const p = clone(r.engine.project);
        p.channels.forEach((ch) => {
          if ([r.lanes[0], r.lanes[1], r.lanes[3]].includes(ch.id)) ch.mute = true;
        });
        // in a battle the hats are yours too: the ones on your steps drop out, the rest keep playing
        const hat = r.lanes[2];
        const pat = p.patterns[0];
        if (mode === "battle" && hat && pat.steps[hat]) {
          const mine = new Set(r.hits.filter((h) => h.lane === 2).map((h) => h.step));
          pat.steps[hat] = pat.steps[hat].map((v, s) => (mine.has(s) ? 0 : v));
        }
        r.engine.setProject(p);
      }
      for (const h of r.hits)
        if (h.state === 0 && now - h.t > LATE) {
          h.state = 3;
          r.combo = 0;
          r.hype = Math.max(0, r.hype - 0.05);
          r.flash.push({ lane: h.lane, text: "miss", at: now });
        }
      g.clearRect(0, 0, W, H);
      g.fillStyle = "#07080d";
      g.fillRect(0, 0, W, H);
      LANES.forEach((l, i) => {
        g.fillStyle = i % 2 ? "#0c0e16" : "#0a0c13";
        g.fillRect(i * lw, 0, lw, H);
        g.fillStyle = l.color + "33";
        g.fillRect(i * lw + 4, lineY - 2, lw - 8, 4);
      });
      g.fillStyle = "rgba(255,255,255,0.5)";
      g.fillRect(0, lineY, W, 1);
      for (const h of r.hits) {
        if (h.state === 1 || h.state === 2) continue;
        const y = lineY - ((h.t - now) / FALL) * lineY;
        if (y < -10 || y > H + 10) continue;
        const col = LANES[h.lane].color;
        g.globalAlpha = h.state === 3 ? 0.25 : 1;
        g.fillStyle = col;
        g.fillRect(h.lane * lw + 8, y - 5, lw - 16, 10);
        g.fillStyle = "rgba(255,255,255,0.55)";
        g.fillRect(h.lane * lw + 10, y - 4, lw - 20, 2);
        g.globalAlpha = 1;
      }
      // the words, briefly
      r.flash = r.flash.filter((f) => now - f.at < 0.45);
      g.font = "16px monospace";
      g.textAlign = "center";
      for (const f of r.flash) {
        g.globalAlpha = 1 - (now - f.at) / 0.45;
        g.fillStyle = f.text === "perfect" ? "#ffffff" : f.text === "good" ? LANES[f.lane].color : "#ff7a6a";
        g.fillText(f.text, f.lane * lw + lw / 2, lineY - 18 - (now - f.at) * 40);
      }
      g.globalAlpha = 1;
      // the crowd
      g.fillStyle = "#1d1b19";
      g.fillRect(8, 8, W - 16, 6);
      g.fillStyle = r.hype > 0.66 ? "#7ddc3a" : r.hype > 0.33 ? "#ffd23a" : "#ff7a6a";
      g.fillRect(8, 8, (W - 16) * r.hype, 6);
      g.fillStyle = "#e8e0cf";
      g.textAlign = "left";
      g.fillText(r.combo > 2 ? `${r.combo} in a row` : "", 10, 32);
      if (now < r.start + r.loopLen) {
        g.textAlign = "center";
        g.font = "22px monospace";
        const left = r.start + r.loopLen - now;
        g.fillText(left > 1.5 ? "listen…" : "your turn", W / 2, H / 2 - 20);
      }
      g.textAlign = "left";
      for (let i = 0; i < 4; i++) {
        g.fillStyle = LANES[i].color;
        g.font = "14px monospace";
        g.textAlign = "center";
        g.fillText(touch ? laneName(i) : `${LANES[i].key} ${laneName(i)}`, i * lw + lw / 2, H - 12);
      }
      g.textAlign = "left";
      if (now > r.end + 0.4) {
        const perfect = r.hits.filter((h) => h.state === 1).length;
        const good = r.hits.filter((h) => h.state === 2).length;
        const missed = r.hits.length - perfect - good;
        const score = r.hits.length ? Math.round(((perfect + good * 0.6) / r.hits.length) * 100) : 0;
        r.engine.stop();
        setResult({ score, perfect, good, missed, combo: r.best });
        setPhase("done");
        onFinish(score);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const title = mode === "cypher" ? "The cypher" : mode === "battle" ? "Beat battle" : "Your set";
  const verdict = (s: number) =>
    rival
      ? s >= rival.score
        ? `${rival.name} got ${rival.score}%. The crowd's on your side. ${rival.name} shakes your hand, not happy about it.`
        : `${rival.name} got ${rival.score}%. Close isn't enough. ${rival.name} takes the money and grins.`
      : mode === "cypher"
      ? s >= 85
        ? "They go off. Somebody films it."
        : s >= 70
          ? "Heads nodding the whole way. They want another."
          : s >= 45
            ? "It held together. Mostly."
            : "The MC stops halfway. “Run it back when you're ready.”"
      : s >= 85
        ? "The floor doesn't stop. The DJ hands you a drink."
        : s >= 70
          ? "Hands up at the drop. You kept the floor."
          : s >= 45
            ? "A few left for the bar. Most stayed."
            : "The floor empties a bit. The DJ takes over again.";

  return (
    <Frame title={title} sub={mode === "cypher" ? "keep the beat going" : mode === "battle" ? (rival ? `beat ${rival.name}'s ${rival.score}%` : "the hard one") : "keep the floor"} onClose={onClose} testid="rhythm" wide>
      {phase === "ready" && (
        <div className="flex flex-col gap-3">
          <p>
            {mode === "cypher"
              ? "They'll rap over whatever you play. One loop of the beat, then the kick, the snare and the keys are yours."
              : mode === "battle"
                ? `${rival?.name ?? "They"} played the ${beat.name} first: ${rival?.score ?? "?"}%. Now you: one loop to hear it, then everything's on you, ${laneName(2)} too. Faster, and less room for error.`
                : "Your set. One loop to get the feel, then the kick, the snare and the 808 are yours. Keep the floor."}
          </p>
          <p className="text-[17px] text-[#b9b09e]">{touch ? "Tap the pads as the bars reach the line." : `D F J K (or ← ↓ ↑ →) as the bars reach the line.${mode === "battle" ? "" : " The hats keep time."}`}</p>
          <button className={miniBtn} onClick={begin} data-autofocus data-testid="rhythm-start">
            Start
          </button>
        </div>
      )}
      {phase !== "ready" && (
        <div className="flex flex-col items-center gap-2">
          <canvas ref={canvas} width={320} height={300} className={`block w-full max-w-[420px] rounded-[2px] ${phase === "done" ? "hidden" : ""}`} aria-label="The lanes" role="img" />
          {phase === "play" && touch && (
            <div className="grid w-full max-w-[420px] grid-cols-4 gap-1">
              {LANES.map((l, i) => (
                <button
                  key={l.name}
                  className="pad-btn h-16 rounded-[4px]"
                  data-down={down === i}
                  style={{ borderColor: l.color }}
                  aria-label={`${laneName(i)} pad`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setDown(i);
                    press(i);
                  }}
                  onPointerUp={() => setDown(null)}
                >
                  {laneName(i)}
                </button>
              ))}
            </div>
          )}
          {phase === "done" && (
            <div className="flex w-full flex-col gap-2" data-testid="rhythm-result">
              <p className="text-[34px] text-amber">{result.score}%</p>
              <p>{verdict(result.score)}</p>
              <p className="text-[17px] text-[#b9b09e]">
                perfect {result.perfect} · good {result.good} · missed {result.missed} · best run {result.combo}
              </p>
              <div className="flex gap-2">
                {!rival && (
                  <button className={miniBtn} onClick={() => setPhase("ready")}>
                    Again
                  </button>
                )}
                <button className={miniBtn} onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Frame>
  );
}
