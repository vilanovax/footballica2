# Footballica Design System

Authoritative visual language for the **game app** (Club Hub, Play, Match, Profile sheets).  
Admin CMS (`.admin`) stays on shadcn Slate and is out of scope.

---

## 1. Two surfaces

| Surface | When | Tokens |
|--------|------|--------|
| **App chrome** | Hub shell, nav, light Day Match panels | `--background`, `--surface`, `--primary`, `--accent` |
| **Arena chrome** | Bottom sheets, match arenas, result modals, immersive game UI | `--arena-*` — always pitch-dark |

Arena does **not** flip with Day/Night. Immersion > theme sync.

---

## 2. Principles

1. **Gamification over forms** — big touch targets (≥44px), pressable CTAs, no bland admin lists.
2. **Shadow rings over thick borders** — use `0 0 0 1px …` rings + hard Y-offset depth. Avoid `border-[3px]` accent frames on new work.
3. **PNG icons over emoji** — `/public/icons/*.png` inside `GameIconWell`.
4. **One job per section** — sheet hero = one star number; offer card = one upgrade path.
5. **RTL-first** — Persian via `font-fa`; keep layout logical (`start`/`end`).

---

## 3. Tokens

Defined in `app/globals.css`, mapped in `tailwind.config.ts`.

### Arena (immersive)

| Token | Role | Tailwind |
|-------|------|----------|
| `--arena-bg` | Deepest pitch | `bg-arena` |
| `--arena-mid` | Slate mid wash | `bg-arena-mid` |
| `--arena-deep` | Forest deep | `bg-arena-deep` |
| `--arena-fg` | Primary text on pitch | `text-arena-fg` |
| `--arena-muted` | Secondary labels | `text-arena-muted` |
| `--arena-ring` | Emerald edge | `text-arena-ring` / `shadow-arena-ring` |
| `--arena-ring-amber` | Gold / vault / offer | `shadow-arena-ring-amber` |
| `--arena-ring-rose` | Rival / medical / danger | `shadow-arena-ring-rose` |
| `--arena-ring-sky` | You / training | `shadow-arena-ring-sky` |
| `--arena-success` | Green primary CTA | `bg-arena-success` |
| `--touch-min` | 44px touch floor | `min-h-touch` |

### App (themeable)

`--primary`, `--accent`, `--surface`, `--hub-from/via/to` — Day Match / Night Match via `data-theme`.

### Geometry

- `rounded-bubble` / `rounded-bubble-lg` / `rounded-bubble-xl`
- Touch: `min-h-touch` / `min-w-touch` (44px)
- Sheet max width: `max-w-mobile` (28rem)

---

## 4. Utility classes

Prefer these over copying hex shadows:

| Class | Use |
|-------|-----|
| `.game-sheet` | BottomSheet shell wash |
| `.game-panel` (+ `-amber` / `-rose` / `-sky`) | Hero / feature card |
| `.game-pinstripe` | Diagonal wash (::before) |
| `.game-tile` (+ `-emerald` / `-amber`) | List / stat row |
| `.game-chip` (+ `-emerald` / `-amber`) | Status pill |
| `.game-well` (+ `-amber`) | Icon container |
| `.game-cta` + `-accent` / `-primary` / `-ghost` / `-danger` | Actions |
| `.game-input` | Search / text on pitch |
| `.game-offer` + `.game-offer-inner` | Upgrade / sponsor frame |

Fantasy light buttons remain: `.btn-fantasy-primary|secondary|accent` (Hub / Day Match).

---

## 5. React primitives

Import from `@/components/ui/game`:

```tsx
import {
  GamePanel,
  GameTile,
  GameChip,
  GameIconWell,
  GameCta,
  GameOffer,
} from "@/components/ui/game";
```

| Component | Maps to |
|-----------|---------|
| `GamePanel` | `.game-panel*` + optional pinstripe |
| `GameTile` | `.game-tile*` |
| `GameChip` | `.game-chip*` |
| `GameIconWell` | `.game-well*` + PNG `src` |
| `GameCta` | `.game-cta*` pressable |
| `GameOffer` | `.game-offer` frame |

Shared sheets: `BottomSheet` with `tone="dark"` → arena shell.

---

## 6. Sheet recipe (canonical)

```tsx
<BottomSheet tone="dark" title={…} subtitle={…}>
  <GamePanel className="-mx-1" tone="emerald">
    <div className="relative flex flex-col items-center px-4 pb-5 pt-5">
      <GameIconWell size="xl" amber src="/icons/…" />
      <p className="mt-2 font-display text-[11px] font-bold uppercase tracking-widest text-white/55">
        Label
      </p>
      <p className="font-display text-5xl font-black tabular-nums text-white">
        {value}
      </p>
    </div>
  </GamePanel>

  <div className="mt-3 grid grid-cols-2 gap-2.5">
    <GameTile className="px-3 py-3">…</GameTile>
    <GameTile tone="amber" className="px-3 py-3">…</GameTile>
  </div>

  <GameOffer className="mt-4">
    <GameCta variant="accent" block disabled={!canAfford}>
      Upgrade
    </GameCta>
  </GameOffer>
</BottomSheet>
```

---

## 7. Do / Don't

**Do**
- Use arena tokens / `Game*` primitives for new immersive UI
- Amber CTA for spend / upgrade; emerald CTA for collect / withdraw
- Close controls: `/icons/close.png` in a `GameIconWell` / well button

**Don't**
- Hardcode `#052e16` / `#0f172a` / `#071410` in new components — use tokens
- Mix emoji into chrome (content flags OK)
- Put light `btn-fantasy-primary` inside dark sheets — use `GameCta`
- Redesign Newspaper modal paper look (diegetic exception)

---

## 8. Migration

Existing screens may still use one-off classes. When touching a file, migrate that surface to tokens/primitives. Reference implementations:

- `components/ui/BottomSheet.tsx`
- `components/club-hub/BankBusinessSheet.tsx`
- `components/club-hub/StaffBusinessSheet.tsx`
