"use client";

import { useEffect, useRef, useState } from "react";
import { getAudioContext } from "@/lib/audioContext";
import { playBlip } from "@/lib/synth";
import { MAX_OFFSET_MS, MIN_OFFSET_MS, saveLatencyOffsetMs } from "@/lib/latency";
import { usePlayerStore } from "@/components/player/playerStore";

const CLICKS = 16;
const INTERVAL_S = 0.5; // 120 bpm
const WARMUP = 4; // the first bar is for finding the pulse, not measured
const MIN_TAPS = 5;

type Phase = "idle" | "running" | "done";

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

// Tap along to 16 clicks; the median of how late the taps land (after the
// browser's own latency figure) becomes this device's timing correction.
export default function LatencyCalibrator({ onClose, onSaved }: { onClose: () => void; onSaved: (ms: number) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [beat, setBeat] = useState(-1);
  const [taps, setTaps] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const startRef = useRef(0);
  const offsetsRef = useRef<number[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const start = () => {
    usePlayerStore.getState().pause();
    const ctx = getAudioContext();
    const t0 = ctx.currentTime + 0.6;
    startRef.current = t0;
    offsetsRef.current = [];
    setTaps(0);
    setResult(null);
    setPhase("running");
    for (let i = 0; i < CLICKS; i++) {
      const t = t0 + i * INTERVAL_S;
      playBlip(ctx, ctx.destination, t, i % 4 === 0 ? 1320 : 880, 0.35);
      timersRef.current.push(setTimeout(() => setBeat(i), (t - ctx.currentTime) * 1000));
    }
    timersRef.current.push(
      setTimeout(() => {
        const offsets = offsetsRef.current;
        setBeat(-1);
        setResult(offsets.length >= MIN_TAPS ? Math.round(median(offsets) * 1000) : null);
        setPhase("done");
      }, (t0 + CLICKS * INTERVAL_S - ctx.currentTime) * 1000),
    );
  };

  const tap = () => {
    if (phase !== "running") return;
    const ctx = getAudioContext();
    const heard = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
    const k = Math.round((heard - startRef.current) / INTERVAL_S);
    if (k < WARMUP || k >= CLICKS) return;
    const off = heard - (startRef.current + k * INTERVAL_S);
    if (Math.abs(off) > INTERVAL_S / 2) return;
    offsetsRef.current.push(off);
    setTaps(offsetsRef.current.length);
  };

  // any key taps too, for keyboard players
  useEffect(() => {
    if (phase !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.key === "Escape" || e.key === "Tab") return;
      e.preventDefault();
      tap();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const inRange = result !== null && result >= MIN_OFFSET_MS && result <= MAX_OFFSET_MS;

  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-black/25 p-3" role="dialog" aria-label="Calibrate audio timing">
      <div className="w-full max-w-[340px] rounded-[6px] border border-[#6a7f99] bg-white p-4 text-ink shadow-2xl">
        <h3 className="text-[15px] text-[#1e3287]">Calibrate audio timing</h3>
        <p className="mt-1 text-[12px] text-mute">
          Wearing Bluetooth headphones? They play sound late, which makes the games feel off. Tap along to the clicks
          and the games will adjust.
        </p>

        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {Array.from({ length: CLICKS }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${
                i === beat ? "bg-[#1f6fd1] shadow-[0_0_6px_#6fb4ff]" : i < WARMUP ? "bg-[#d6dce4]" : "bg-[#b9c6d6]"
              }`}
            />
          ))}
        </div>

        {phase === "running" ? (
          <button
            onPointerDown={tap}
            className="aero-btn aero-btn-primary mt-3 block h-20 w-full text-[15px] select-none"
            aria-label="Tap on the beat"
          >
            {beat < WARMUP ? "Listen… then tap on the clicks" : `Tap! (${taps})`}
          </button>
        ) : (
          <div className="mt-3 min-h-20 text-[12.5px]" aria-live="polite">
            {phase === "idle" && <p>Press Start, listen to the first four clicks, then tap on every click after that.</p>}
            {phase === "done" &&
              (result === null ? (
                <p>Not enough taps to measure. Try again, and tap on every click.</p>
              ) : inRange ? (
                <p>
                  Your taps land <b>{Math.abs(result)} ms {result >= 0 ? "late" : "early"}</b>. Save it and the games will
                  judge your hits with that in mind.
                </p>
              ) : (
                <p>That was too far off the clicks to be a device delay. Try again.</p>
              ))}
          </div>
        )}

        <div className="mt-3 flex justify-end gap-2">
          {phase === "done" && inRange && (
            <button
              onClick={() => {
                saveLatencyOffsetMs(result);
                onSaved(result);
                onClose();
              }}
              className="aero-btn aero-btn-primary px-4 py-1 text-[12px]"
            >
              Save
            </button>
          )}
          {phase !== "running" && (
            <button onClick={start} className="aero-btn px-4 py-1 text-[12px]">
              {phase === "done" ? "Try again" : "Start"}
            </button>
          )}
          <button onClick={onClose} className="aero-btn px-4 py-1 text-[12px]">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
