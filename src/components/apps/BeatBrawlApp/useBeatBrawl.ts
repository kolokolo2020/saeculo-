"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playHat, playKick, playSnare } from "@/lib/synth";
import { TRACKS } from "@/data/tracks";

export const LANE_KEYS = ["d", "f", "j", "k"] as const;
const LANE_COUNT = 4;
const BASE_TRAVEL_S = 1.4;
const PERFECT_WINDOW = 0.07;
const GOOD_WINDOW = 0.16;
const MAX_NOTES_S = 120; // generous supply — the fight ends on HP, not a clock
const RAMP_S = 55; // metronome reaches max speed ~55s into the fight
const MAX_SPEEDUP = 1.7;

const BOSS_MAX_HP = 100;
const PLAYER_MAX_HP = 100;
const PERFECT_DMG = 13;
const GOOD_DMG = 8;
const MISS_DMG = 4;

const BOSS_NAME = "Metro Nome";
const TAUNTS = ["tick. tock.", "keep up.", "out of time.", "is that all?"];

interface Note {
  time: number;
  lane: number;
  judged: boolean;
  hit: boolean;
}

export type Judgement = "perfect" | "good" | "miss" | null;
export type BrawlState = "idle" | "running" | "won" | "lost";

function generateNotes(bpm: number, seconds: number): Note[] {
  const stepDur = 60 / bpm / 2; // 8th notes
  const notes: Note[] = [];
  let lastLane = -1;
  for (let t = 1.5; t < seconds; t += stepDur) {
    // Brawl notes are deliberately sparser than Rhythm Rush's scoring
    // mode — each one reads as a discrete "attack" to react to, not a
    // firehose, so early misses don't snowball into an instant loss.
    if (Math.random() < 0.58) continue;
    let lane = Math.floor(Math.random() * LANE_COUNT);
    if (lane === lastLane && Math.random() < 0.6) lane = (lane + 1) % LANE_COUNT;
    lastLane = lane;
    notes.push({ time: t, lane, judged: false, hit: false });
  }
  return notes;
}

export function useBeatBrawl() {
  const [trackIndex, setTrackIndex] = useState(1);
  const [brawlState, setBrawlState] = useState<BrawlState>("idle");
  const [playerHP, setPlayerHP] = useState(PLAYER_MAX_HP);
  const [bossHP, setBossHP] = useState(BOSS_MAX_HP);
  const [combo, setCombo] = useState(0);
  const [judgement, setJudgement] = useState<Judgement>(null);
  const [taunt, setTaunt] = useState<string | null>(null);
  const [tempoMult, setTempoMult] = useState(1);
  const [bossHit, setBossHit] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const notesRef = useRef<Note[]>([]);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerHPRef = useRef(PLAYER_MAX_HP);
  const bossHPRef = useRef(BOSS_MAX_HP);
  const comboRef = useRef(0);
  const judgeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tauntTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const missStreakRef = useRef(0);
  const loopRef = useRef<() => void>(() => {});

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

  const showTaunt = useCallback((line: string) => {
    setTaunt(line);
    if (tauntTimeoutRef.current) clearTimeout(tauntTimeoutRef.current);
    tauntTimeoutRef.current = setTimeout(() => setTaunt(null), 1400);
  }, []);

  const draw = useCallback((travelS: number) => {
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
    ctx2d.fillStyle = "#16160f";
    ctx2d.fillRect(0, 0, w, h);

    const laneW = w / LANE_COUNT;
    const hitY = h - 32;

    for (let i = 0; i < LANE_COUNT; i++) {
      ctx2d.fillStyle = i % 2 === 0 ? "rgba(241,234,217,0.03)" : "rgba(241,234,217,0.0)";
      ctx2d.fillRect(i * laneW, 0, laneW, h);
    }
    ctx2d.strokeStyle = "#ff9a2e";
    ctx2d.lineWidth = 2;
    ctx2d.beginPath();
    ctx2d.moveTo(0, hitY);
    ctx2d.lineTo(w, hitY);
    ctx2d.stroke();

    const now = (performance.now() - startRef.current) / 1000;
    const colors = ["#ff9a2e", "#4fd6c4", "#f1ead9", "#8b8570"];
    for (const note of notesRef.current) {
      if (note.hit) continue;
      const progress = 1 - (note.time - now) / travelS;
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

  const endFight = useCallback((result: "won" | "lost") => {
    setBrawlState(result);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const loop = useCallback(() => {
    const now = (performance.now() - startRef.current) / 1000;
    const mult = Math.min(MAX_SPEEDUP, 1 + (now / RAMP_S) * (MAX_SPEEDUP - 1));
    setTempoMult(mult);
    const travelS = BASE_TRAVEL_S / mult;

    for (const note of notesRef.current) {
      if (!note.judged && now - note.time > GOOD_WINDOW) {
        // notesRef holds plain mutable objects that live only in this ref —
        // never rendered directly — so in-place mutation here is safe.
        // eslint-disable-next-line react-hooks/immutability
        note.judged = true;
        comboRef.current = 0;
        setCombo(0);
        flashJudgement("miss");
        playerHPRef.current = Math.max(0, playerHPRef.current - MISS_DMG);
        setPlayerHP(playerHPRef.current);
        setPlayerHit(true);
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setPlayerHit(false), 200);
        missStreakRef.current += 1;
        if (missStreakRef.current >= 2) {
          missStreakRef.current = 0;
          showTaunt(TAUNTS[Math.floor(Math.random() * TAUNTS.length)]);
        }
        if (playerHPRef.current <= 0) {
          endFight("lost");
          return;
        }
      }
    }

    draw(travelS);

    if (now >= MAX_NOTES_S - 2) {
      endFight(bossHPRef.current < playerHPRef.current ? "won" : "lost");
      return;
    }
    rafRef.current = requestAnimationFrame(() => loopRef.current());
  }, [draw, flashJudgement, endFight, showTaunt]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const start = useCallback(() => {
    ensureCtx();
    notesRef.current = generateNotes(TRACKS[trackIndex].bpm, MAX_NOTES_S);
    playerHPRef.current = PLAYER_MAX_HP;
    bossHPRef.current = BOSS_MAX_HP;
    comboRef.current = 0;
    missStreakRef.current = 0;
    setPlayerHP(PLAYER_MAX_HP);
    setBossHP(BOSS_MAX_HP);
    setCombo(0);
    setJudgement(null);
    setTaunt(null);
    setTempoMult(1);
    setBrawlState("running");
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
  }, [ensureCtx, loop, trackIndex]);

  const hitLane = useCallback(
    (lane: number) => {
      if (brawlState !== "running") return;
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
        missStreakRef.current = 0;
        const dmg = (perfect ? PERFECT_DMG : GOOD_DMG) + Math.min(comboRef.current, 8);
        bossHPRef.current = Math.max(0, bossHPRef.current - dmg);
        setBossHP(bossHPRef.current);
        setBossHit(true);
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setBossHit(false), 200);
        flashJudgement(perfect ? "perfect" : "good");
        if (ctx) {
          if (perfect) playHat(ctx, ctx.destination, ctx.currentTime, 0.3);
          playKick(ctx, ctx.destination, ctx.currentTime, perfect ? 0.7 : 0.5);
        }
        if (bossHPRef.current <= 0) {
          endFight("won");
        }
      } else {
        comboRef.current = 0;
        setCombo(0);
        flashJudgement("miss");
        if (ctx) playSnare(ctx, ctx.destination, ctx.currentTime, 0.25);
      }
    },
    [brawlState, flashJudgement, endFight],
  );

  useEffect(() => {
    if (brawlState !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      const idx = LANE_KEYS.indexOf(e.key.toLowerCase() as (typeof LANE_KEYS)[number]);
      if (idx !== -1) hitLane(idx);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [brawlState, hitLane]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (judgeTimeoutRef.current) clearTimeout(judgeTimeoutRef.current);
      if (tauntTimeoutRef.current) clearTimeout(tauntTimeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      void ctxRef.current?.close();
    };
  }, []);

  return {
    canvasRef,
    trackIndex,
    setTrackIndex,
    brawlState,
    bossName: BOSS_NAME,
    playerHP,
    bossHP,
    playerMaxHP: PLAYER_MAX_HP,
    bossMaxHP: BOSS_MAX_HP,
    combo,
    judgement,
    taunt,
    tempoMult,
    bossHit,
    playerHit,
    start,
    hitLane,
  };
}
