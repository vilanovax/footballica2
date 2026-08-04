"use client";

import { useEffect, useRef, useState } from "react";
import type { FacilityView } from "@/lib/club/businessEconomy";

const MS_PER_HOUR = 3_600_000;

/**
 * Client-side live buffer fill between server snapshots.
 * Accrues from last known storedAmount at ratePerHour, capped at storageCap.
 */
export function useLiveFacilityFill(facility: FacilityView) {
  const built =
    facility.status === "BUILT" &&
    facility.storageCap > 0 &&
    facility.ratePerHour > 0;

  const baseline = useRef({
    stored: facility.storedAmount,
    at: Date.now(),
    version: facility.version,
  });

  if (
    baseline.current.version !== facility.version ||
    baseline.current.stored !== facility.storedAmount
  ) {
    baseline.current = {
      stored: facility.storedAmount,
      at: Date.now(),
      version: facility.version,
    };
  }

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!built) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [built]);

  if (!built) {
    return {
      liveAmount: facility.storedAmount,
      fillRatio: facility.fillRatio,
      fillPct: Math.round(facility.fillRatio * 100),
      isFull: facility.fillRatio >= 1,
    };
  }

  const elapsedH = Math.max(0, now - baseline.current.at) / MS_PER_HOUR;
  const live = Math.min(
    facility.storageCap,
    baseline.current.stored + facility.ratePerHour * elapsedH,
  );
  const fillRatio = Math.min(1, live / facility.storageCap);

  return {
    liveAmount: Math.floor(live),
    fillRatio,
    fillPct: Math.round(fillRatio * 100),
    isFull: fillRatio >= 0.999,
  };
}
