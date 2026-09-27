// Decoded audio files, cached per AudioContext so the same file is only
// fetched and decoded once (Beat Deck's chops slice saeculo's tracks).
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
