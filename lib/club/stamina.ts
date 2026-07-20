// Pure passive-stamina regeneration. Shared by read (snapshot) and write
// (match resolution) paths so the "+1 every 15 minutes" rule lives in one place.

export const STAMINA_REGEN_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export type StaminaInput = {
  stamina: number;
  maxStamina: number;
  lastStaminaUpdate: Date;
};

export type RegenResult = {
  /** Regenerated current stamina (clamped to maxStamina). */
  stamina: number;
  /** New anchor to persist. Advances by whole intervals consumed. */
  lastStaminaUpdate: Date;
  /** Whether anything changed vs input (so callers can skip needless writes). */
  changed: boolean;
  /** Ms until the next +1 (0 when already full). */
  msUntilNext: number;
};

/**
 * Compute regenerated stamina at `now`.
 * - Already full → clock stays "now", nothing to regen.
 * - Otherwise gain floor(elapsed / interval), carrying the remainder forward.
 */
export function computeStaminaRegen(
  { stamina, maxStamina, lastStaminaUpdate }: StaminaInput,
  now: Date = new Date(),
): RegenResult {
  if (stamina >= maxStamina) {
    return {
      stamina: Math.min(stamina, maxStamina),
      lastStaminaUpdate: now,
      changed: stamina > maxStamina,
      msUntilNext: 0,
    };
  }

  const elapsed = now.getTime() - lastStaminaUpdate.getTime();
  const gained = Math.floor(elapsed / STAMINA_REGEN_INTERVAL_MS);

  if (gained <= 0) {
    return {
      stamina,
      lastStaminaUpdate,
      changed: false,
      msUntilNext: STAMINA_REGEN_INTERVAL_MS - Math.max(0, elapsed),
    };
  }

  const newStamina = Math.min(maxStamina, stamina + gained);
  const reachedMax = newStamina >= maxStamina;

  const newAnchor = reachedMax
    ? now
    : new Date(
        lastStaminaUpdate.getTime() + gained * STAMINA_REGEN_INTERVAL_MS,
      );

  const remainder = reachedMax
    ? 0
    : now.getTime() - newAnchor.getTime();

  return {
    stamina: newStamina,
    lastStaminaUpdate: newAnchor,
    changed: true,
    msUntilNext: reachedMax ? 0 : STAMINA_REGEN_INTERVAL_MS - remainder,
  };
}
