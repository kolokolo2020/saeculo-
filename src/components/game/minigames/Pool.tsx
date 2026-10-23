"use client";

import { useEffect, useRef, useState } from "react";
import Frame, { miniBtn } from "./Frame";

// Pool at the back of the club, against Big Lou: sink three balls in six
// shots and he pays the bet twice over; sink the white and that shot's
// wasted. Aim with the arrows (or click the table where you want it to go),
// set the power with up and down (or the slider), Space (or Shoot) to take
// it.

const W = 300;
const H = 160;
const R = 5;
const RAIL = 12;
const POCKETS: [number, number][] = [
  [RAIL, RAIL],
  [W / 2, RAIL - 2],
  [W - RAIL, RAIL],
  [RAIL, H - RAIL],
  [W / 2, H - RAIL + 2],
  [W - RAIL, H - RAIL],
];
const SHOTS = 6;
const NEED = 3;

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  c: string;
  cue?: boolean;
  in?: boolean;
}
const rack = (): Ball[] => {
  const balls: Ball[] = [{ x: 80, y: H / 2, vx: 0, vy: 0, c: "#f4f1ea", cue: true }];
  const cols = ["#d0a020", "#2a4a7a", "#b33a3a", "#5a2a8a", "#d06a20", "#2f6b3a"];
  let k = 0;
  for (let row = 0; row < 3; row++)
    for (let j = 0; j <= row; j++) balls.push({ x: 200 + row * (R * 1.8), y: H / 2 + (j - row / 2) * (R * 2.1), vx: 0, vy: 0, c: cols[k++ % cols.length] });
  return balls;
};

export default function Pool({ cash, onSettle, onClose }: { cash: number; onSettle: (delta: number) => void; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const balls = useRef<Ball[]>(rack());
  const [aim, setAim] = useState(0);
  const [power, setPower] = useState(0.6);
  const [bet, setBet] = useState(10);
  const [playing, setPlaying] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [shots, setShots] = useState(0);
  const [sunk, setSunk] = useState(0);
  const [line, setLine] = useState("Big Lou chalks his cue. “Three balls, six shots. You pay, or I do.”");
  const over = playing && (sunk >= NEED || shots >= SHOTS) && !rolling;
  const settled = useRef(false);

  const aimRef = useRef(aim);
  const rollingRef = useRef(false);
  useEffect(() => {
    aimRef.current = aim;
  }, [aim]);

  const finishShot = () => {
    const bs = balls.current;
    const potted = bs.slice(1).filter((b) => b.in).length;
    const cue = bs[0];
    if (cue.in) {
      // the white goes back on the spot
      Object.assign(cue, { in: false, x: 80, y: H / 2, vx: 0, vy: 0 });
      setLine("The white goes down. Big Lou smiles and puts it back for you.");
    }
    setSunk((prev) => {
      if (potted > prev) setLine(potted - prev > 1 ? "Two in on one shot. Big Lou stops smiling." : "In. Clean.");
      else if (!cue.in) setLine((l) => (l.startsWith("The white") ? l : "Nothing drops."));
      return potted;
    });
    setRolling(false);
  };

  // the table: drawn every frame while anything's rolling, and once when it stops
  useEffect(() => {
    const g = canvas.current?.getContext("2d");
    if (!g) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.03, (now - last) / 1000);
      last = now;
      const bs = balls.current;
      let moving = false;
      // a few small steps per frame, so fast balls don't pass through each other
      for (let sub = 0; sub < 4; sub++) {
        const h = dt / 4;
        for (const b of bs) {
          if (b.in) continue;
          b.x += b.vx * h;
          b.y += b.vy * h;
          const f = Math.exp(-1.1 * h);
          b.vx *= f;
          b.vy *= f;
          if (Math.hypot(b.vx, b.vy) < 4) b.vx = b.vy = 0;
          // the cushions
          if (b.x < RAIL + R) Object.assign(b, { x: RAIL + R, vx: Math.abs(b.vx) * 0.85 });
          if (b.x > W - RAIL - R) Object.assign(b, { x: W - RAIL - R, vx: -Math.abs(b.vx) * 0.85 });
          if (b.y < RAIL + R) Object.assign(b, { y: RAIL + R, vy: Math.abs(b.vy) * 0.85 });
          if (b.y > H - RAIL - R) Object.assign(b, { y: H - RAIL - R, vy: -Math.abs(b.vy) * 0.85 });
          if (POCKETS.some(([px, py]) => Math.hypot(b.x - px, b.y - py) < R + 3.5)) {
            b.in = true;
            b.vx = b.vy = 0;
          }
        }
        for (let i = 0; i < bs.length; i++)
          for (let j = i + 1; j < bs.length; j++) {
            const a = bs[i];
            const b = bs[j];
            if (a.in || b.in) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d = Math.hypot(dx, dy);
            if (d > 0 && d < R * 2) {
              const nx = dx / d;
              const ny = dy / d;
              const push = (R * 2 - d) / 2;
              a.x -= nx * push;
              a.y -= ny * push;
              b.x += nx * push;
              b.y += ny * push;
              const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
              if (rel > 0) {
                a.vx -= rel * nx;
                a.vy -= rel * ny;
                b.vx += rel * nx;
                b.vy += rel * ny;
              }
            }
          }
      }
      moving = bs.some((b) => !b.in && (b.vx || b.vy));
      // draw
      g.fillStyle = "#3a2416";
      g.fillRect(0, 0, W, H);
      g.fillStyle = "#1f5a3a";
      g.fillRect(RAIL, RAIL, W - RAIL * 2, H - RAIL * 2);
      g.fillStyle = "#0b0b0d";
      for (const [px, py] of POCKETS) {
        g.beginPath();
        g.arc(px, py, R + 3, 0, Math.PI * 2);
        g.fill();
      }
      for (const b of bs) {
        if (b.in) continue;
        g.fillStyle = b.c;
        g.beginPath();
        g.arc(b.x, b.y, R, 0, Math.PI * 2);
        g.fill();
      }
      const cue = bs[0];
      if (!moving && !cue.in) {
        // the line you're aiming down
        g.strokeStyle = "rgba(255,255,255,0.35)";
        g.setLineDash([3, 3]);
        g.beginPath();
        g.moveTo(cue.x, cue.y);
        g.lineTo(cue.x + Math.cos(aimRef.current) * 70, cue.y + Math.sin(aimRef.current) * 70);
        g.stroke();
        g.setLineDash([]);
      }
      if (!moving && rollingRef.current) finishShot();
      rollingRef.current = moving;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // the loop reads aim and the shot through refs
  }, []);

  // settle up once the game's over
  useEffect(() => {
    if (!over || settled.current) return;
    settled.current = true;
    const won = sunk >= NEED;
    onSettle(won ? bet * 2 : -bet);
    setLine(won ? `${sunk} down in ${shots}. Big Lou pays $${bet * 2} and racks them again without being asked.` : `Six shots, ${sunk} down. Big Lou takes your $${bet}.`);
  }, [over, sunk, shots, bet, onSettle]);

  const start = () => {
    if (cash < bet) return;
    balls.current = rack();
    settled.current = false;
    setShots(0);
    setSunk(0);
    setAim(0);
    setPlaying(true);
    setLine(`$${bet} on it. Break whenever you're ready.`);
  };
  const shoot = () => {
    if (!playing || over || rolling) return;
    const cue = balls.current[0];
    const v = 120 + power * 380;
    cue.vx = Math.cos(aim) * v;
    cue.vy = Math.sin(aim) * v;
    rollingRef.current = true;
    setRolling(true);
    setShots((n) => n + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input")) return;
      if (e.code === "ArrowLeft") setAim((a) => a - 0.05);
      else if (e.code === "ArrowRight") setAim((a) => a + 0.05);
      else if (e.code === "ArrowUp") setPower((p) => Math.min(1, p + 0.05));
      else if (e.code === "ArrowDown") setPower((p) => Math.max(0.05, p - 0.05));
      else if (e.code === "Space" && !(e.target as HTMLElement).closest("button")) shoot();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <Frame title="Pool" sub="vs Big Lou · three in six shots" onClose={onClose} testid="pool" wide>
      <div className="flex flex-col gap-3">
        <canvas
          ref={canvas}
          width={W}
          height={H}
          className="w-full max-w-[520px] cursor-crosshair self-center rounded-[2px]"
          role="img"
          aria-label={`The pool table: ${sunk} of ${NEED} down, ${SHOTS - shots} shots left`}
          onPointerDown={(e) => {
            // click where you want the white to go
            const r = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - r.left) / r.width) * W;
            const y = ((e.clientY - r.top) / r.height) * H;
            const cue = balls.current[0];
            setAim(Math.atan2(y - cue.y, x - cue.x));
          }}
          data-testid="pool-table"
        />
        <p aria-live="polite" data-testid="pool-line">
          {line}
        </p>
        <p className="text-[17px] text-[#b9b09e]">
          {sunk}/{NEED} down · {SHOTS - shots} shots left · click the table (or ← →) to aim, ↑ ↓ power
        </p>
        {playing && !over ? (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex flex-1 items-center gap-2">
              <span className="text-[#b9b09e]">power</span>
              <input type="range" min={0.05} max={1} step={0.05} value={power} onChange={(e) => setPower(Number(e.target.value))} className="deck-range min-w-0 flex-1" style={{ ["--fill" as string]: `${power * 100}%` }} aria-label="Power" />
            </label>
            <button className={miniBtn} onClick={shoot} disabled={rolling} data-testid="pool-shoot">
              Shoot (Space)
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[#b9b09e]">bet</span>
            {[10, 25, 50].map((b) => (
              <button key={b} className={miniBtn} aria-pressed={bet === b} disabled={b > cash} onClick={() => setBet(b)}>
                ${b}
              </button>
            ))}
            <button className={miniBtn} onClick={start} disabled={cash < bet} data-testid="pool-start">
              {playing ? "Again" : "Rack them"}
            </button>
          </div>
        )}
      </div>
    </Frame>
  );
}
