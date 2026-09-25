"use client";

import { useRef, useState } from "react";
import { playBlip, playHat } from "@/lib/synth";
import { readBest, submitBest } from "@/lib/bestScores";
import { TRACKS } from "@/data/tracks";
import { useLaneGame } from "@/components/games/useLaneGame";

export const RUN_LENGTH_S = 34;

export interface RunStats {
  perfect: number;
  good: number;
  miss: number;
}

export function rankFor(stats: RunStats): string {
  const total = stats.perfect + stats.good + stats.miss;
  if (!total) return "—";
  const acc = (stats.perfect + stats.good * 0.6) / total;
  if (acc >= 0.95) return "S";
  if (acc >= 0.85) return "A";
  if (acc >= 0.7) return "B";
  if (acc >= 0.5) return "C";
  return "D";
}

// Rhythm Rush scoring on top of the shared lane engine: points per hit
// plus a combo bonus, a fixed-length run, and a rank from accuracy.
export function useRhythmGame() {
  const [trackIndex, setTrackIndex] = useState(1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(RUN_LENGTH_S);
  const [best, setBest] = useState(() => readBest("rhythm"));
  const [result, setResult] = useState<{ stats: RunStats; maxCombo: number; newBest: boolean } | null>(null);

  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const statsRef = useRef<RunStats>({ perfect: 0, good: 0, miss: 0 });
  const secRef = useRef(RUN_LENGTH_S);

  const breakCombo = () => {
    comboRef.current = 0;
    setCombo(0);
  };

  const game = useLaneGame({
    onHit: (judgement, _lane, ctx) => {
      statsRef.current[judgement] += 1;
      comboRef.current += 1;
      maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
      setCombo(comboRef.current);
      scoreRef.current += (judgement === "perfect" ? 100 : 60) + Math.min(comboRef.current * 2, 100);
      setScore(scoreRef.current);
      if (judgement === "perfect") playHat(ctx, ctx.destination, ctx.currentTime, 0.25);
      playBlip(ctx, ctx.destination, ctx.currentTime, judgement === "perfect" ? 1046 : 784, 0.18);
    },
    onMiss: () => {
      statsRef.current.miss += 1;
      breakCombo();
    },
    onWhiff: breakCombo,
    onFrame: (now) => {
      const left = Math.max(0, Math.ceil(RUN_LENGTH_S - now));
      if (left !== secRef.current) {
        secRef.current = left;
        setTimeLeft(left);
      }
    },
    onEnd: () => {
      const prevBest = readBest("rhythm");
      setBest(submitBest("rhythm", scoreRef.current));
      setResult({
        stats: { ...statsRef.current },
        maxCombo: maxComboRef.current,
        newBest: scoreRef.current > prevBest,
      });
    },
  });

  const start = () => {
    scoreRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    statsRef.current = { perfect: 0, good: 0, miss: 0 };
    secRef.current = RUN_LENGTH_S;
    setScore(0);
    setCombo(0);
    setTimeLeft(RUN_LENGTH_S);
    setResult(null);
    void game.start(TRACKS[trackIndex], RUN_LENGTH_S, 0.62);
  };

  return { ...game, trackIndex, setTrackIndex, score, combo, timeLeft, best, result, start };
}
