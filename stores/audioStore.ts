import { create } from "zustand";
import { persist } from "zustand/middleware";

type AudioState = {
  /** Global SFX mute. Persisted so the choice survives reloads. */
  isMuted: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
};

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      isMuted: false,
      toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
      setMuted: (muted) => set({ isMuted: muted }),
    }),
    { name: "footballica:audio" },
  ),
);
