"use client";

import { useEffect, useRef } from "react";

// The master output, drawn live: a faint spectrum behind a glowing
// oscilloscope trace. Flatlines when stopped.
export default function GrooveScope({ analyser, playing }: { analyser: () => AnalyserNode | null; playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext("2d");
    if (!g) return;
    let raf = 0;
    let wave: Uint8Array<ArrayBuffer> | null = null;
    let freq: Uint8Array<ArrayBuffer> | null = null;
    let gain = 1;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);

      // graticule
      g.strokeStyle = "rgba(127,224,255,0.07)";
      g.lineWidth = 1;
      for (let x = 0; x <= w; x += w / 8) {
        g.beginPath();
        g.moveTo(Math.round(x) + 0.5, 0);
        g.lineTo(Math.round(x) + 0.5, h);
        g.stroke();
      }
      for (let y = 0; y <= h; y += h / 4) {
        g.beginPath();
        g.moveTo(0, Math.round(y) + 0.5);
        g.lineTo(w, Math.round(y) + 0.5);
        g.stroke();
      }

      const an = playing ? analyser() : null;
      if (an) {
        if (!wave || wave.length !== an.fftSize) wave = new Uint8Array(an.fftSize);
        if (!freq || freq.length !== an.frequencyBinCount) freq = new Uint8Array(an.frequencyBinCount);
        an.getByteTimeDomainData(wave);
        an.getByteFrequencyData(freq);
        // spectrum: 48 log-spaced bars
        const bars = 48;
        const bw = w / bars;
        for (let i = 0; i < bars; i++) {
          const lo = Math.floor(Math.pow(freq.length, i / bars));
          const hi = Math.max(lo + 1, Math.floor(Math.pow(freq.length, (i + 1) / bars)));
          let m = 0;
          for (let k = lo; k < hi && k < freq.length; k++) m = Math.max(m, freq[k]);
          const bh = (m / 255) * h * 0.9;
          const grad = g.createLinearGradient(0, h, 0, h - bh);
          grad.addColorStop(0, "rgba(42,140,240,0.35)");
          grad.addColorStop(1, "rgba(127,224,255,0.05)");
          g.fillStyle = grad;
          g.fillRect(i * bw + 1, h - bh, bw - 2, bh);
        }
      }

      // the trace
      if (an && wave) {
        let peak = 0;
        for (let i = 0; i < wave.length; i++) peak = Math.max(peak, Math.abs(wave[i] - 128) / 128);
        gain += (Math.min(5, 0.85 / Math.max(peak, 0.02)) - gain) * 0.08;
      }
      g.beginPath();
      const n = 256;
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * w;
        let v = 0;
        if (an && wave) {
          // quiet passages (a lone hat) still read: the trace auto-gains
          v = Math.max(-1, Math.min(1, ((wave[Math.floor((i / n) * wave.length)] - 128) / 128) * gain));
        }
        const y = h / 2 - v * (h / 2) * 0.92;
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.strokeStyle = "#7fe0ff";
      g.lineWidth = 1.5;
      g.shadowColor = "rgba(127,224,255,0.9)";
      g.shadowBlur = 6;
      g.stroke();
      g.shadowBlur = 0;

      if (playing) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [analyser, playing]);

  return <canvas ref={canvasRef} role="img" aria-label="Output scope" className="block h-full w-full" />;
}
