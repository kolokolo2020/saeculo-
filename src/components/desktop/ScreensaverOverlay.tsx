"use client";

import { useEffect, useRef } from "react";
import { PROFILE } from "@/data/profile";

const COLORS = ["#ff9a2e", "#4fd6c4"];
const STAR_COUNT = 60;

export default function ScreensaverOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fontProbeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const probe = fontProbeRef.current;
    if (!canvas || !probe) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // canvas ctx.font can't resolve CSS custom properties, so read the
    // real generated font-family off a hidden DOM element wearing the
    // same .font-readout class instead.
    const readoutFontFamily = window.getComputedStyle(probe).fontFamily;
    const fontAt = (size: number) => `${size}px ${readoutFontFamily}`;

    const dpr = window.devicePixelRatio || 1;
    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const onResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    };
    window.addEventListener("resize", onResize);

    const label = PROFILE.artistName;
    const fontSize = 42;
    ctx.font = fontAt(fontSize);
    const textW = ctx.measureText(label).width;
    const textH = fontSize;

    let x = Math.random() * Math.max(1, w - textW);
    let y = Math.random() * Math.max(1, h - textH);
    let vx = 2.2 * (Math.random() < 0.5 ? -1 : 1);
    let vy = 2.2 * (Math.random() < 0.5 ? -1 : 1);
    let colorIndex = 0;

    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 1.6 + 0.4,
    }));

    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      ctx.fillStyle = "#0b0c09";
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "rgba(241,234,217,0.5)";
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x += w;
        if (s.x > w) s.x -= w;
        if (s.y < 0) s.y += h;
        if (s.y > h) s.y -= h;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      x += vx;
      y += vy;
      let bounced = false;
      if (x <= 0 || x + textW >= w) {
        vx *= -1;
        x = Math.max(0, Math.min(x, w - textW));
        bounced = true;
      }
      if (y <= 0 || y + textH >= h) {
        vy *= -1;
        y = Math.max(0, Math.min(y, h - textH));
        bounced = true;
      }
      if (bounced) colorIndex = (colorIndex + 1) % COLORS.length;

      const color = COLORS[colorIndex];
      ctx.font = fontAt(fontSize);
      ctx.textBaseline = "top";
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = color;
      ctx.fillText(label, x, y);
      ctx.shadowBlur = 0;
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      role="status"
      aria-label="Screensaver active — move mouse or press any key to return"
      className="fixed inset-0 z-[9990] bg-void"
    >
      <span ref={fontProbeRef} className="font-readout invisible absolute" aria-hidden>
        A
      </span>
      <canvas ref={canvasRef} className="h-full w-full" aria-hidden />
      <p className="font-readout absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-ink/40">
        tape idle — move or press any key
      </p>
    </div>
  );
}
