"use client";

import { useState } from "react";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { LeaveMatchDialog } from "./LeaveMatchDialog";

type MatchLeaveControlProps = {
  /** Freeze the fuse while the confirm sheet is open. */
  setPaused: (paused: boolean) => void;
  /** Abandon the match (reset store + navigate). */
  onConfirmLeave: () => void;
};

/**
 * In-arena exit for immersive routes (bottom nav is hidden).
 * Pauses the timer, confirms, then hands off to the caller.
 */
export function MatchLeaveControl({
  setPaused,
  onConfirmLeave,
}: MatchLeaveControlProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  function requestLeave() {
    playSound("click");
    haptic(HAPTIC.tap);
    setPaused(true);
    setOpen(true);
  }

  function stay() {
    playSound("click");
    setPaused(false);
    setOpen(false);
  }

  function leave() {
    playSound("click");
    setOpen(false);
    onConfirmLeave();
  }

  return (
    <>
      <button
        type="button"
        onClick={requestLeave}
        aria-label={t("quiz.leaveConfirm")}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/40 text-white/70 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_3px_0_0_rgba(0,0,0,0.35)] transition-transform active:scale-90"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/close.png"
          alt=""
          draggable={false}
          className="h-5 w-5 object-contain opacity-90"
        />
      </button>

      <LeaveMatchDialog open={open} onStay={stay} onLeave={leave} />
    </>
  );
}
