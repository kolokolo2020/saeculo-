"use client";

import { useEffect, useRef } from "react";

const BAR_COUNT = 28;

export default function Visualizer({
  analyserRef,
  active,
}: {
  analyserRef: React.RefObject<AnalyserNode | null>;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      ctx.fillStyle = "#0a0a14";
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      const analyser = analyserRef.current;
      const gap = 2;
      const barWidth = (cssWidth - gap * (BAR_COUNT + 1)) / BAR_COUNT;
      let levels: number[];

      if (analyser && active) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        // use the lower ~70% of bins — the top end of the spectrum is
        // usually empty and flattens the display
        const usable = Math.floor(data.length * 0.7);
        const chunk = usable / BAR_COUNT;
        levels = Array.from({ length: BAR_COUNT }, (_, i) => {
          let sum = 0;
          const start = Math.floor(i * chunk);
          const end = Math.floor((i + 1) * chunk);
          for (let j = start; j < end; j++) sum += data[j];
          return sum / (end - start) / 255;
        });
      } else {
        levels = Array.from({ length: BAR_COUNT }, () => 0.02);
      }

      const gradient = ctx.createLinearGradient(0, cssHeight, 0, 0);
      gradient.addColorStop(0, "#00e5a0");
      gradient.addColorStop(0.55, "#ffe600");
      gradient.addColorStop(1, "#ff2d78");

      const segH = 4;
      const segGap = 2;
      for (let i = 0; i < BAR_COUNT; i++) {
        const x = gap + i * (barWidth + gap);
        const h = Math.max(2, levels[i] * (cssHeight - 8));
        // draw as stacked LED segments for the retro EQ look
        ctx.fillStyle = gradient;
        for (let y = 0; y < h; y += segH + segGap) {
          ctx.fillRect(x, cssHeight - 4 - y - segH, barWidth, segH);
        }
        // peak-hold cap with slow decay
        peaks[i] = Math.max(peaks[i] - 0.004, levels[i]);
        const peakY = cssHeight - 4 - peaks[i] * (cssHeight - 8);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, peakY - 2, barWidth, 2);
      }
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
