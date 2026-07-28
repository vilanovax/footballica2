# ADR 002: Campaign & Football Grid — Pillars Without Polluting Play

- **Status:** Accepted
- **Date:** 2026-07-28
- **Supersedes / extends:** [ADR 001](./001-game-mode-vs-format-and-daily-mystery.md) §4 non-goals #1–2 and follow-up #6

## Context

ADR 001 deliberately deferred:

- Championship **Campaign** as a fourth permanent mode
- Football **Grid** (Immortal / Sporcle-style) and other session-shaped minigames

Formats (`CAREER_PATH`, `HIGHER_LOWER`, `REVEAL_IMAGE`) and Daily Mystery are now shipped. The next product tension is: players want longer arcs (Campaign) and sticky shareable puzzles (Grid), but Play already has Penalty, Quick, Survival, Duel, plus Game of the Day. Adding two more permanent cards would:

- Dilute the core loop
- Force awkward `MatchMode` / economy mappings
- Duplicate engines that should reuse questions, stamina, and Live-Ops tooling

We already have partial building blocks:

| Building block | Role today |
|----------------|------------|
| `MissionBatchKind.CAMPAIGN` | Long-running mission ladder (vs `DAILY`) |
| `RecordChallenge` | Time-boxed premium Survival events (تاج / Road to …) |
| Game of the Day slot | Rotating daily habit (Mystery first) |
| `QuestionType` | Visual / answer formats inside existing modes |

## Decision

### 1. Campaign is a **metagame pillar**, not a `MatchMode`

**Do not** add `MatchMode.CAMPAIGN` or a fifth permanent Play card in v1.

**Campaign** = seasonal / long-running progression on the **Hub + Missions** surface:

1. **Primary:** Grow `MissionBatchKind.CAMPAIGN` batches (objectives already map to real match/duel stats via `missionEngine`).
2. **Secondary:** Keep `RecordChallenge` as **premium event chapters** inside a season (unlock + Survival target + showcase badge) — themed legs of the ladder, not a separate “mode.”
3. **UI:** One Campaign entry from Club Hub / Missions drawer (and optional Play banner when a season is live). Completing Campaign progress still happens by playing **existing** modes.

Economy stays familiar: stamina on matches, coins/XP from settles, campaign chests from batch completion. No parallel score ledger required for v1.

**When (and only when) Campaign needs its own session shape** (e.g. multi-node map with dedicated runs that are not Penalty/Quick/Survival/Duel), open a new ADR to add domain tables — still prefer not stuffing those into `Match` unless the run is truly a scored quiz match.

### 2. Grid splits into **format** vs **daily puzzle**

| Variant | Classification | Ledger |
|---------|----------------|--------|
| **A. Grid cell prompt** — one MCQ framed as a grid clue inside Quick/Survival/Duel | `QuestionType.GRID` (future enum value) | Existing `Match` / `DuelRound` |
| **B. Immortal-style 3×3 daily** — fill a grid by guessing players/clubs that satisfy row×column | Game of the Day rotation (like Mystery) | **Dedicated domain** (not `Match`) |

**v1 product priority for “Football Grid”:** variant **B** as a **rotating Game of the Day** occupant (not a permanent Play card). Variant **A** may ship later as a format if content wants grid-flavored MCQs without a full daily puzzle.

### 3. Proposed domain sketch (Grid daily — implement later)

Do **not** migrate until Live-Ops is ready to author grids. Sketch only:

```text
DailyGridPuzzle
  dateKey (Tehran YYYY-MM-DD, unique)
  rowsJson / colsJson   — 3 labels each
  solutionJson          — optional author key; or validate via catalog rules
  config                — max wrong guesses, catalog constraints

DailyGridAttempt
  @@unique([clubId, puzzleId])
  cellsJson             — filled cell → entity id
  status                — IN_PROGRESS | SOLVED | FAILED
  shareCode / solvedAt
```

Reuse `FootballPlayer` (and later club entities) for guess pickers. Streak: either a dedicated `gridStreak` on `Club` **or** a generic `gameOfTheDayStreak` if multiple daily types share one habit counter — choose at implementation time; Mystery streak stays independent unless product explicitly merges them.

### 4. Play screen rule (unchanged from ADR 001)

```text
Permanent Play cards: Penalty | Quick | Survival | Duel
+ one Game of the Day slot (Mystery today; Grid / others rotate)
+ Live-Ops banners (RecordChallenge / Campaign season)
```

No permanent “Campaign mode” or “Grid mode” card unless a future ADR revises this rule with evidence (retention, session length, support cost).

### 5. Non-goals

- Tic-Tac-Toe duel, Tug-of-War, Battle Royale / live tournaments
- Writing Grid daily attempts into `Match.answerLog`
- Replacing Survival with Campaign
- Shipping `QuestionType.GRID` before daily Grid content pipeline exists (optional; not a blocker for Campaign metagame)

## Consequences

### Positive

- Campaign can launch with **missions + RecordChallenge** content, almost no new engine
- Grid daily stays analytics-clean and shareable, parallel to Mystery
- Play IA stays scannable on mobile
- Formats from ADR 001 continue to feed Campaign progress (playing Quick with CAREER_PATH still counts toward missions)

### Negative / operational

- Campaign “feels” less like a map until Hub UX invests in season chrome
- Two daily systems (Mystery + Grid) need Live-Ops calendar discipline — prefer **one active Game of the Day type per Tehran day**
- Grid authoring is heavier than Mystery (9 cells × constraints); needs admin tooling before cron

## Follow-ups

1. ~~**Campaign season UX** — Hub entry + `MissionBatchKind.CAMPAIGN` content for season 1 (no new MatchMode).~~ (done — `CampaignSeasonCard` + Mission drawer Campaign tab)
2. ~~**RecordChallenge as campaign chapters** — soft narrative under Campaign (live challenges → Survival).~~ (done — no schema link required)
3. **ADR / schema for `DailyGridPuzzle`** when ready to build Immortal-style day — then Game of the Day rotator.
4. Optional `QuestionType.GRID` if cell-style MCQs are needed inside core modes.
5. Decide streak model: separate `gridStreak` vs shared `gameOfTheDayStreak`.

## Implementation note

This ADR is **architectural acceptance only**. No Prisma migration ships with this document. Build Campaign metagame and/or Grid daily only when product schedules them; until then, keep shipping formats + Mystery Live-Ops.
