import { create } from "zustand";
import { TRACKS, gridTempo, levelFor } from "@/data/tracks";
import { getAudioContext } from "@/lib/audioContext";
import { nextSimilar } from "@/lib/similar";

// One <audio> element lives for the whole visit (see AudioEngine), and
// everything that plays or shows music (the Beats window, the taskbar's
// compact player, the game) drives it through this store. Closing a window
// or opening the game never tears it down.
export type LoadStatus = "idle" | "loading" | "ready" | "error";

interface PlayerState {
  trackIndex: number;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  repeatOne: boolean;
  shuffle: boolean;
  /** After a beat, play the closest one by tempo and key (not the next in the list). */
  similar: boolean;
  /** Ids of the beats chosen this visit, oldest first (so "similar" doesn't ping-pong). */
  played: string[];
  /** A stretch of the beat playing over and over, in seconds, or null. */
  loop: { start: number; end: number } | null;
  status: LoadStatus;
  /** Track ids whose file failed to load this visit. */
  failed: string[];
  /** Who paused the music on the visitor's behalf (e.g. "game"), if anyone. */
  heldBy: string | null;
  resumeOnRelease: boolean;

  audio: HTMLAudioElement | null;
  analyser: AnalyserNode | null;
  ctx: AudioContext | null;

  attach: (el: HTMLAudioElement) => void;
  detach: (el: HTMLAudioElement) => void;
  sync: (partial: Partial<Pick<PlayerState, "playing" | "currentTime" | "duration" | "status">>) => void;
  markFailed: () => void;

  play: () => void;
  pause: () => void;
  toggle: () => void;
  selectTrack: (index: number, autoplay?: boolean) => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  toggleSimilar: () => void;
  /** Loop the 8 bars around the playhead (on the beat's own bar grid), or stop looping. */
  toggleLoop: () => void;
  /** Where the music goes next: an index, or -1 if that's down to chance (shuffle). */
  upNext: () => number;
  /** Seek to `seconds` as soon as the file's length is known (picking up where you left off). */
  resumeAt: (seconds: number) => void;
  /** The track ended: repeat it, or move on. */
  ended: () => void;
  /** Pause for someone else's sound; remembers whether to resume. */
  hold: (owner: string) => void;
  /** Give the music back: resumes only if it was playing when held. */
  release: (owner: string) => void;
}

const PREFS_KEY = "saeculo-player";

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

interface Prefs {
  volume: number;
  muted: boolean;
  repeatOne: boolean;
  shuffle: boolean;
  similar: boolean;
}

function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    // storage unavailable: the setting lasts for this visit
  }
}

function loadPrefs(): Prefs | null {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null");
    if (saved && typeof saved.volume === "number" && saved.volume >= 0 && saved.volume <= 1) {
      return {
        volume: saved.volume,
        muted: saved.muted === true,
        repeatOne: saved.repeatOne === true,
        shuffle: saved.shuffle === true,
        similar: saved.similar === true && saved.shuffle !== true,
      };
    }
  } catch {
    // corrupted or blocked storage: keep the defaults
  }
  return null;
}

// Where the visitor left off (beat and second), picked up on the next visit.
const POSITION_KEY = "saeculo-position";
export function savePosition() {
  const { audio, trackIndex } = usePlayerStore.getState();
  const track = TRACKS[trackIndex];
  if (!audio || !track) return;
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify({ id: track.id, t: Math.floor(audio.currentTime) }));
  } catch {
    // not remembered
  }
}
export function readPosition(): { index: number; t: number } | null {
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY) ?? "null");
    const index = TRACKS.findIndex((t) => t.id === saved?.id);
    if (index < 0) return null;
    return { index, t: typeof saved.t === "number" && saved.t > 0 ? saved.t : 0 };
  } catch {
    return null;
  }
}

/** Bars in a loop. */
export const LOOP_BARS = 8;

// The intro plays the music as if it leaked from someone's headphones:
// low-passed and quieter. 0 = clear, 1 = fully muffled. It lives in the
// player's own graph so the same song carries on, uninterrupted, when the
// intro hands over to the desktop. (No graph on iOS: it simply plays clear.)
let tone: BiquadFilterNode | null = null;
let bleed: GainNode | null = null;
let muffle = 0;
// Evens out the beats' loudness (see levelFor in data/tracks). Like the
// muffle, it needs the graph, so iPhones play every file as it is.
let level: GainNode | null = null;
function applyLevel(index: number) {
  if (level) level.gain.value = levelFor(TRACKS[index]);
}
// scripts/verify.mjs reads the gain in development
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __player?: unknown }).__player = {
    level: () => level?.gain.value ?? null,
    tracks: () => TRACKS.map((t) => ({ id: t.id, src: t.src, added: t.added ?? null, loudness: t.loudness ?? null, level: levelFor(t) })),
  };
}
function applyMuffle(ctx: BaseAudioContext, amount: number, seconds: number) {
  if (!tone || !bleed) return;
  const freq = 20000 * Math.pow(380 / 20000, amount);
  const at = ctx.currentTime;
  const k = Math.max(0.005, seconds / 3);
  tone.frequency.setTargetAtTime(freq, at, k);
  tone.Q.setTargetAtTime(0.7 + amount * 3, at, k);
  bleed.gain.setTargetAtTime(1 - amount * 0.45, at, k);
}
export function setMuffle(amount: number, seconds = 0.3) {
  muffle = Math.min(1, Math.max(0, amount));
  const { ctx } = usePlayerStore.getState();
  if (ctx) applyMuffle(ctx, muffle, seconds);
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  // createMediaElementSource may only be called once per element, so the
  // graph is built lazily on the first user-initiated play (which also
  // satisfies autoplay policy) and kept for the page's lifetime.
  const ensureGraph = () => {
    const { ctx, audio } = get();
    if (ctx) {
      if (ctx.state === "suspended") void ctx.resume();
      return;
    }
    // iOS suspends Web Audio when the screen locks, which would silence a
    // player routed through it; a plain <audio> keeps playing. The
    // analyser (kept, though nothing reads it now) stays null there.
    if (!audio || isIOS()) return;
    const context = getAudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.78;
    const source = context.createMediaElementSource(audio);
    tone = context.createBiquadFilter();
    tone.type = "lowpass";
    bleed = context.createGain();
    level = context.createGain();
    applyMuffle(context, muffle, 0);
    applyLevel(get().trackIndex);
    source.connect(tone).connect(bleed).connect(level).connect(analyser);
    analyser.connect(context.destination);
    set({ ctx: context, analyser });
  };

  const startPlayback = (audio: HTMLAudioElement) => {
    if (!TRACKS.length) return;
    ensureGraph();
    // anything the visitor starts cancels a pending "resume later"
    set({ heldBy: null, resumeOnRelease: false });
    audio.play().catch(() => {
      // interrupted by a newer load/pause, or the file is unavailable:
      // the media events resync the state
    });
  };

  const load = (audio: HTMLAudioElement, index: number) => {
    const track = TRACKS[index];
    if (!track) return;
    audio.src = track.src;
    applyLevel(index);
    audio.load();
  };

  return {
    trackIndex: 0,
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    muted: false,
    repeatOne: false,
    shuffle: false,
    similar: false,
    played: [],
    loop: null,
    status: "idle",
    failed: [],
    heldBy: null,
    resumeOnRelease: false,
    audio: null,
    analyser: null,
    ctx: null,

    attach: (el) => {
      // runs after mount, so restoring saved prefs can't break hydration
      const prefs = loadPrefs();
      const volume = prefs?.volume ?? get().volume;
      const muted = prefs?.muted ?? get().muted;
      if (!el.getAttribute("src") && TRACKS[get().trackIndex]) el.src = TRACKS[get().trackIndex].src;
      el.volume = volume;
      el.muted = muted;
      set({ audio: el, volume, muted, repeatOne: prefs?.repeatOne ?? false, shuffle: prefs?.shuffle ?? false, similar: prefs?.similar ?? false });
    },
    detach: (el) => {
      if (get().audio === el) set({ audio: null });
    },
    sync: (partial) => set(partial),
    markFailed: () => {
      const track = TRACKS[get().trackIndex];
      if (!track) return;
      set((s) => ({ status: "error", playing: false, failed: s.failed.includes(track.id) ? s.failed : [...s.failed, track.id] }));
    },

    play: () => {
      const { audio, heldBy } = get();
      // something else has the speakers (the game): play when it hands them back
      if (heldBy) return set({ resumeOnRelease: true });
      if (audio) startPlayback(audio);
    },
    pause: () => {
      set({ heldBy: null, resumeOnRelease: false });
      get().audio?.pause();
    },
    toggle: () => {
      const { audio, status } = get();
      if (!audio) return;
      if (get().heldBy) return set((s) => ({ resumeOnRelease: !s.resumeOnRelease }));
      if (status === "error") {
        // try the file again rather than sitting on a dead player
        load(audio, get().trackIndex);
        startPlayback(audio);
        return;
      }
      if (audio.paused) startPlayback(audio);
      else get().pause();
    },
    selectTrack: (index, autoplay = true) => {
      const { audio } = get();
      if (!TRACKS[index]) return;
      set((s) => ({
        trackIndex: index,
        currentTime: 0,
        duration: 0,
        status: "loading",
        loop: null,
        played: [...s.played.filter((id) => id !== TRACKS[index].id), TRACKS[index].id].slice(-50),
      }));
      if (!audio) return;
      load(audio, index);
      if (autoplay && get().heldBy) set({ resumeOnRelease: true });
      else if (autoplay) startPlayback(audio);
    },
    upNext: () => {
      const { shuffle, similar, trackIndex, played } = get();
      if (TRACKS.length < 2) return trackIndex;
      if (shuffle) return -1;
      if (similar) return nextSimilar(TRACKS, trackIndex, played);
      return (trackIndex + 1) % TRACKS.length;
    },
    next: () => {
      if (!TRACKS.length) return;
      const { shuffle, trackIndex } = get();
      const up = get().upNext();
      if (!shuffle && up >= 0) get().selectTrack(up);
      else if (shuffle && TRACKS.length > 1) {
        // anything but the one that's playing
        const pick = Math.floor(Math.random() * (TRACKS.length - 1));
        get().selectTrack(pick >= trackIndex ? pick + 1 : pick);
      } else get().selectTrack((trackIndex + 1) % TRACKS.length);
    },
    ended: () => {
      const { repeatOne, audio, loop } = get();
      // a loop that runs to the very end goes round again too
      if ((repeatOne || loop) && audio) {
        audio.currentTime = loop?.start ?? 0;
        startPlayback(audio);
      } else get().next();
    },
    prev: () => {
      const { audio, trackIndex } = get();
      if (!TRACKS.length) return;
      // like every desktop player: "previous" restarts the song unless
      // you're right at the start of it
      if (audio && audio.currentTime > 3) {
        audio.currentTime = 0;
        set({ currentTime: 0 });
        return;
      }
      get().selectTrack((trackIndex - 1 + TRACKS.length) % TRACKS.length);
    },
    seek: (seconds) => {
      const { audio } = get();
      if (!audio || !Number.isFinite(audio.duration)) return;
      const t = Math.min(Math.max(0, seconds), audio.duration);
      audio.currentTime = t;
      // going somewhere else in the beat lets go of the loop
      const { loop } = get();
      set({ currentTime: t, loop: loop && (t < loop.start - 0.05 || t > loop.end) ? null : loop });
    },
    setVolume: (volume) => {
      const { audio } = get();
      if (audio) {
        audio.volume = volume;
        if (volume > 0 && audio.muted) audio.muted = false;
      }
      const muted = volume > 0 ? false : get().muted;
      set({ volume, muted });
      savePrefs({ ...pick(get()), volume, muted });
    },
    toggleMute: () => {
      const muted = !get().muted;
      const { audio } = get();
      if (audio) audio.muted = muted;
      set({ muted });
      savePrefs({ ...pick(get()), muted });
    },
    toggleRepeat: () => {
      set({ repeatOne: !get().repeatOne });
      savePrefs(pick(get()));
    },
    toggleShuffle: () => {
      const shuffle = !get().shuffle;
      set({ shuffle, similar: shuffle ? false : get().similar });
      savePrefs(pick(get()));
    },
    toggleSimilar: () => {
      const similar = !get().similar;
      set({ similar, shuffle: similar ? false : get().shuffle });
      savePrefs(pick(get()));
    },
    toggleLoop: () => {
      const { audio, loop, trackIndex } = get();
      if (loop) return set({ loop: null });
      const track = TRACKS[trackIndex];
      if (!audio || !track || !Number.isFinite(audio.duration)) return;
      // whole bars on the beat's own grid, starting with the bar the playhead is in
      const bar = (4 * 60) / gridTempo(track);
      const offset = track.beatOffset ?? 0;
      const start = Math.max(0, offset + Math.floor((audio.currentTime - offset) / bar) * bar);
      const end = Math.min(audio.duration, start + LOOP_BARS * bar);
      if (end - start < bar) return;
      set({ loop: { start, end } });
    },
    resumeAt: (seconds) => {
      const { audio } = get();
      if (!audio || seconds <= 0) return;
      const go = () => {
        // a beat left in its last seconds starts over
        if (!Number.isFinite(audio.duration) || seconds >= audio.duration - 5) return;
        audio.currentTime = seconds;
        set({ currentTime: seconds });
      };
      if (audio.readyState >= 1) go();
      else audio.addEventListener("loadedmetadata", go, { once: true });
    },
    hold: (owner) => {
      const { audio, heldBy } = get();
      if (heldBy) return;
      const wasPlaying = !!audio && !audio.paused;
      audio?.pause();
      set({ heldBy: owner, resumeOnRelease: wasPlaying });
    },
    release: (owner) => {
      const { heldBy, resumeOnRelease, audio } = get();
      if (heldBy !== owner) return;
      set({ heldBy: null, resumeOnRelease: false });
      if (resumeOnRelease && audio) startPlayback(audio);
    },
  };
});

function pick(s: PlayerState): Prefs {
  return { volume: s.volume, muted: s.muted, repeatOne: s.repeatOne, shuffle: s.shuffle, similar: s.similar };
}

export function useCurrentTrack() {
  const index = usePlayerStore((s) => s.trackIndex);
  return TRACKS[index];
}
