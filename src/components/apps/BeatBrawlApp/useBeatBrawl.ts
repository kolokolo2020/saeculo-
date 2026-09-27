"use client";

import { useEffect, useRef, useState } from "react";
import { playHat, playKick, playSnare } from "@/lib/synth";
import { readBest, submitBest } from "@/lib/bestScores";
import { TRACKS, gridTempo } from "@/data/tracks";
import { useLaneGame } from "@/components/games/useLaneGame";
import { useSecretStore } from "@/components/secrets/secretStore";

const FIGHT_LENGTH_S = 120; // generous — the fight ends on HP, not the clock
const BASE_TRAVEL_S = 1.45;
const RAMP_S = 55; // the metronome reaches full speed ~55s in
const MAX_SPEEDUP = 1.7;

export const BOSS_MAX_HP = 100;
export const PLAYER_MAX_HP = 100;
const PERFECT_DMG = 13;
const GOOD_DMG = 8;
const MISS_DMG = 5;

export const BOSS_NAME = "Metro Nome";
const TAUNTS = ["tick. tock.", "keep up.", "out of time.", "is that all?", "you're dragging."];

export type BrawlOutcome = "won" | "lost" | null;

const speedAt = (now: number) => Math.min(MAX_SPEEDUP, 1 + (Math.max(0, now) / RAMP_S) * (MAX_SPEEDUP - 1));

// A rhythm boss fight on the shared lane engine: landing notes damages the
// boss, letting them pass damages you, and the notes fall faster the longer
// the fight goes.
export function useBeatBrawl() {
  const [trackIndex, setTrackIndex] = useState(1);
  const [playerHP, setPlayerHP] = useState(PLAYER_MAX_HP);
  const [bossHP, setBossHP] = useState(BOSS_MAX_HP);
  const [combo, setCombo] = useState(0);
  const [taunt, setTaunt] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [bossHit, setBossHit] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const [outcome, setOutcome] = useState<BrawlOutcome>(null);
  const [best, setBest] = useState(() => readBest("brawl"));

  const playerRef = useRef(PLAYER_MAX_HP);
  const bossRef = useRef(BOSS_MAX_HP);
  const comboRef = useRef(0);
  const missStreakRef = useRef(0);
  const endRef = useRef<BrawlOutcome>(null);
  const speedStepRef = useRef(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const game = useLaneGame({
    travel: (now) => BASE_TRAVEL_S / speedAt(now),
    onHit: (judgement, _lane, ctx) => {
      comboRef.current += 1;
      missStreakRef.current = 0;
      setCombo(comboRef.current);
      const dmg = (judgement === "perfect" ? PERFECT_DMG : GOOD_DMG) + Math.min(comboRef.current, 8);
      bossRef.current = Math.max(0, bossRef.current - dmg);
      setBossHP(bossRef.current);
      setBossHit(true);
      later(() => setBossHit(false), 180);
      if (judgement === "perfect") playHat(ctx, ctx.destination, ctx.currentTime, 0.28);
      playKick(ctx, ctx.destination, ctx.currentTime, judgement === "perfect" ? 0.7 : 0.5);
      if (bossRef.current <= 0) endRef.current = "won";
    },
    onMiss: () => {
      comboRef.current = 0;
      setCombo(0);
      playerRef.current = Math.max(0, playerRef.current - MISS_DMG);
      setPlayerHP(playerRef.current);
      setPlayerHit(true);
      later(() => setPlayerHit(false), 180);
      missStreakRef.current += 1;
      if (missStreakRef.current >= 2) {
        missStreakRef.current = 0;
        setTaunt(TAUNTS[Math.floor(Math.random() * TAUNTS.length)]);
        later(() => setTaunt(null), 1400);
      }
      if (playerRef.current <= 0) endRef.current = "lost";
    },
    onWhiff: (_lane, ctx) => {
      comboRef.current = 0;
      setCombo(0);
      playSnare(ctx, ctx.destination, ctx.currentTime, 0.2);
    },
    onFrame: (now) => {
      // only re-render the speed readout when it moves by a visible step
      const step = Math.round(speedAt(now) * 20) / 20;
      if (step !== speedStepRef.current) {
        speedStepRef.current = step;
        setSpeed(step);
      }
      return endRef.current !== null;
    },
    onEnd: () => {
      const result: BrawlOutcome =
        endRef.current ?? (bossRef.current < playerRef.current ? "won" : "lost");
      setOutcome(result);
      // best = the most health you walked away with from a win
      if (result === "won") {
        setBest(submitBest("brawl", playerRef.current));
        useSecretStore.getState().find("brawl");
      }
    },
  });

  const start = () => {
    playerRef.current = PLAYER_MAX_HP;
    bossRef.current = BOSS_MAX_HP;
    comboRef.current = 0;
    missStreakRef.current = 0;
    endRef.current = null;
    speedStepRef.current = 1;
    setPlayerHP(PLAYER_MAX_HP);
    setBossHP(BOSS_MAX_HP);
    setCombo(0);
    setTaunt(null);
    setSpeed(1);
    setOutcome(null);
    void game.start(TRACKS[trackIndex], FIGHT_LENGTH_S, 0.45);
  };

  return {
    ...game,
    trackIndex,
    setTrackIndex,
    bpm: gridTempo(TRACKS[trackIndex]),
    playerHP,
    bossHP,
    combo,
    taunt,
    speed,
    bossHit,
    playerHit,
    outcome,
    best,
    start,
  };
}
