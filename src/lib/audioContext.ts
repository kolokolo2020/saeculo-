// One AudioContext for the whole site. The media player, the Beat Maker,
// the games and the Recycle Bin's sketches all share it: browsers cap how
// many contexts a page may hold (and iOS glitches well before that cap),
// and one clock keeps everything in time with everything else.
let shared: AudioContext | null = null;

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

/** The shared context, created on first use (call it from a user gesture
 *  so autoplay policies let it start) and resumed if the browser paused it. */
export function getAudioContext(): AudioContext {
  if (!shared) {
    // iOS routes Web Audio through the ringer by default, so the silent
    // switch would mute the whole site; "playback" is the music-app mode.
    const nav = navigator as AudioSessionNavigator;
    if (nav.audioSession) {
      try {
        nav.audioSession.type = "playback";
      } catch {
        // older Safari: leave the default
      }
    }
    shared = new AudioContext({ latencyHint: "interactive" });
  }
  if (shared.state === "suspended") void shared.resume();
  return shared;
}

/** The shared context if something already started it, without creating
 *  one: for incidental sounds that shouldn't be the first to wake audio. */
export function peekAudioContext(): AudioContext | null {
  return shared?.state === "running" ? shared : null;
}
