"use client";

import { useCallback, useEffect, useRef } from "react";

// createMediaElementSource may only be called once per <audio> element for its
// lifetime, and Strict Mode double-invokes effects in dev — so graph setup is
// idempotent (ref-guarded) and only torn down on true unmount.
export function useAudioAnalyser(audioRef: React.RefObject<HTMLAudioElement | null>) {
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const ensureGraph = useCallback(() => {
    if (ctxRef.current) {
      if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
      return analyserRef.current;
    }
    const el = audioRef.current;
    if (!el) return null;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;
    const source = ctx.createMediaElementSource(el);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    ctxRef.current = ctx;
    analyserRef.current = analyser;
    return analyser;
  }, [audioRef]);

  useEffect(() => {
    return () => {
      void ctxRef.current?.close();
      ctxRef.current = null;
      analyserRef.current = null;
    };
  }, []);

  return { ensureGraph, analyserRef };
}
