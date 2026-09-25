"use client";

import { useEffect, useRef } from "react";
import { PROFILE } from "@/data/profile";

const BUBBLE_COUNT = 13;

interface Bubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
  label?: string;
}

// Soap bubbles drifting and bouncing over the dimmed desktop — one of them
// carries the saeculo wordmark. Idle-triggered, or on demand via "Lock".
export default function ScreensaverOverlay({ onDismiss }: { onDismiss?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fontProbeRef = useRef<HTMLSpanElement>(null);

  // Lock mode needs its own dismissal (the idle timer only covers the
  // idle case). Armed after a beat so the click that locked the screen
  // doesn't immediately unlock it.
  useEffect(() => {
    if (!onDismiss) return;
    const events = ["pointermove", "pointerdown", "keydown", "touchstart", "wheel"] as const;
    const arm = setTimeout(() => {
      events.forEach((ev) => window.addEventListener(ev, onDismiss, { passive: true }));
    }, 700);
    return () => {
      clearTimeout(arm);
      events.forEach((ev) => window.removeEventListener(ev, onDismiss));
    };
  }, [onDismiss]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const probe = fontProbeRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !probe || !ctx) return;

    // canvas ctx.font can't resolve CSS custom properties, so read the real
    // font-family off a hidden element wearing the same class.
    const fontFamily = window.getComputedStyle(probe).fontFamily;
    const dpr = window.devicePixelRatio || 1;
    let w = 0;
    let h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const bubbles: Bubble[] = Array.from({ length: BUBBLE_COUNT }, (_, i) => {
      const r = i === 0 ? 92 : 28 + Math.random() * 54;
      return {
        x: r + Math.random() * Math.max(1, w - r * 2),
        y: r + Math.random() * Math.max(1, h - r * 2),
        vx: (Math.random() - 0.5) * 2.2,
        vy: (Math.random() - 0.5) * 2.2,
        r,
        hue: Math.random() * 360,
        label: i === 0 ? PROFILE.artistName : undefined,
      };
    });

    const drawBubble = (b: Bubble) => {
      // faint body
      const body = ctx.createRadialGradient(b.x, b.y, b.r * 0.2, b.x, b.y, b.r);
      body.addColorStop(0, "rgba(255,255,255,0.02)");
      body.addColorStop(0.8, "rgba(180,220,255,0.06)");
      body.addColorStop(1, "rgba(255,255,255,0.22)");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      // iridescent rim
      const rim = ctx.createLinearGradient(b.x - b.r, b.y - b.r, b.x + b.r, b.y + b.r);
      rim.addColorStop(0, `hsla(${b.hue},90%,70%,0.75)`);
      rim.addColorStop(0.5, `hsla(${(b.hue + 120) % 360},90%,70%,0.55)`);
      rim.addColorStop(1, `hsla(${(b.hue + 240) % 360},90%,70%,0.75)`);
      ctx.strokeStyle = rim;
      ctx.lineWidth = 2;
      ctx.stroke();
      // specular highlight
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.ellipse(b.x - b.r * 0.38, b.y - b.r * 0.42, b.r * 0.22, b.r * 0.1, -0.7, 0, Math.PI * 2);
      ctx.fill();
      if (b.label) {
        ctx.font = `600 ${Math.round(b.r * 0.34)}px ${fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.shadowColor = "rgba(120,200,255,0.9)";
        ctx.shadowBlur = 12;
        ctx.fillText(b.label, b.x, b.y);
        ctx.shadowBlur = 0;
      }
    };

    let raf = 0;
    const step = () => {
      raf = requestAnimationFrame(step);
      ctx.clearRect(0, 0, w, h);
      for (const b of bubbles) {
        b.x += b.vx;
        b.y += b.vy;
        b.hue = (b.hue + 0.4) % 360;
        if (b.x < b.r || b.x > w - b.r) {
          b.vx *= -1;
          b.x = Math.max(b.r, Math.min(w - b.r, b.x));
        }
        if (b.y < b.r || b.y > h - b.r) {
          b.vy *= -1;
          b.y = Math.max(b.r, Math.min(h - b.r, b.y));
        }
      }
      // elastic bounces between bubbles (equal mass: swap normal velocities)
      for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
          const a = bubbles[i];
          const b = bubbles[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          const min = a.r + b.r;
          if (dist > 0 && dist < min) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (min - dist) / 2;
            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;
            const va = a.vx * nx + a.vy * ny;
            const vb = b.vx * nx + b.vy * ny;
            if (va - vb > 0) {
              a.vx += (vb - va) * nx;
              a.vy += (vb - va) * ny;
              b.vx += (va - vb) * nx;
              b.vy += (va - vb) * ny;
            }
          }
        }
      }
      bubbles.forEach(drawBubble);
    };
    step();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      role="status"
      aria-label="Screensaver active — move mouse or press any key to return"
      className="fixed inset-0 z-[9990] bg-[rgba(2,10,28,0.35)]"
    >
      <span ref={fontProbeRef} className="font-ui invisible absolute" aria-hidden>
        A
      </span>
      <canvas ref={canvasRef} className="h-full w-full" aria-hidden />
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[12px] text-white/50">
        move the mouse or press any key
      </p>
    </div>
  );
}
