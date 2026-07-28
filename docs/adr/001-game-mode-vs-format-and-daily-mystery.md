# ADR 001: Decoupling Game Modes from Question Formats & Daily Mystery Architecture

- **Status:** Accepted
- **Date:** 2026-07-28

## Context

Footballica already has a solid core loop:

- **Penalty / Quick Match** — short solo sessions (twin modes; both write `Match`)
- **Survival** — individual skill / record chasing
- **Duel** — social turn-based competition (own domain tables)

As we expand, we need new quiz mechanics (Mystery Player, Career Path, Grid, Higher/Lower, etc.) for daily retention (DAU) and variety. Creating a new standalone `GameMode` and permanent Play-screen card for every mechanic would:

- Clutter the UI and codebase
- Pollute the append-only `Match` ledger with non-match domains
- Force duplicate engines instead of reusing the question pipeline

Research on Trivia Crack, Kahoot, Sporcle, and football minigames shows successful products usually diversify in **two layers**:

1. **Game Mode** — rules, win condition, session shape
2. **Question Format** — how the player answers / what they see

## Decision

### 1. Decouple Game Mode from Question Format

**Core match modes** (unchanged product surface for now):

| Mode | Ledger |
|------|--------|
| Penalty | `Match` (`MatchMode.PENALTY`) |
| Quick Match | `Match` (`MatchMode.QUICK_MATCH`) |
| Survival | `Match` (`MatchMode.SURVIVAL`) |
| Duel | `DuelMatch` / `DuelRound` (not `Match`) |

Penalty remains a first-class mode in data and play feel (fuse / goal-or-save). It is a **twin** of Quick, not a candidate to delete — but new visual puzzles must **not** invent a fifth permanent card by default.

**Question formats** ship inside the existing question engine via Prisma `QuestionType`
(also mirrored in `lib/quiz/types.ts` as `QuizQuestionType`):

```text
QuestionType: TEXT | IMAGE | CAREER_PATH | HIGHER_LOWER | REVEAL_IMAGE
```

Later candidates (not yet in schema): `ORDER`, `GRID`, `TYPE_ANSWER`, …

A Career Path item can appear in Quick, Survival, Duel, or a Live-Ops challenge without a dedicated mode.

**Rule:** New variety that is still “answer N items under mode rules” → extend `QuestionType`.  
New variety that is a different session shape / daily puzzle → dedicated domain (below), not `MatchMode`.

### 2. “Game of the Day” slot

Introduce a rotating daily Live-Ops slot in the UI (e.g. under Play or Hub), **not** a permanent grid of mini-games.

First occupant: **Mysterious Player** (بازیکن مرموز) — short daily guess loop to drive habit and shareable results.

Later rotations (Career Path day, Higher/Lower day, etc.) reuse the same slot.

### 3. Domain isolation for Daily Mystery

Do **not** write Mysterious Player attempts into `Match` / `answerLog`.

Hybrid schema (implemented in `prisma/schema.prisma`):

| Model | Role |
|-------|------|
| `DailyMysteryPuzzle` | Day’s puzzle; unique Tehran `dateKey` (`YYYY-MM-DD`); `targetPlayerId` string (Player catalog FK later); optional `config` JSON |
| `DailyMysteryAttempt` | Per-club progress; `@@unique([clubId, puzzleId])`; `DailyMysteryAttemptStatus`; `guessCount`; optional `shareCode` / `solvedAt` |
| Attempt `guesses` JSON | Up to ~6 sequential guesses + attribute feedback (default `[]`; no child rows in v1) |

**Streak (explicit choice):**

- Keep **O(1) Hub reads** via aggregates on `Club`.
- Prefer a **dedicated mystery streak** (`mysteryStreak`, `longestMysteryStreak`, `lastMysteryDate`) so the daily puzzle can own the habit loop without being conflated with Penalty/Quick/Survival play.
- Optionally, settling a mystery day may also advance the existing global `dailyStreak` later — that is a product toggle, not required by this ADR.
- **Analytical source of truth** remains `DailyMysteryAttempt` rows (funnels, solve rate, guess distribution).

### 4. Non-goals (out of this ADR)

- Championship **Campaign** as a fourth permanent mode
- Football **Grid**, Tic-Tac-Toe duel, Tug-of-War, Battle Royale / live tournaments
- Normalizing each guess into `DailyMysteryGuess` child rows (revisit only if SQL funnel jobs demand it)
- Audio / video question formats
- Stuffing daily puzzle state into `Club` JSON alone (no analytical ledger)

## Consequences

### Positive

- Clean `Match` domain and economy audit trail
- Scalable Live-Ops: formats reuse modes; daily slot rotates content
- Analytics-friendly funnels (“drop-off at guess 3”) without over-normalized guess tables
- Play UI stays focused: core modes + one daily slot + weekly events on existing `RecordChallenge` infra

### Negative / operational

- Separate tables, server actions, and (light) admin/cron to publish `DailyMysteryPuzzle` per Tehran day
- Two streak concepts to document in product copy if both global and mystery streaks are shown
- Attempt retention policy needed eventually (e.g. archive/prune attempts older than N days); v1 can keep all rows — volume is ~1 row per club per day

## Follow-ups

1. ~~Schema: `QuestionType` formats + Daily Mystery tables + Club mystery streak fields.~~ (done)
2. ~~Play “Game of the Day” + `/play/mystery` + get/submit actions (in-code catalog).~~ (done)
3. ~~Hub streak chip + share card + mystery badges (`mystery_debut` / `_streak_3` / `_streak_7`).~~ (done)
4. ~~`FootballPlayer` catalog + admin `/admin/players` + Mystery Day schedule `/admin/mystery`.~~ (done)
5. ~~Authoring UX / content JSON contracts for `CAREER_PATH` and `HIGHER_LOWER` (formats first, no new Play cards).~~ (done)
6. ~~Later ADR if Campaign or Grid becomes a permanent pillar.~~ → [ADR 002](./002-campaign-and-grid-pillars.md) (Accepted: Campaign = metagame, Grid daily = GotD rotation — not new MatchModes).
7. ~~Light Live-Ops format bias in draws (~1 non-TEXT per 5) so CAREER_PATH / HIGHER_LOWER / REVEAL_IMAGE / IMAGE surface in TEXT-heavy banks.~~ (done — `lib/quiz/formatBias.ts`)
8. ~~Cron `/api/cron/mystery` pre-schedules Tehran week ahead without overwriting admin rows (still safe with `ensureTodayMysteryPuzzle` fallback).~~ (done)
