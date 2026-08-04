"use client";

import type { ReactNode } from "react";
import type { GameConfig } from "@/lib/game/economy";
import { Input } from "@/components/ui/input";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";

type AdvancedConfigSectionsProps = {
  draft: GameConfig;
  onFieldChange: (path: string, raw: string) => void;
};

function getPath(obj: unknown, path: string): number {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return 0;
    cur = (cur as Record<string | number, unknown>)[
      /^\d+$/.test(p) ? Number(p) : p
    ];
  }
  return typeof cur === "number" && Number.isFinite(cur) ? cur : 0;
}

function CoinField({
  label,
  tip,
  path,
  draft,
  onFieldChange,
  min = 0,
}: {
  label: string;
  tip: string;
  path: string;
  draft: GameConfig;
  onFieldChange: (path: string, raw: string) => void;
  min?: number;
}) {
  return (
    <label className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
      <span className="flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-700">
        <span className="truncate">{label}</span>
        <AdminHelpTip text={tip} />
      </span>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={min}
          value={getPath(draft, path)}
          onChange={(e) => onFieldChange(path, e.target.value)}
          className="h-8 font-mono text-sm font-semibold tabular-nums"
        />
        <span className="shrink-0 text-xs font-bold text-slate-400">coins</span>
      </div>
    </label>
  );
}

function Section({
  id,
  title,
  titleFa,
  hint,
  children,
  accent = "slate",
}: {
  id?: string;
  title: string;
  titleFa: string;
  hint: string;
  children: ReactNode;
  accent?: "slate" | "sky" | "amber";
}) {
  const ring =
    accent === "sky"
      ? "border-sky-200 bg-sky-50/40"
      : accent === "amber"
        ? "border-amber-200 bg-amber-50/40"
        : "border-slate-200 bg-slate-50/70";
  return (
    <section
      id={id}
      className={`scroll-mt-28 space-y-3 rounded-2xl border p-4 ${ring}`}
    >
      <header className="space-y-0.5">
        <h3 className="font-semibold text-slate-900">
          {title}{" "}
          <span className="font-normal text-slate-500">· {titleFa}</span>
        </h3>
        <p className="text-xs text-slate-600">{hint}</p>
      </header>
      {children}
    </section>
  );
}

/**
 * Helpers (live sinks) + shop inventory sinks. Match length lives on Match tab.
 */
export function AdvancedConfigSections({
  draft,
  onFieldChange,
}: AdvancedConfigSectionsProps) {
  const h = draft.helpers;
  const injurySec =
    Math.round((getPath(draft, "helpers.extraTimeMs") / 1000) * 10) / 10;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-300 bg-linear-to-br from-slate-50 to-white px-4 py-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
          Advanced · پیشرفته
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">
          Coin sinks
        </h2>
        <p className="mt-1 max-w-xl text-sm text-slate-600">
          In-match helpers (paid once per question) vs shop inventory boosters.
          Match length is on the Match tab.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
          <a
            href="#adv-helpers"
            className="rounded-full bg-slate-800 px-3 py-1.5 text-white shadow-sm"
          >
            ↓ Helpers
          </a>
          <a
            href="#adv-shop"
            className="rounded-full bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-200"
          >
            Shop
          </a>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Cheapest helper
            </p>
            <p className="font-mono text-lg font-bold text-slate-900">
              {Math.min(h.hint, h.extraTime, h.fifty, h.reroll)}
            </p>
            <p className="text-[10px] text-slate-500">coins · live spend</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Stamina refill
            </p>
            <p className="font-mono text-lg font-bold text-slate-900">
              {draft.costs.staminaRefill}
            </p>
            <p className="text-[10px] text-slate-500">major soft-coin sink</p>
          </div>
        </div>
      </div>

      <Section
        id="adv-helpers"
        title="In-match helpers"
        titleFa="کمک‌های حین بازی"
        hint="Paid live during a quiz, once per question. Server re-validates & deducts."
        accent="sky"
      >
        <div className="grid gap-1.5 sm:grid-cols-2">
          <CoinField
            label="Hint"
            tip="Removes one wrong option. Cheapest live helper."
            path="helpers.hint"
            draft={draft}
            onFieldChange={onFieldChange}
          />
          <CoinField
            label="50/50"
            tip="Removes two wrong options. Stronger than Hint."
            path="helpers.fifty"
            draft={draft}
            onFieldChange={onFieldChange}
          />
          <CoinField
            label="Reroll"
            tip="Swap the current question for a new one. One of the pricier sinks."
            path="helpers.reroll"
            draft={draft}
            onFieldChange={onFieldChange}
          />
          <div className="rounded-lg border border-sky-200 bg-white p-2 sm:col-span-2">
            <p className="mb-1.5 text-[11px] font-bold text-sky-900">
              Injury Time
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <CoinField
                label="Cost"
                tip="Coins to buy Injury Time on the current question."
                path="helpers.extraTime"
                draft={draft}
                onFieldChange={onFieldChange}
              />
              <label className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-2">
                <span className="flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-700">
                  <span>Adds time</span>
                  <AdminHelpTip text="Seconds added to the fuse when Injury Time is bought. Stored as ms; minimum 1s." />
                </span>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    step={0.5}
                    value={injurySec}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n) || n <= 0) return;
                      onFieldChange(
                        "helpers.extraTimeMs",
                        String(Math.round(n * 1000)),
                      );
                    }}
                    className="h-8 font-mono text-sm font-semibold tabular-nums"
                  />
                  <span className="shrink-0 text-xs font-bold text-slate-400">
                    sec
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </Section>

      <Section
        id="adv-shop"
        title="Shop sinks"
        titleFa="فروشگاه"
        hint="Inventory / hub prices — not the live in-match helpers above."
        accent="amber"
      >
        <div className="grid gap-1.5 sm:grid-cols-3">
          <CoinField
            label="Stamina refill"
            tip="Coins to refill club stamina to full from shop / hub. Major sink."
            path="costs.staminaRefill"
            draft={draft}
            onFieldChange={onFieldChange}
          />
          <CoinField
            label="Booster 50/50"
            tip="Shop price for a fifty-fifty inventory booster (not the live helper)."
            path="costs.boosterFiftyFifty"
            draft={draft}
            onFieldChange={onFieldChange}
          />
          <CoinField
            label="Booster freeze"
            tip="Shop price for the freeze-timer inventory booster."
            path="costs.boosterFreezeTimer"
            draft={draft}
            onFieldChange={onFieldChange}
          />
        </div>
      </Section>
    </div>
  );
}
