import { useAudioStore } from "@/stores/audioStore";

/**
 * Lightweight SFX layer. Audio elements are created lazily on the client and
 * cached; each play clones the node so rapid/overlapping triggers don't cut
 * each other off. Browser auto-play rejections are swallowed silently.
 *
 * NOTE FOR DEV: sample sounds live in `/public/sounds/` (goal.mp3, miss.mp3,
 * whistle.mp3, upgrade.mp3, click.mp3). They are placeholder synth tones —
 * drop in polished assets with the same filenames to upgrade the game feel.
 */

export type SoundName = "goal" | "miss" | "whistle" | "upgrade" | "click";

const SOUND_FILES: Record<SoundName, string> = {
  goal: "/sounds/goal.mp3",
  miss: "/sounds/miss.mp3",
  whistle: "/sounds/whistle.mp3",
  upgrade: "/sounds/upgrade.mp3",
  click: "/sounds/click.mp3",
};

// Per-sound volume so a whistle doesn't blast louder than a UI click.
const SOUND_VOLUME: Record<SoundName, number> = {
  goal: 0.7,
  miss: 0.6,
  whistle: 0.5,
  upgrade: 0.7,
  click: 0.35,
};

const cache = new Map<SoundName, HTMLAudioElement>();

function getBaseAudio(name: SoundName): HTMLAudioElement | null {
  if (typeof window === "undefined" || typeof Audio === "undefined") {
    return null;
  }
  let audio = cache.get(name);
  if (!audio) {
    audio = new Audio(SOUND_FILES[name]);
    audio.preload = "auto";
    audio.volume = SOUND_VOLUME[name];
    cache.set(name, audio);
  }
  return audio;
}

/** Warm the cache (optional) after the first user gesture. */
export function preloadSounds(): void {
  (Object.keys(SOUND_FILES) as SoundName[]).forEach((name) => {
    const audio = getBaseAudio(name);
    audio?.load();
  });
}

/**
 * Play a one-shot sound. No-ops on the server, when muted, or if the browser
 * blocks playback (e.g. before the first interaction) — errors are ignored.
 */
export function playSound(name: SoundName): void {
  if (typeof window === "undefined") return;
  if (useAudioStore.getState().isMuted) return;

  const base = getBaseAudio(name);
  if (!base) return;

  try {
    // Clone so overlapping triggers each get their own playback head.
    const node = base.cloneNode(true) as HTMLAudioElement;
    node.volume = base.volume;
    const played = node.play();
    if (played && typeof played.catch === "function") {
      played.catch(() => {
        /* auto-play blocked / no user gesture yet — ignore */
      });
    }
  } catch {
    /* Audio construction/playback unsupported — fail silently */
  }
}
