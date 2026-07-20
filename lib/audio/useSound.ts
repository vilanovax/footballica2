"use client";

import { useCallback } from "react";
import { useAudioStore } from "@/stores/audioStore";
import { playSound, preloadSounds, type SoundName } from "./SoundManager";
import { haptic } from "./haptics";

/**
 * Convenience hook for UI components: play SFX + optional haptic in one call,
 * plus access to the global mute state/toggle.
 */
export function useSound() {
  const isMuted = useAudioStore((s) => s.isMuted);
  const toggleMute = useAudioStore((s) => s.toggleMute);
  const setMuted = useAudioStore((s) => s.setMuted);

  const play = useCallback((name: SoundName, vibration?: number | number[]) => {
    playSound(name);
    if (vibration !== undefined) haptic(vibration);
  }, []);

  return { play, preload: preloadSounds, isMuted, toggleMute, setMuted };
}
