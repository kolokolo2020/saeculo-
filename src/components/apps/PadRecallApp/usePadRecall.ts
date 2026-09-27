"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playBass, playBlip, playHat, playKick, playSnare } from "@/lib/synth";
import { readBest, submitBest } from "@/lib/bestScores";
import { usePlayerStore } from "@/components/player/playerStore";
import { getAudioContext } from "@/lib/audioContext";

export const PAD_KEYS = ["q", "w", "e", "r", "a", "s", "d", "f"] as const;
export const PAD_NAMES = ["Kick", "Snare", "Hat", "Blip", "Sub", "Low", "Mid", "Bell"];

export type PadPhase = "idle" | "showing" | "input" | "over";

function triggerPad(ctx: AudioContext, pad: number) {
  const t = ctx.currentTime;
  const out = ctx.destination;
  switch (pad) {
    case 0:
      return playKick(ctx, out, t);
    case 1:
      return playSnare(ctx, out, t, 0.45);
    case 2:
      return playHat(ctx, out, t, 0.35);
    case 3:
      return playBlip(ctx, out, t, 1318, 0.2);
    case 4:
      return playBass(ctx, out, t, 55, 0.5);
    case 5:
      return playBass(ctx, out, t, 73.4, 0.5);
    case 6:
      return playBass(ctx, out, t, 98, 0.5);
    default:
      return playBlip(ctx, out, t, 880, 0.2);
  }
}

// Simon on an MPC: the machine plays a pattern on the pads, you repeat it,
// it adds one hit and plays it back a little faster.
export function usePadRecall() {
  const [phase, setPhase] = useState<PadPhase>("idle");
  const [round, setRound] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const [best, setBest] = useState(() => readBest("pads"));
  const [wrongPad, setWrongPad] = useState<number | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const seqRef = useRef<number[]>([]);
  const inputIndexRef = useRef(0);
  const phaseRef = useRef<PadPhase>("idle");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const setPhaseBoth = useCallback((p: PadPhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);
  const after = useCallback((ms: number, fn: () => void) => {
    timersRef.current.push(setTimeout(fn, ms));
  }, []);

  const flashPad = useCallback((pad: number, ms: number) => {
    const ctx = ctxRef.current;
    if (ctx) triggerPad(ctx, pad);
    setLit(pad);
    timersRef.current.push(setTimeout(() => setLit((cur) => (cur === pad ? null : cur)), ms));
  }, []);

  const playSequence = useCallback(() => {
    setPhaseBoth("showing");
    const seq = seqRef.current;
    // speeds up as the pattern grows, but never becomes a blur
    const gap = Math.max(300, 620 - seq.length * 28);
    seq.forEach((pad, i) => {
      after(500 + i * gap, () => flashPad(pad, gap * 0.6));
    });
    after(500 + seq.length * gap, () => {
      inputIndexRef.current = 0;
      setPhaseBoth("input");
    });
  }, [flashPad, after, setPhaseBoth]);

  const nextRound = useCallback(() => {
    seqRef.current = [...seqRef.current, Math.floor(Math.random() * PAD_KEYS.length)];
    setRound(seqRef.current.length);
    playSequence();
  }, [playSequence]);

  const start = useCallback(() => {
    usePlayerStore.getState().pause();
    ctxRef.current = getAudioContext();
    clearTimers();
    seqRef.current = [];
    setWrongPad(null);
    setRound(0);
    nextRound();
  }, [nextRound, clearTimers]);

  const press = useCallback(
    (pad: number) => {
      if (phaseRef.current !== "input") return;
      flashPad(pad, 180);
      const expected = seqRef.current[inputIndexRef.current];
      if (pad !== expected) {
        setWrongPad(pad);
        setPhaseBoth("over");
        const completed = seqRef.current.length - 1;
        setBest(submitBest("pads", completed));
        const ctx = ctxRef.current;
        if (ctx) playBlip(ctx, ctx.destination, ctx.currentTime + 0.12, 180, 0.25);
        return;
      }
      inputIndexRef.current += 1;
      if (inputIndexRef.current === seqRef.current.length) {
        setPhaseBoth("showing");
        after(650, nextRound);
      }
    },
    [flashPad, nextRound, after, setPhaseBoth],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const idx = PAD_KEYS.indexOf(e.key.toLowerCase() as (typeof PAD_KEYS)[number]);
      if (idx !== -1) press(idx);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  return { phase, round, lit, best, wrongPad, start, press };
}
