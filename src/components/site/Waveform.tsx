"use client";

import { useEffect, useRef } from "react";

// The site's signature element: a live oscilloscope ribbon that reacts to
// whatever is playing anywhere on the page. Idle, it breathes with a slow
// synthesized swell instead of sitting flat — the page should always feel
// like it's listening for something.
export default function Waveform({
  analyserRef,
  active,
  reducedMotion,
}: {
  analyserRef: React.RefObject<AnalyserNode | null>;
  active: boolean;
  reducedMotion: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;
    let cssWidth = 0;
    let cssHeight = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      cssWidth = canvas.clientWidth;
      cssHeight = canvas.clientHeight;
      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const drawIdle = () => {
      const mid = cssHeight / 2;
      ctx.beginPath();
      for (let x = 0; x <= cssWidth; x += 4) {
        const y =
          mid +
          Math.sin(x * 0.012 + t * 0.02) * (mid * 0.22) +
          Math.sin(x * 0.004 + t * 0.011) * (mid * 0.12);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    // Worn-tape pitch wobble: a slow, low-amplitude sine drift applied to
    // every sample so the line never sits perfectly still, like a cassette
    // that's a little stretched.
    const warp = (x: number) => Math.sin(t * 0.018 + x * 0.01) * (cssHeight * 0.015);

    const drawActive = () => {
      const analyser = analyserRef.current;
      const mid = cssHeight / 2;
      if (!analyser) {
        drawIdle();
        return;
      }
      const data = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(data);
      const step = cssWidth / data.length;
      ctx.beginPath();
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        const x = i * step;
        const y = mid + v * mid * 0.85 + warp(x);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    const gradient = () => {
      const g = ctx.createLinearGradient(0, 0, cssWidth, 0);
      g.addColorStop(0, "#4fd6c4");
      g.addColorStop(0.5, "#ff9a2e");
      g.addColorStop(1, "#4fd6c4");
      return g;
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      t++;
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.strokeStyle = gradient();
      ctx.shadowColor = active ? "#ff9a2e" : "#4fd6c4";
      ctx.shadowBlur = active ? 14 : 6;
      if (active) drawActive();
      else drawIdle();
    };

    if (reducedMotion) {
      // Draw a single static frame instead of a running rAF loop.
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.lineWidth = 2;
      ctx.strokeStyle = gradient();
      const mid = cssHeight / 2;
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(cssWidth, mid);
      ctx.stroke();
    } else {
      draw();
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [analyserRef, active, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="h-32 w-full sm:h-40"
      aria-hidden
      role="presentation"
    />
  );
}
