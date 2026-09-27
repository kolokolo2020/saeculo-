import { create } from "zustand";
import { TRACKS } from "@/data/tracks";
import { getAudioContext } from "@/lib/audioContext";

// One <audio> element lives for the whole session (see AudioEngine), and
// everything that plays or shows music — the media player window, the
// sidebar Now Playing gadget, the taskbar tray — drives it through this
// store. Closing the player window no longer stops the music.
interface PlayerState {
  trackIndex: number;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  repeatOne: boolean;

  // Imperative handles. Never rendered from — visualizers read them inside
  // their own animation loops via getState().
  audio: HTMLAudioElement | null;
  analyser: AnalyserNode | null;
  ctx: AudioContext | null;

  attach: (el: HTMLAudioElement) => void;
  detach: (el: HTMLAudioElement) => void;
  sync: (partial: Partial<Pick<PlayerState, "playing" | "currentTime" | "duration">>) => void;

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
}

const PREFS_KEY = "saeculo-player";

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  // iPadOS reports itself as a Mac
  (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

function savePrefs(volume: number, muted: boolean) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ volume, muted }));
  } catch {
    // storage unavailable — the setting lasts for this visit
  }
}

function loadPrefs(): { volume: number; muted: boolean } | null {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null");
    if (saved && typeof saved.volume === "number" && saved.volume >= 0 && saved.volume <= 1) {
      return { volume: saved.volume, muted: saved.muted === true };
    }
  } catch {
    // corrupted or blocked storage — keep the defaults
  }
  return null;
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  // createMediaElementSource may only be called once per element, so the
  // graph is built lazily on the first user-initiated play (which also
  // satisfies autoplay policy) and then kept for the page's lifetime.
  const ensureGraph = () => {
    const { ctx, audio } = get();
    if (ctx) {
      if (ctx.state === "suspended") void ctx.resume();
      return;
    }
    // iOS suspends Web Audio when the screen locks, which would silence a
    // player routed through it; a plain <audio> keeps playing in the
    // background. The visualizers fall back to a tempo-synced spectrum.
    if (!audio || isIOS()) return;
    const context = getAudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;
    const source = context.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(context.destination);
    set({ ctx: context, analyser });
  };

  const startPlayback = (audio: HTMLAudioElement) => {
    ensureGraph();
    audio.play().catch(() => {
      // interrupted by a newer load/pause — the next state event resyncs us
    });
  };

  return {
    trackIndex: 0,
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    muted: false,
    repeatOne: false,
    audio: null,
    analyser: null,
    ctx: null,

    attach: (el) => {
      // runs after mount, so restoring saved prefs can't break hydration
      const prefs = loadPrefs();
      const { trackIndex } = get();
      const volume = prefs?.volume ?? get().volume;
      const muted = prefs?.muted ?? get().muted;
      if (!el.src) el.src = TRACKS[trackIndex].src;
      el.volume = volume;
      el.muted = muted;
      set({ audio: el, volume, muted });
    },
    detach: (el) => {
      if (get().audio === el) set({ audio: null });
    },
    sync: (partial) => set(partial),

    play: () => {
      const { audio } = get();
      if (audio) startPlayback(audio);
    },
    pause: () => get().audio?.pause(),
    toggle: () => {
      const { audio } = get();
      if (!audio) return;
      if (audio.paused) startPlayback(audio);
      else audio.pause();
    },
    selectTrack: (index, autoplay = true) => {
      const { audio } = get();
      set({ trackIndex: index, currentTime: 0, duration: 0 });
      if (!audio) return;
      audio.src = TRACKS[index].src;
      audio.load();
      if (autoplay) startPlayback(audio);
    },
    next: () => get().selectTrack((get().trackIndex + 1) % TRACKS.length),
    prev: () => {
      const { audio, trackIndex } = get();
      // like every desktop player: "previous" restarts the song unless
      // you're right at the start of it
      if (audio && audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
      }
      get().selectTrack((trackIndex - 1 + TRACKS.length) % TRACKS.length);
    },
    seek: (seconds) => {
      const { audio } = get();
      if (!audio || !Number.isFinite(audio.duration)) return;
      audio.currentTime = seconds;
      set({ currentTime: seconds });
    },
    setVolume: (volume) => {
      const { audio } = get();
      if (audio) {
        audio.volume = volume;
        if (volume > 0 && audio.muted) audio.muted = false;
      }
      const muted = volume > 0 ? false : get().muted;
      set({ volume, muted });
      savePrefs(volume, muted);
    },
    toggleMute: () => {
      const muted = !get().muted;
      const { audio } = get();
      if (audio) audio.muted = muted;
      set({ muted });
      savePrefs(get().volume, muted);
    },
    toggleRepeat: () => set({ repeatOne: !get().repeatOne }),
  };
});

export function useCurrentTrack() {
  const index = usePlayerStore((s) => s.trackIndex);
  return TRACKS[index];
}
