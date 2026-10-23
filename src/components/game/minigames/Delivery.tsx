"use client";

import { useEffect, useRef, useState } from "react";
import Frame, { miniBtn } from "./Frame";

// A delivery run for the corner store, on the shop's bike: three lanes up
// a wet road at night. Switch lanes (← →, or tap a side of the road) to
// pick up the bags and miss the cars and the puddles. Three knocks and the
// run's over; get to the end and the clerk pays per bag delivered.

const W = 150;
const H = 220;
const LANES = [30, 75, 120];
const RUN = 40; // seconds of road

type Kind = "car" | "puddle" | "bag";
interface Thing {
  lane: number;
  y: number;
  kind: Kind;
  hit?: boolean;
}

export default function Delivery({ reduced, onFinish, onClose }: { reduced: boolean; onFinish: (bags: number, made: boolean) => void; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"ready" | "ride" | "done">("ready");
  const [bags, setBags] = useState(0);
  const [knocks, setKnocks] = useState(0);
  const [line, setLine] = useState("The clerk pushes the shop's bike at you. “Bags on the road. Don't scratch it.”");
  const lane = useRef(1);
  const game = useRef({ t: 0, things: [] as Thing[], next: 0.8, bags: 0, knocks: 0, flash: 0, scroll: 0 });
  // the latest handler, for the loop (it's made fresh every render)
  const finish = useRef(onFinish);
  useEffect(() => {
    finish.current = onFinish;
  });

  const move = (d: number) => {
    lane.current = Math.max(0, Math.min(2, lane.current + d));
  };

  useEffect(() => {
    if (phase !== "ride") return;
    const g = canvas.current?.getContext("2d");
    if (!g) return;
    const s = game.current;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      s.t += dt;
      // the road speeds up as you go
      const speed = 70 + s.t * 2.2;
      s.scroll = (s.scroll + speed * dt) % 20;
      s.next -= dt;
      if (s.next <= 0 && s.t < RUN - 2) {
        const r = Math.random();
        s.things.push({ lane: Math.floor(Math.random() * 3), y: -20, kind: r < 0.35 ? "bag" : r < 0.75 ? "car" : "puddle" });
        s.next = Math.max(0.45, 1.1 - s.t * 0.015) * (0.7 + Math.random() * 0.6);
      }
      const meY = H - 34;
      for (const th of s.things) {
        th.y += speed * dt * (th.kind === "car" ? 1.35 : 1);
        if (!th.hit && th.lane === lane.current && Math.abs(th.y - meY) < (th.kind === "car" ? 18 : 10)) {
          th.hit = true;
          if (th.kind === "bag") {
            s.bags++;
            setBags(s.bags);
          } else {
            s.knocks++;
            s.flash = 0.35;
            setKnocks(s.knocks);
          }
        }
      }
      s.things = s.things.filter((th) => th.y < H + 30 && !(th.hit && th.kind === "bag"));
      s.flash = Math.max(0, s.flash - dt);
      if (s.knocks >= 3 || s.t >= RUN) {
        const made = s.knocks < 3;
        setPhase("done");
        setLine(made ? `Back at the shop with ${s.bags} ${s.bags === 1 ? "bag" : "bags"} delivered. The clerk counts it out.` : `Third knock. You walk the bike back. ${s.bags} ${s.bags === 1 ? "bag" : "bags"} got there, at least.`);
        finish.current(s.bags, made);
        return;
      }
      // draw: the road, the lane lines going by, the things on it, you
      g.fillStyle = "#1b1c22";
      g.fillRect(0, 0, W, H);
      g.fillStyle = "#26272e";
      g.fillRect(0, 0, 8, H);
      g.fillRect(W - 8, 0, 8, H);
      g.fillStyle = "#d0a020";
      for (const x of [52, 98]) for (let y = -20 + (reduced ? 0 : s.scroll); y < H; y += 20) g.fillRect(x, y, 2, 10);
      for (const th of s.things) {
        const x = LANES[th.lane];
        if (th.kind === "car") {
          g.fillStyle = "#6e1f18";
          g.fillRect(x - 10, th.y - 16, 20, 32);
          g.fillStyle = "#26303c";
          g.fillRect(x - 7, th.y - 6, 14, 8);
          g.fillStyle = "#ffe9a8";
          g.fillRect(x - 8, th.y + 13, 4, 2);
          g.fillRect(x + 4, th.y + 13, 4, 2);
        } else if (th.kind === "puddle") {
          g.fillStyle = "#3a4260";
          g.fillRect(x - 11, th.y - 4, 22, 8);
        } else {
          g.fillStyle = "#c9b38a";
          g.fillRect(x - 5, th.y - 6, 10, 12);
          g.fillStyle = "#8a7050";
          g.fillRect(x - 3, th.y - 8, 6, 3);
        }
      }
      const x = LANES[lane.current];
      g.fillStyle = s.flash > 0 && !reduced ? "#ffffff" : "#2a4a7a";
      g.fillRect(x - 3, meY - 12, 6, 24);
      g.fillStyle = "#111216";
      g.fillRect(x - 2, meY - 16, 4, 5);
      g.fillRect(x - 2, meY + 11, 4, 5);
      g.fillStyle = "#e8e0cf";
      g.fillRect(x - 3, meY - 8, 6, 5);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "ride") return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") move(-1);
      else if (e.code === "ArrowRight" || e.code === "KeyD") move(1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const start = () => {
    game.current = { t: 0, things: [], next: 0.8, bags: 0, knocks: 0, flash: 0, scroll: 0 };
    lane.current = 1;
    setBags(0);
    setKnocks(0);
    setPhase("ride");
    setLine("Go.");
  };

  return (
    <Frame title="Delivery run" sub="bags in, cars out" onClose={onClose} testid="delivery">
      <div className="flex flex-col items-center gap-3">
        <canvas
          ref={canvas}
          width={W}
          height={H}
          className={`pixel h-[330px] w-[225px] rounded-[2px] ${phase === "ride" ? "" : "opacity-60"}`}
          role="img"
          aria-label={`The road: ${bags} bags, ${knocks} of 3 knocks`}
          onPointerDown={(e) => {
            // tap the left or right of the road to move over
            const r = e.currentTarget.getBoundingClientRect();
            move(e.clientX - r.left < r.width / 2 ? -1 : 1);
          }}
          data-testid="delivery-road"
        />
        <p className="text-[17px] text-[#b9b09e]">
          bags {bags} · knocks {knocks}/3 · ← → (or tap a side) to change lanes
        </p>
        <p aria-live="polite" data-testid="delivery-line">
          {line}
        </p>
        {phase !== "ride" && (
          <button className={miniBtn} onClick={start} data-testid="delivery-start" data-autofocus>
            {phase === "ready" ? "Ride" : "Another run"}
          </button>
        )}
      </div>
    </Frame>
  );
}
