// Decoded track buffers for the rhythm games, cached per AudioContext so a
// rematch doesn't re-fetch and re-decode the same file.
const cache = new WeakMap<AudioContext, Map<string, Promise<AudioBuffer>>>();

export function loadBuffer(ctx: AudioContext, src: string): Promise<AudioBuffer> {
  let byCtx = cache.get(ctx);
  if (!byCtx) {
    byCtx = new Map();
    cache.set(ctx, byCtx);
  }
  let pending = byCtx.get(src);
  if (!pending) {
    pending = fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`failed to load ${src}`);
        return r.arrayBuffer();
      })
      .then((data) => ctx.decodeAudioData(data));
    // don't cache failures — let the next attempt retry
    pending.catch(() => byCtx?.delete(src));
    byCtx.set(src, pending);
  }
  return pending;
}

/** Start a buffer looping at an exact AudioContext time. */
export function startLoop(ctx: AudioContext, buffer: AudioBuffer, when: number, gain = 0.6) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const amp = ctx.createGain();
  amp.gain.value = gain;
  source.connect(amp).connect(ctx.destination);
  source.start(when);
  return {
    stop() {
      try {
        amp.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        source.stop(ctx.currentTime + 0.3);
      } catch {
        // already stopped
      }
    },
  };
}
