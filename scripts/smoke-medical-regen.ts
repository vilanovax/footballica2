/**
 * Pure smoke: higher Medical bay ⇒ faster stamina regen.
 * No DB / HTTP — exercises lib/club/stamina + upgradeEffects only.
 *
 *   npx tsx scripts/smoke-medical-regen.ts
 *   npm run smoke:medical-regen
 */
import {
  computeStaminaRegen,
  staminaRegenIntervalMinutes,
  staminaRegenIntervalMs,
} from "../lib/club/stamina";
import { getUpgradeImpact } from "../lib/club/upgradeEffects";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`SMOKE ASSERT: ${msg}`);
}

function main() {
  // ── 1. Interval table (Lv0..4) ───────────────────────────────────────────
  const expectedMinutes = [15, 13, 11, 9, 7] as const;
  for (let lv = 0; lv <= 4; lv++) {
    const mins = staminaRegenIntervalMinutes(lv);
    assert(
      mins === expectedMinutes[lv],
      `Lv${lv} interval should be ${expectedMinutes[lv]}m, got ${mins}m`,
    );
    assert(
      staminaRegenIntervalMs(lv) === mins * 60_000,
      `Lv${lv} ms/minutes mismatch`,
    );
  }
  assert(
    staminaRegenIntervalMinutes(0) > staminaRegenIntervalMinutes(4),
    "Lv4 must regenerate faster than Lv0",
  );
  // Floor at 5m even if level is absurdly high.
  assert(
    staminaRegenIntervalMinutes(99) === 5,
    "interval floor should be 5 minutes",
  );

  // ── 2. Same wall-clock elapsed → more +1 ticks at higher Medical ─────────
  const now = new Date("2026-07-28T12:00:00.000Z");
  // 14 minutes: Lv0 still waiting (needs 15m); Lv4 gets floor(14/7)=2 ticks.
  const last = new Date(now.getTime() - 14 * 60_000);
  const base = {
    stamina: 1,
    maxStamina: 5,
    lastStaminaUpdate: last,
  };

  const lv0 = computeStaminaRegen({ ...base, medicalLevel: 0 }, now);
  const lv4 = computeStaminaRegen({ ...base, medicalLevel: 4 }, now);

  assert(lv0.stamina === 1 && !lv0.changed, "Lv0 after 14m should still be 1");
  assert(lv4.stamina === 3 && lv4.changed, "Lv4 after 14m should reach 3 (+2)");
  assert(
    lv4.stamina > lv0.stamina,
    "higher Medical must yield more stamina for the same elapsed time",
  );

  // At exactly 15m: Lv0 gains +1; Lv4 still two full 7m ticks (+2).
  const after15 = new Date(last.getTime() + 15 * 60_000);
  const lv0_15 = computeStaminaRegen({ ...base, medicalLevel: 0 }, after15);
  const lv4_15 = computeStaminaRegen({ ...base, medicalLevel: 4 }, after15);
  assert(lv0_15.stamina === 2, "Lv0 after 15m → +1");
  assert(lv4_15.stamina === 3, "Lv4 after 15m → +2 (two 7m ticks)");

  // ── 3. Hub upgrade card mirrors the same minutes ─────────────────────────
  for (let lv = 0; lv < 4; lv++) {
    const impact = getUpgradeImpact("MEDICAL", lv, 3);
    assert(impact?.kind === "regenMinutes", `impact kind at Lv${lv}`);
    assert(
      impact.from === staminaRegenIntervalMinutes(lv) &&
        impact.to === staminaRegenIntervalMinutes(lv + 1),
      `Hub impact Lv${lv}→${lv + 1} must match regen formula`,
    );
    assert(impact.from > impact.to, `upgrade Lv${lv} must shorten the wait`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        intervalsMin: expectedMinutes,
        sample14m: { lv0: lv0.stamina, lv4: lv4.stamina },
        sample15m: { lv0: lv0_15.stamina, lv4: lv4_15.stamina },
        hubImpact0to1: getUpgradeImpact("MEDICAL", 0, 3),
      },
      null,
      2,
    ),
  );
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
