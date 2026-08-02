"use client";

import { useState } from "react";
import { X } from "lucide-react";
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
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/80 bg-surface/90 text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground active:scale-95"
      >
        <X className="h-5 w-5" strokeWidth={2.75} />
      </button>

      <LeaveMatchDialog open={open} onStay={stay} onLeave={leave} />
    </>
  );
}
