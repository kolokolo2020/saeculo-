"use client";

import { useEffect, useRef } from "react";

const BAR_COUNT = 28;
export const VIZ_MODES = ["bars", "scope", "tunnel"] as const;
export type VizMode = (typeof VIZ_MODES)[number];

export default function Visualizer({
  analyserRef,
  active,
  mode,
}: {
  analyserRef: React.RefObject<AnalyserNode | null>;
  active: boolean;
  mode: VizMode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    ctx.scale(dpr, dpr);

    const peaks = new Float32Array(BAR_COUNT);
    const tunnelRings: number[] = [];
    let raf = 0;
    let t = 0;

    const barLevels = (): number[] => {
      const analyser = analyserRef.current;
      if (!(analyser && active)) return Array.from({ length: BAR_COUNT }, () => 0.02);
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      const usable = Math.floor(data.length * 0.7);
      const chunk = usable / BAR_COUNT;
      return Array.from({ length: BAR_COUNT }, (_, i) => {
        let sum = 0;
        const start = Math.floor(i * chunk);
        const end = Math.floor((i + 1) * chunk);
        for (let j = start; j < end; j++) sum += data[j];
        return sum / (end - start) / 255;
      });
    };

    const drawBars = () => {
      const gap = 2;
      const barWidth = (cssWidth - gap * (BAR_COUNT + 1)) / BAR_COUNT;
      const levels = barLevels();
      const gradient = ctx.createLinearGradient(0, cssHeight, 0, 0);
      gradient.addColorStop(0, "#00e5a0");
      gradient.addColorStop(0.55, "#ffe600");
      gradient.addColorStop(1, "#ff2d78");

      const segH = 4;
      const segGap = 2;
      for (let i = 0; i < BAR_COUNT; i++) {
        const x = gap + i * (barWidth + gap);
        const h = Math.max(2, levels[i] * (cssHeight - 8));
        ctx.fillStyle = gradient;
        for (let y = 0; y < h; y += segH + segGap) {
          ctx.fillRect(x, cssHeight - 4 - y - segH, barWidth, segH);
        }
        peaks[i] = Math.max(peaks[i] - 0.004, levels[i]);
        const peakY = cssHeight - 4 - peaks[i] * (cssHeight - 8);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, peakY - 2, barWidth, 2);
      }
    };

    const drawScope = () => {
      const analyser = analyserRef.current;
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#00e5a0";
      ctx.shadowColor = "#00e5a0";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      if (analyser && active) {
        const data = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(data);
        const step = cssWidth / data.length;
        for (let i = 0; i < data.length; i++) {
          const y = (data[i] / 255) * cssHeight;
          const x = i * step;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      } else {
        ctx.moveTo(0, cssHeight / 2);
        ctx.lineTo(cssWidth, cssHeight / 2);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const drawTunnel = () => {
      const levels = barLevels();
      const bass = (levels[0] + levels[1] + levels[2]) / 3;
      const cx = cssWidth / 2;
      const cy = cssHeight / 2;
      const maxR = Math.hypot(cx, cy);

      if (t % 3 === 0) tunnelRings.push(bass);
      if (tunnelRings.length > 26) tunnelRings.shift();

      for (let i = 0; i < tunnelRings.length; i++) {
        const progress = i / tunnelRings.length;
        const r = progress * maxR + tunnelRings[i] * 24;
        const hue = (t * 2 + i * 14) % 360;
        ctx.strokeStyle = `hsl(${hue}, 90%, ${55 + tunnelRings[i] * 20}%)`;
        ctx.lineWidth = 1.5 + tunnelRings[i] * 3;
        ctx.beginPath();
        const sides = 8;
        for (let s = 0; s <= sides; s++) {
          const angle = (s / sides) * Math.PI * 2 + t * 0.01;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r * 0.6;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      t++;
      ctx.fillStyle = modeRef.current === "tunnel" ? "rgba(10,10,20,0.35)" : "#0a0a14";
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      if (modeRef.current === "bars") drawBars();
      else if (modeRef.current === "scope") drawScope();
      else drawTunnel();
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyserRef, active]);

  return (
    <canvas
      ref={canvasRef}
      className="bevel-in h-32 w-full bg-[#0a0a14]"
      aria-label="Audio visualizer"
      role="img"
    />
  );
}
