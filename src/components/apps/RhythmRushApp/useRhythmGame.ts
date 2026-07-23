"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playBlip, playHat } from "@/lib/synth";
import { TRACKS } from "@/data/tracks";

export const LANE_KEYS = ["d", "f", "j", "k"] as const;
const LANE_COUNT = 4;
const TRAVEL_S = 1.5;
const GAME_LENGTH_S = 32;
const PERFECT_WINDOW = 0.07;
const GOOD_WINDOW = 0.16;
const HIGH_SCORE_KEY = "saeculo-rhythm-highscore";

interface Note {
  time: number; // hit time, seconds from game start
  lane: number;
  judged: boolean;
  hit: boolean;
}

export type Judgement = "perfect" | "good" | "miss" | null;
export type GameState = "idle" | "running" | "ended";

function generateNotes(bpm: number, seconds: number): Note[] {
  const stepDur = 60 / bpm / 2; // 8th notes
  const notes: Note[] = [];
  let lastLane = -1;
  for (let t = 1.5; t < seconds; t += stepDur) {
    if (Math.random() < 0.32) continue; // leave gaps
    let lane = Math.floor(Math.random() * LANE_COUNT);
    if (lane === lastLane && Math.random() < 0.6) lane = (lane + 1) % LANE_COUNT;
    lastLane = lane;
    notes.push({ time: t, lane, judged: false, hit: false });
  }
  return notes;
}

function readHighScore(): number {
  try {
    return Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function useRhythmGame() {
  const [trackIndex, setTrackIndex] = useState(1); // arcade dust — good tempo for a game
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_LENGTH_S);
  const [judgement, setJudgement] = useState<Judgement>(null);
  const [highScore, setHighScore] = useState(readHighScore);

  const ctxRef = useRef<AudioContext | null>(null);
  const notesRef = useRef<Note[]>([]);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const judgeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    else if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const flashJudgement = useCallback((j: Judgement) => {
    setJudgement(j);
    if (judgeTimeoutRef.current) clearTimeout(judgeTimeoutRef.current);
    judgeTimeoutRef.current = setTimeout(() => setJudgement(null), 260);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx2d = canvas?.getContext("2d");
    if (!canvas || !ctx2d) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== w * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx2d.scale(dpr, dpr);
    }
    ctx2d.fillStyle = "#0a0a14";
    ctx2d.fillRect(0, 0, w, h);

    const laneW = w / LANE_COUNT;
    const hitY = h - 36;

    for (let i = 0; i < LANE_COUNT; i++) {
      ctx2d.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.0)";
      ctx2d.fillRect(i * laneW, 0, laneW, h);
    }
    ctx2d.strokeStyle = "#00e5a0";
    ctx2d.lineWidth = 2;
    ctx2d.beginPath();
    ctx2d.moveTo(0, hitY);
    ctx2d.lineTo(w, hitY);
    ctx2d.stroke();

    const now = (performance.now() - startRef.current) / 1000;
    const colors = ["#ff2d78", "#ffe600", "#00e5a0", "#00b4ff"];
    for (const note of notesRef.current) {
      if (note.hit) continue;
      const progress = 1 - (note.time - now) / TRAVEL_S;
      if (progress < -0.05 || progress > 1.15) continue;
      const y = progress * hitY;
      const x = note.lane * laneW + laneW / 2;
      ctx2d.fillStyle = colors[note.lane];
      ctx2d.fillRect(x - laneW * 0.32, y - 7, laneW * 0.64, 14);
    }

    for (let i = 0; i < LANE_COUNT; i++) {
      ctx2d.fillStyle = "rgba(255,255,255,0.5)";
      ctx2d.font = "10px monospace";
      ctx2d.textAlign = "center";
      ctx2d.fillText(LANE_KEYS[i].toUpperCase(), i * laneW + laneW / 2, hitY + 20);
    }
  }, []);

  const loopRef = useRef<() => void>(() => {});

  const loop = useCallback(() => {
    const now = (performance.now() - startRef.current) / 1000;
    for (const note of notesRef.current) {
      if (!note.judged && now - note.time > GOOD_WINDOW) {
        // notesRef holds plain mutable objects that live only in this ref —
        // never rendered directly — so in-place mutation here is safe.
        // eslint-disable-next-line react-hooks/immutability
        note.judged = true;
        comboRef.current = 0;
        setCombo(0);
        flashJudgement("miss");
      }
    }
    draw();
    if (now >= GAME_LENGTH_S) {
      setTimeLeft(0);
      setGameState("ended");
      setHighScore((prev) => {
        if (scoreRef.current > prev) {
          try {
            localStorage.setItem(HIGH_SCORE_KEY, String(scoreRef.current));
          } catch {
            // storage unavailable — score still shown this session
          }
          return scoreRef.current;
        }
        return prev;
      });
      return;
    }
    setTimeLeft(Math.max(0, Math.ceil(GAME_LENGTH_S - now)));
    rafRef.current = requestAnimationFrame(() => loopRef.current());
  }, [draw, flashJudgement]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const start = useCallback(() => {
    ensureCtx();
    notesRef.current = generateNotes(TRACKS[trackIndex].bpm, GAME_LENGTH_S);
    scoreRef.current = 0;
    comboRef.current = 0;
    setScore(0);
    setCombo(0);
    setJudgement(null);
    setTimeLeft(GAME_LENGTH_S);
    setGameState("running");
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
  }, [ensureCtx, loop, trackIndex]);

  const hitLane = useCallback(
    (lane: number) => {
      if (gameState !== "running") return;
      const now = (performance.now() - startRef.current) / 1000;
      let best: Note | null = null;
      let bestDelta = Infinity;
      for (const note of notesRef.current) {
        if (note.judged || note.lane !== lane) continue;
        const delta = Math.abs(note.time - now);
        if (delta < bestDelta) {
          bestDelta = delta;
          best = note;
        }
      }
      const ctx = ctxRef.current;
      if (best && bestDelta <= GOOD_WINDOW) {
        // safe in-place mutation of a ref-only object, see note above
        // eslint-disable-next-line react-hooks/immutability
        best.judged = true;
        best.hit = true;
        const perfect = bestDelta <= PERFECT_WINDOW;
        comboRef.current += 1;
        setCombo(comboRef.current);
        const gained = (perfect ? 100 : 60) + Math.min(comboRef.current * 2, 100);
        scoreRef.current += gained;
        setScore(scoreRef.current);
        flashJudgement(perfect ? "perfect" : "good");
        if (ctx) {
          if (perfect) playHat(ctx, ctx.destination, ctx.currentTime, 0.3);
          playBlip(ctx, ctx.destination, ctx.currentTime, perfect ? 1046 : 784);
        }
      } else {
        comboRef.current = 0;
        setCombo(0);
        flashJudgement("miss");
      }
    },
    [gameState, flashJudgement],
  );

  useEffect(() => {
    if (gameState !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      const idx = LANE_KEYS.indexOf(e.key.toLowerCase() as (typeof LANE_KEYS)[number]);
      if (idx !== -1) hitLane(idx);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameState, hitLane]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (judgeTimeoutRef.current) clearTimeout(judgeTimeoutRef.current);
      void ctxRef.current?.close();
    };
  }, []);

  return {
    canvasRef,
    trackIndex,
    setTrackIndex,
    gameState,
    score,
    combo,
    timeLeft,
    judgement,
    highScore,
    start,
    hitLane,
  };
}
