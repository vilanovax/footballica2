/**
 * Safe haptic feedback. iOS Safari/WebViews don't implement the Vibration API,
 * so we feature-detect and swallow errors — callers never need to guard.
 */
export function haptic(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  if (!("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* vibration unsupported / blocked — ignore */
  }
}

// Shared feel constants so every trigger stays consistent across the app.
export const HAPTIC = {
  light: 30,
  tap: 40,
  goal: 50,
  miss: [100, 50, 100] as number[],
} as const;
