// Pure passive-stamina regeneration. Shared by read (snapshot) and write
// (match resolution) paths so the "+1 every N minutes" rule lives in one place.
// Medical bay upgrades shorten N — same formula the Hub upgrade cards display.

/** Base interval at Medical Lv 0. */
export const STAMINA_REGEN_BASE_INTERVAL_MS = 15 * 60 * 1000;

/** Floor so high Medical levels never become instant. */
export const STAMINA_REGEN_MIN_INTERVAL_MS = 5 * 60 * 1000;

/** Minutes shaved off the interval per Medical level. */
export const STAMINA_REGEN_PER_MEDICAL_MS = 2 * 60 * 1000;

/**
 * @deprecated Prefer staminaRegenIntervalMs(medicalLevel). Kept as Lv0 alias
 * for any leftover imports.
 */
export const STAMINA_REGEN_INTERVAL_MS = STAMINA_REGEN_BASE_INTERVAL_MS;

/**
 * Ms between +1 stamina ticks for a given Medical bay level.
 * Lv0 → 15m · Lv1 → 13m · Lv2 → 11m · Lv3 → 9m · Lv4 → 7m (floor 5m).
 */
export function staminaRegenIntervalMs(medicalLevel: number): number {
  const level = Math.max(0, Math.floor(medicalLevel || 0));
  return Math.max(
    STAMINA_REGEN_MIN_INTERVAL_MS,
    STAMINA_REGEN_BASE_INTERVAL_MS - level * STAMINA_REGEN_PER_MEDICAL_MS,
  );
}

/** Whole minutes for Hub copy (matches the ms formula exactly). */
export function staminaRegenIntervalMinutes(medicalLevel: number): number {
  return Math.round(staminaRegenIntervalMs(medicalLevel) / 60_000);
}

export type StaminaInput = {
  stamina: number;
  maxStamina: number;
  lastStaminaUpdate: Date;
  /** Medical bay level — shortens the regen interval. Defaults to 0. */
  medicalLevel?: number;
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
  { stamina, maxStamina, lastStaminaUpdate, medicalLevel = 0 }: StaminaInput,
  now: Date = new Date(),
): RegenResult {
  const intervalMs = staminaRegenIntervalMs(medicalLevel);

  if (stamina >= maxStamina) {
    return {
      stamina: Math.min(stamina, maxStamina),
      lastStaminaUpdate: now,
      changed: stamina > maxStamina,
      msUntilNext: 0,
    };
  }

  const elapsed = now.getTime() - lastStaminaUpdate.getTime();
  const gained = Math.floor(elapsed / intervalMs);

  if (gained <= 0) {
    return {
      stamina,
      lastStaminaUpdate,
      changed: false,
      msUntilNext: intervalMs - Math.max(0, elapsed),
    };
  }

  const newStamina = Math.min(maxStamina, stamina + gained);
  const reachedMax = newStamina >= maxStamina;

  const newAnchor = reachedMax
    ? now
    : new Date(lastStaminaUpdate.getTime() + gained * intervalMs);

  const remainder = reachedMax ? 0 : now.getTime() - newAnchor.getTime();

  return {
    stamina: newStamina,
    lastStaminaUpdate: newAnchor,
    changed: true,
    msUntilNext: reachedMax ? 0 : intervalMs - remainder,
  };
}
