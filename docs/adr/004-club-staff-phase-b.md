# ADR 004 — Club Staff (Phase B)

## Status

Accepted — Phase B of the Club Funds idle loop (extends ADR 003).

## Context

Phase A taught Collect → Safe → Bank (withdraw only when Safe is full). Players need a hireable layer that:

1. Rewards putting people on businesses (rate uplift).
2. Softens Safe friction for engaged clubs (Treasurer).
3. Stays simple — one staff pool, not per-facility specialist trees.

## Decision

**Model 1 — shared staff pool**

- Hire from a small catalog of templates (same role shape, different avatar + `rateBonusPercent`).
- Assign at most **one** staff to each **BUILT** business facility.
- Unassigned staff sit on the bench (no rate effect).
- Roles:
  - `MANAGER` — `+rateBonus%` on assigned facility + **auto-collect** that facility into Safe when its buffer is full.
  - `TREASURER` — same rate/auto-collect when assigned; **while hired** (bench or assigned) unlocks Safe → Bank withdraw even if Safe is not full.

**Out of scope**

- Per-facility specialist classes, rarity/loot/merge, quiz competitive buffs, income mint cron, Staff on Stadium/Training/Medical.

## Economics

- Catalog in `GameConfig.businessEconomy.staff.templates` (admin add / edit / reorder / delete).
- Hire cost: `round(template.hireCost × hireCostGrowth^hiredCount)` from spendable Bank.
- Hire sheet shows first `offerCount` unhired templates **in catalog order**.
- Unaffordable offers are shown grayed out (not hidden).
- Max hired: config `maxHired` (default 3 = one per facility).
- Rate: `floor(baseRate × incomeBoost × (1 + rateBonusPercent/100))`.
- Auto-collect: lazy on Hub snapshot / business actions — never a mint cron.
- Fire: free; no refund (anti-exploit).

## Data

`ClubStaff`: templateKey, avatarKey, role, rateBonusPercent, optional `assignedFacilityKey` (unique per club when set).
Live-Ops names/avatars/costs live on GameConfig templates, not Prisma rows.

## Consequences

- Withdraw gate from Phase A remains default; Treasurer is the intentional softener.
- UI copy stays “Staff / مدیران” — never confuse with Player Level (`User.managerLevel`).
