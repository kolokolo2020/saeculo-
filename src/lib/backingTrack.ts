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

/**
 * Start a buffer looping at an exact AudioContext time. With a grid, playback
 * starts at the first beat (`offset` seconds into the file) and loops a whole
 * number of bars from there, so the seam stays on the beat.
 */
export function startLoop(
  ctx: AudioContext,
  buffer: AudioBuffer,
  when: number,
  gain = 0.6,
  grid?: { bpm: number; offset: number },
) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const offset = grid?.offset ?? 0;
  if (grid) {
    const bar = (60 / grid.bpm) * 4;
    const bars = Math.floor((buffer.duration - offset) / bar);
    if (bars > 0) {
      source.loopStart = offset;
      source.loopEnd = offset + bars * bar;
    }
  }
  const amp = ctx.createGain();
  amp.gain.value = gain;
  source.connect(amp).connect(ctx.destination);
  source.start(when, offset);
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
