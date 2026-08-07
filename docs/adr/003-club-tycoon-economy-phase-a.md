# ADR 003: Club Tycoon Economy (Phase A) — Business Layer beside Quiz

- **Status:** Accepted (Phase A **implemented**)
- **Date:** 2026-08-02
- **Related:** PRD §3–4 (Club Hub / Progression); existing `Club` gameplay upgrades in `lib/club/upgrades.ts`
- **Living overview (all currencies + shipped work):** [docs/economy.md](../economy.md)

## Context

Footballica’s core loop is trivia → coins/XP/fans → gameplay upgrades (Stadium / Medical / Training Ground) and match sinks (helpers, stamina refill). That economy is healthy for **active play**.

We also need a **return-to-app** metagame on the Club Hub: idle-style facilities that generate a separate soft currency, capped by a vault, so players reopen the app several times a day without turning the product into a pure management sim.

Risks if done naively:

- Idle payouts dilute match **coins** → helpers / duel rewards become worthless
- Per-user cron accrual melts the server
- Mixing “stamina building” with “money building” confuses the Hub
- Too many upgrade axes / staff / loot in v1 buries the quiz core

## Decision

Ship a **Business layer** beside (not instead of) the quiz economy.

### 1. Four resources (do not merge)

| Resource | Source of truth (today / Phase A) | Role |
|----------|-----------------------------------|------|
| **XP → Player Level** | `User.xp` / cached `User.managerLevel` | Unlock facilities & cosmetics. **Product copy:** “Player Level” / «لول بازیکن» — never “Manager Level” in UI (avoids clash with hireable Staff later). Schema field rename is optional follow-up. |
| **Fans** | `Club.fans` | Prestige + multipliers on some business income (e.g. Club Shop) |
| **Coins** | `Club.coins` | Match / GotD / duel economy only: helpers, refill, events |
| **Club Funds** | New: spendable + vault | Build / upgrade business facilities only |

**Rule:** Business income never credits `Club.coins`. Match rewards never credit vault/funds except optional **tiny Fund bonuses** from play (streak / first win of day) that are still not coins.

### 2. Gameplay vs Business facilities

| Layer | Examples | Effect |
|-------|----------|--------|
| **Gameplay** (existing) | Training Ground, Medical, Stadium (current levels) | Stamina, regen, fans-from-play, Hub visuals |
| **Business** (new) | Ticket Office, Club Shop, Museum | Club Funds only |

**Stadium (product rule):** remains the **visual mother** / capacity story. Ticket Office is the **income producer** for matchday money. Stadium may later raise Ticket Office’s fan-capacity multiplier; it must not be the primary Funds faucet in Phase A.

### 3. Lazy evaluation (no income cron)

Per facility (and vault):

```text
elapsed = serverNow - lastCalculatedAt
generated = ratePerHour × (elapsed / 1h)
storedAmount = min(storageCap, storedAmount + generated)
lastCalculatedAt = serverNow   // on settle
```

- Client shows **preview** only; server recomputes on every collect / upgrade / withdraw.
- Cron may later send “vault nearly full” notifications — **never** to mint funds.

### 4. Money flow (Phase A UX: ≤ 2 clicks)

Logical pipeline:

```text
Facility buffer (storedAmount, capped)
    → Collect / Collect All  →  Vault (vaultBalance, capped by vaultLevel)
    → Withdraw               →  Spendable Club Funds
```

UX must not require opening every bottom sheet:

- Primary CTA when any buffer > 0: **Collect All → Vault**
- Secondary **only when vault is full**: **Withdraw to spendable** (Phase A gate — no partial drip)
- Show “time until vault full”

**Vault full policy:** stop new accrual into vault (and/or facility buffers that feed it — product: stop at vault). **Never burn** existing balance. Soft copy only («خزانه پر است؛ بعد از تخلیه درآمد ادامه پیدا می‌کند»).

### 5. Upgrade model (Phase A)

One ladder per facility: `level → level+1` increases **rate** and **storageCap** together (and optionally shortens cycle flavor in copy only).

**Deferred (historical):** separate sliders for speed / rate / cap; rarity / loot; sponsors as systems.

**Shipped later:** Staff / Treasurer (ADR 004); branch perks at milestones 5 / 10 / 15 (`ClubFacility.branchPicks`).

**Server rules (mandatory):**

- Time from server clock only
- Collect / withdraw / upgrade inside a **DB transaction**
- Before upgrade: **settle** buffer at old rate, then increment level
- Optimistic locking via `version` (or equivalent) so double-tap cannot double-pay
- Client never submits amounts — only action + facility key

### 6. Phase A facility set

| Key | Role | Unlock (starter) | Notes |
|-----|------|------------------|-------|
| `TICKET_OFFICE` | Fast, low, teaches the loop | Player Level 1 (or FTUE grant) | Short fill time |
| `CLUB_SHOP` | Mid cycle; fans multiplier | Player Level 3 | `rate *= fansFactor(fans)` |
| `MUSEUM` | Identity; trophy hooks later | Player Level 5 | Phase A: base rate only; **trophy % bonuses** when badge/trophy taxonomy is stable |

### 7. FTUE / seed Funds (required)

New clubs cannot build without a faucet:

1. After tutorial / first gameplay upgrade (existing `tutorialStep`), grant a small **`clubFunds` seed** (tunable), **or**
2. Auto-`BUILT` Ticket Office at level 1 with zero build cost

Pick one in implementation; default recommendation: **seed spendable Funds** + Ticket Office `AVAILABLE` at level 1.

### 8. Soft quiz links (allowed) vs competitive buffs (forbidden)

**Allowed:** first win of day → +20% business income for 1h; new badge → Museum rate bump (Phase B); fans → Shop factor.

**Forbidden:** tycoon spend changing duel timing, removing options, forgiving wrong answers, or ranked scoring.

### 9. Active vs Idle balance target

Rough target after tuning: **~60–70% progression pressure from active play**, **~30–40% from idle Funds**.

Practical gate: next facility upgrade cost must **not** be payable from 24h idle alone for early levels — keep a reason to play (Fund micro-bonuses and/or fans growth from matches feeding Shop).

---

## Data model (Phase A)

Keep **definitions in code/config** (Live-Ops tunable later); **state per club** in DB.

### Config (TypeScript / GameConfig slice — not hard-coded in actions)

```ts
type BusinessFacilityKey = "TICKET_OFFICE" | "CLUB_SHOP" | "MUSEUM";

type FacilityDefinition = {
  key: BusinessFacilityKey;
  unlockPlayerLevel: number;
  baseBuildCost: number;      // spendable Funds
  baseRatePerHour: number;
  baseStorageCap: number;     // Funds units in facility buffer
  costGrowth: number;         // upgrade cost multiplier per level
  rateGrowth: number;
  capGrowth: number;
  maxLevel: number;
};
```

### Prisma (proposed)

```prisma
enum BusinessFacilityKey {
  TICKET_OFFICE
  CLUB_SHOP
  MUSEUM
}

enum ClubFacilityStatus {
  LOCKED
  AVAILABLE
  BUILT
}

model Club {
  // …existing fields…
  clubFunds     Int @default(0)  // spendable
  vaultBalance  Int @default(0)
  vaultLevel    Int @default(1)
  facilities    ClubFacility[]
}

model ClubFacility {
  id               String               @id @default(cuid())
  clubId           String
  club             Club                 @relation(fields: [clubId], references: [id], onDelete: Cascade)
  key              BusinessFacilityKey
  status           ClubFacilityStatus   @default(LOCKED)
  level            Int                  @default(0) // 0 until built; built starts at 1
  storedAmount     Int                  @default(0)
  lastCalculatedAt DateTime             @default(now())
  version          Int                  @default(0)
  createdAt        DateTime             @default(now())
  updatedAt        DateTime             @updatedAt

  @@unique([clubId, key])
  @@index([clubId, status])
}
```

`Int` is enough for Phase A balances; migrate to `BigInt` only if Live-Ops numbers explode.

### Facility state machine (player-facing)

```text
LOCKED
  → (playerLevel ≥ unlock) → AVAILABLE
  → (pay build cost) → BUILT (level 1)
  → upgrades → … → MAXED (level = maxLevel)
```

Hub badges only: 🔒 locked · 🏗 build · 💰 collectable · ⬆ upgrade · vault % · MAX.

---

## Starter balance (tunable — not sacred)

Units = Club Funds. Caps expressed as **hours of income at that level** (storageCap ≈ rate × hours).

### Vault capacity (hours of aggregate income, approx)

| vaultLevel | Cap (hours of current total rate) |
|------------|-------------------------------------|
| 1 | 3h |
| 2 | 6h |
| 3 | 8h |
| 4 | 12h |
| 5 | 24h |

Vault upgrade cost (starter): `500 × 2^(vaultLevel-1)` spendable Funds.

### Ticket Office

| Level | Unlock | Build / upgrade cost | rate/h | buffer cap (≈h) |
|------:|--------|---------------------:|-------:|----------------:|
| Build | Lv 1 | 0 (FTUE) or 100 | — | — |
| 1 | — | — | 40 | 2h (80) |
| 2 | — | 200 | 60 | 2h (120) |
| 3 | — | 400 | 90 | 2.5h (225) |
| 4 | — | 800 | 130 | 3h (390) |
| 5 | — | 1 600 | 190 | 3h (570) |

### Club Shop (`rateEffective = rate × fansFactor`)

`fansFactor = 1 + min(0.5, fans / 2000)` (cap +50% at 1000+ fans — tune in config).

| Level | Unlock | Cost | base rate/h | buffer (≈h) |
|------:|--------|-----:|------------:|------------:|
| Build | Lv 3 | 500 | — | — |
| 1 | — | — | 80 | 3h |
| 2 | — | 900 | 120 | 3h |
| 3 | — | 1 600 | 180 | 3.5h |
| 4 | — | 2 800 | 260 | 4h |
| 5 | — | 5 000 | 380 | 4h |

### Museum (Phase A: flat rate; trophy % later)

| Level | Unlock | Cost | rate/h | buffer (≈h) |
|------:|--------|-----:|-------:|------------:|
| Build | Lv 5 | 2 500 | — | — |
| 1 | — | — | 100 | 4h |
| 2 | — | 3 500 | 150 | 4h |
| 3 | — | 5 500 | 220 | 4.5h |
| 4 | — | 8 500 | 320 | 5h |
| 5 | — | 13 000 | 460 | 5h |

**Seed grant (starter):** `clubFunds += 150` when FTUE enters Hub post-tutorial (enough to feel ownership if Ticket Office is free; enough to buy Shop later with play + idle).

---

## Hub loop (acceptance)

```text
Open Club Hub
  → smart CTA (Collect All / Withdraw / Build / Upgrade)
  → one spend on upgrade or vault
  → small visual level change
  → navigate to Play
```

Target interaction budget: **under ~60 seconds**.

---

## Phase A scope lock

**In**

- `clubFunds`, `vaultBalance`, `vaultLevel`
- Three facilities + definitions + lazy math module
- Collect, Collect All, Withdraw, Build, Upgrade (single ladder)
- Hub CTA + time-to-full copy
- FTUE seed / free Ticket Office
- Server-authoritative transactions + version lock

**Out**

- Staff / auto-collect / Treasurer
- Loot / rarity / card merge
- Branch upgrades (speed vs warehouse vs premium)
- ~~Sponsor Office as a system~~ (shipped: deals + lazy payout + soft facility bonus)
- Separate “bank” capacity beyond vault
- Burning overflow
- Competitive quiz buffs from funds
- Income cron jobs

**Phase B:** Staff pool + Treasurer — see [ADR 004](./004-club-staff-phase-b.md). Still open after that: vault notifications, Museum trophy multipliers, Stadium→Ticket capacity link, milestone branch picks.

---

## Consequences

- Quiz coin sinks stay meaningful.
- Hub gains a Duolingo-like reopen hook without a per-user ticker.
- `lib/club/upgrades.ts` gameplay keys stay separate from `BusinessFacilityKey`.
- Live-Ops can later expose facility/vault numbers via `GameConfig` the same way match rewards are tuned today.
- Naming: UI says Player Level + Staff (later); DB may keep `managerLevel` until a dedicated rename migration.

## Follow-ups

Phase A implementation checklist (done — see [economy.md §11](../economy.md)):

1. ~~Pure math + `GameConfig.businessEconomy` defaults~~
2. ~~Prisma: Club fund fields + `ClubFacility` + first-win boost columns~~
3. ~~Server actions: collect / withdraw / build / upgrade / vault~~
4. ~~Hub `BusinessPanel` + Collect All~~
5. ~~FTUE seed Funds + free Ticket Office~~
6. ~~Admin Club Biz tab; first-win +20% income boost~~

Still open (Phase B+): Staff / vault notifications / Museum trophy % / Stadium→Ticket link / branch milestones. Playtest 7-day spreadsheet against §9 before Staff.
