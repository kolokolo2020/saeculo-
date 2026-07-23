"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playBass, playHat, playKick, playSnare } from "@/lib/synth";

export const STEP_COUNT = 16;
export type Lane = "kick" | "snare" | "hat" | "bass";
export const LANES: Lane[] = ["kick", "snare", "hat", "bass"];

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.12;

const DEFAULT_PATTERN: Record<Lane, boolean[]> = {
  kick: bools([0, 4, 8, 11]),
  snare: bools([4, 12]),
  hat: bools([0, 2, 4, 6, 8, 10, 12, 14]),
  bass: bools([0, 6, 8]),
};

function bools(activeSteps: number[]): boolean[] {
  return Array.from({ length: STEP_COUNT }, (_, i) => activeSteps.includes(i));
}

export function useStepSequencer() {
  const [pattern, setPattern] = useState(DEFAULT_PATTERN);
  const [bpm, setBpm] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [displayStep, setDisplayStep] = useState(-1);

  const ctxRef = useRef<AudioContext | null>(null);
  const patternRef = useRef(pattern);
  const bpmRef = useRef(bpm);
  const nextStepRef = useRef(0);
  const nextTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef(0);
  const scheduledRef = useRef<{ step: number; time: number }[]>([]);

  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  const toggleStep = useCallback((lane: Lane, step: number) => {
    setPattern((prev) => {
      const next = { ...prev, [lane]: [...prev[lane]] };
      next[lane][step] = !next[lane][step];
      return next;
    });
  }, []);

  const scheduleStep = useCallback((step: number, time: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const p = patternRef.current;
    if (p.kick[step]) playKick(ctx, ctx.destination, time);
    if (p.snare[step]) playSnare(ctx, ctx.destination, time);
    if (p.hat[step]) playHat(ctx, ctx.destination, time);
    if (p.bass[step]) playBass(ctx, ctx.destination, time, step % 8 < 4 ? 55 : 73.4);
    scheduledRef.current.push({ step, time });
  }, []);

  const scheduler = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    while (nextTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_S) {
      scheduleStep(nextStepRef.current, nextTimeRef.current);
      const stepDur = 60 / bpmRef.current / 4;
      nextTimeRef.current += stepDur;
      nextStepRef.current = (nextStepRef.current + 1) % STEP_COUNT;
    }
  }, [scheduleStep]);

  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      const ctx = ctxRef.current;
      if (ctx) {
        const q = scheduledRef.current;
        while (q.length > 1 && q[1].time <= ctx.currentTime) q.shift();
        if (q.length && q[0].time <= ctx.currentTime + 0.02) setDisplayStep(q[0].step);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  const play = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    else if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    nextStepRef.current = 0;
    nextTimeRef.current = ctxRef.current.currentTime + 0.05;
    scheduledRef.current = [];
    scheduler();
    timerRef.current = setInterval(scheduler, LOOKAHEAD_MS);
    setPlaying(true);
  }, [scheduler]);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setPlaying(false);
    setDisplayStep(-1);
  }, []);

  const clear = useCallback(() => {
    setPattern({ kick: bools([]), snare: bools([]), hat: bools([]), bass: bools([]) });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cancelAnimationFrame(rafRef.current);
      void ctxRef.current?.close();
    };
  }, []);

  return { pattern, toggleStep, bpm, setBpm, playing, play, stop, clear, displayStep };
}
