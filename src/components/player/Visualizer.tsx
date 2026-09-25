"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore } from "./playerStore";

export const VIZ_MODES = ["aurora", "bars", "scope"] as const;
export type VizMode = (typeof VIZ_MODES)[number];
export const VIZ_LABEL: Record<VizMode, string> = {
  aurora: "Aurora",
  bars: "Bars & Waves",
  scope: "Scope",
};

const BAR_COUNT = 32;

// Live visualizer for whatever the global player is playing. It reads the
// analyser straight off the store inside its own rAF loop, so it never
// re-renders React per frame; `mode` and `playing` only restart the loop.
export default function Visualizer({
  mode,
  playing,
  reducedMotion,
  className = "h-40",
}: {
  mode: VizMode;
  playing: boolean;
  reducedMotion: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, w * dpr);
      canvas.height = Math.max(1, h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const freq = new Uint8Array(256);
    const wave = new Uint8Array(512);
    const peaks = new Float32Array(BAR_COUNT);
    let t = 0;
    let raf = 0;

    // Returns 0..1 band energies. When nothing is playing, a slow synthetic
    // swell stands in so the canvas breathes instead of sitting dead.
    const bands = () => {
      const analyser = usePlayerStore.getState().analyser;
      if (analyser && playing) {
        analyser.getByteFrequencyData(freq);
        const avg = (from: number, to: number) => {
          let sum = 0;
          for (let i = from; i < to; i++) sum += freq[i];
          return sum / (to - from) / 255;
        };
        return { bass: avg(1, 8), mid: avg(8, 40), high: avg(40, 120), live: true };
      }
      const s = (Math.sin(t * 0.02) + 1) / 2;
      return { bass: 0.12 + s * 0.1, mid: 0.08 + s * 0.06, high: 0.05, live: false };
    };

    const drawAurora = () => {
      ctx.fillStyle = "rgba(3, 10, 22, 0.22)";
      ctx.fillRect(0, 0, w, h);
      const { bass, mid, high } = bands();
      ctx.globalCompositeOperation = "lighter";
      const ribbons = [
        { color: [80, 255, 180], amp: 0.22 + bass * 0.5, speed: 0.011, freq: 0.006, y: 0.55, width: 10 + bass * 26 },
        { color: [70, 180, 255], amp: 0.18 + mid * 0.6, speed: 0.016, freq: 0.009, y: 0.45, width: 8 + mid * 22 },
        { color: [160, 120, 255], amp: 0.12 + high * 0.7, speed: 0.023, freq: 0.014, y: 0.6, width: 5 + high * 16 },
      ];
      for (const r of ribbons) {
        const [cr, cg, cb] = r.color;
        for (let layer = 0; layer < 3; layer++) {
          ctx.beginPath();
          for (let x = 0; x <= w; x += 6) {
            const y =
              h * r.y +
              Math.sin(x * r.freq + t * r.speed + layer * 0.6) * h * r.amp * 0.5 +
              Math.sin(x * r.freq * 2.3 - t * r.speed * 1.4) * h * r.amp * 0.18;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.16 - layer * 0.04})`;
          ctx.lineWidth = r.width * (1 + layer * 0.9);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const drawBars = () => {
      ctx.clearRect(0, 0, w, h);
      const analyser = usePlayerStore.getState().analyser;
      let levels: number[];
      if (analyser && playing) {
        analyser.getByteFrequencyData(freq);
        const usable = Math.floor(freq.length * 0.6);
        const chunk = usable / BAR_COUNT;
        levels = Array.from({ length: BAR_COUNT }, (_, i) => {
          let sum = 0;
          const start = Math.floor(i * chunk);
          const end = Math.max(start + 1, Math.floor((i + 1) * chunk));
          for (let j = start; j < end; j++) sum += freq[j];
          return sum / (end - start) / 255;
        });
      } else {
        levels = Array.from({ length: BAR_COUNT }, (_, i) => 0.04 + ((Math.sin(t * 0.03 + i * 0.4) + 1) / 2) * 0.05);
      }
      const floor = h * 0.72;
      const gap = 2;
      const barW = (w - gap * (BAR_COUNT + 1)) / BAR_COUNT;
      const grad = ctx.createLinearGradient(0, floor, 0, 0);
      grad.addColorStop(0, "#0b4fb3");
      grad.addColorStop(0.55, "#39a6ff");
      grad.addColorStop(1, "#d8f1ff");
      for (let i = 0; i < BAR_COUNT; i++) {
        const x = gap + i * (barW + gap);
        const bh = Math.max(2, levels[i] * (floor - 6));
        ctx.fillStyle = grad;
        ctx.fillRect(x, floor - bh, barW, bh);
        // gloss: a lighter left half-highlight on each bar
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(x, floor - bh, barW * 0.45, bh);
        // mirrored reflection on the "glass floor"
        ctx.fillStyle = "rgba(57,166,255,0.18)";
        ctx.fillRect(x, floor + 2, barW, bh * 0.35);
        peaks[i] = Math.max(peaks[i] - 0.006, levels[i]);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, floor - peaks[i] * (floor - 6) - 3, barW, 2);
      }
      const fade = ctx.createLinearGradient(0, floor, 0, h);
      fade.addColorStop(0, "rgba(3,7,15,0)");
      fade.addColorStop(1, "rgba(3,7,15,1)");
      ctx.fillStyle = fade;
      ctx.fillRect(0, floor, w, h - floor);
    };

    const drawScope = () => {
      ctx.fillStyle = "rgba(3, 10, 22, 0.35)";
      ctx.fillRect(0, 0, w, h);
      const analyser = usePlayerStore.getState().analyser;
      const mid = h / 2;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#7fe0ff";
      ctx.shadowColor = "#39a6ff";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      if (analyser && playing) {
        analyser.getByteTimeDomainData(wave);
        const step = w / wave.length;
        for (let i = 0; i < wave.length; i++) {
          const y = mid + ((wave[i] - 128) / 128) * mid * 0.9;
          if (i === 0) ctx.moveTo(0, y);
          else ctx.lineTo(i * step, y);
        }
      } else {
        for (let x = 0; x <= w; x += 4) {
          const y = mid + Math.sin(x * 0.02 + t * 0.03) * mid * 0.12;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const frame = () => {
      t++;
      if (mode === "aurora") drawAurora();
      else if (mode === "bars") drawBars();
      else drawScope();
    };

    if (reducedMotion) {
      ctx.fillStyle = "#03070f";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 30; i++) frame();
    } else {
      const loop = () => {
        raf = requestAnimationFrame(loop);
        frame();
      };
      loop();
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [mode, playing, reducedMotion]);

  return <canvas ref={canvasRef} className={`block w-full ${className}`} aria-label="Audio visualizer" role="img" />;
}
