"use client";

import type { ReactNode } from "react";
import type { GameConfig } from "@/lib/game/economy";
import { mergeGameConfig } from "@/lib/game/economy";
import { Input } from "@/components/ui/input";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";
import { StaffTemplatesEditor } from "@/components/admin/StaffTemplatesEditor";

type FieldDef = {
  key: string;
  label: string;
  description: string;
  tip: string;
  min?: number;
  step?: number;
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

function FieldGrid({
  fields,
  draft,
  onFieldChange,
  cols = 3,
}: {
  fields: FieldDef[];
  draft: GameConfig;
  onFieldChange: (path: string, raw: string) => void;
  cols?: 2 | 3 | 5;
}) {
  const grid =
    cols === 5
      ? "grid-cols-5"
      : cols === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-3";
  return (
    <div className={`grid gap-1.5 ${grid}`}>
      {fields.map((field) => (
        <label
          key={field.key}
          className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2"
        >
          <span className="flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-700">
            <span className="min-w-0 truncate">{field.label}</span>
            <AdminHelpTip
              text={`${field.description} ${field.tip}`.trim()}
            />
          </span>
          <Input
            type="number"
            min={field.min ?? 0}
            step={field.step ?? 1}
            value={getPath(draft, field.key)}
            onChange={(e) => onFieldChange(field.key, e.target.value)}
            className="h-8 font-mono text-sm font-semibold tabular-nums"
          />
        </label>
      ))}
    </div>
  );
}

function Section({
  step,
  title,
  titleFa,
  hint,
  children,
  accent = "slate",
}: {
  step: string;
  title: string;
  titleFa: string;
  hint: string;
  children: ReactNode;
  accent?: "indigo" | "emerald" | "amber" | "sky" | "slate";
}) {
  const ring =
    accent === "indigo"
      ? "border-indigo-200 bg-indigo-50/50"
      : accent === "emerald"
        ? "border-emerald-200 bg-emerald-50/40"
        : accent === "amber"
          ? "border-amber-200 bg-amber-50/40"
          : accent === "sky"
            ? "border-sky-200 bg-sky-50/40"
            : "border-slate-200 bg-slate-50/60";
  return (
    <section className={`space-y-3 rounded-2xl border p-4 ${ring}`}>
      <header className="space-y-0.5">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          {step}
        </p>
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

const STAFF_KNOBS: FieldDef[] = [
  {
    key: "businessEconomy.staff.maxHired",
    label: "Max hired",
    description: "Max staff on the club roster.",
    tip: "Default 3 — one per facility.",
    min: 1,
  },
  {
    key: "businessEconomy.staff.offerCount",
    label: "Offers shown",
    description: "How many catalog rows appear in the hire sheet.",
    tip: "Catalog order = display order.",
    min: 1,
  },
  {
    key: "businessEconomy.staff.hireCostGrowth",
    label: "Cost growth",
    description: "Multiplier on template hireCost by already-hired count.",
    tip: "cost × growth^n",
    min: 1,
    step: 0.05,
  },
];

const STARTER_FIELDS: FieldDef[] = [
  {
    key: "businessEconomy.seedFunds",
    label: "Seed Funds",
    description: "Spendable Club Funds granted once on business unlock.",
    tip: "Existing empty clubs also get this.",
  },
  {
    key: "businessEconomy.firstWinBoostBonus",
    label: "First-win +",
    description: "Added to 1.0 on facility rates after first win of day.",
    tip: "0.2 → +20%.",
    min: 0,
    step: 0.05,
  },
];

const VAULT_CORE_FIELDS: FieldDef[] = [
  {
    key: "businessEconomy.vault.baseCost",
    label: "Upgrade cost",
    description: "Funds cost for vault level 1 → 2.",
    tip: "Grows by costGrowth.",
  },
  {
    key: "businessEconomy.vault.costGrowth",
    label: "Cost ×",
    description: "Multiplier per vault level.",
    tip: "2 = doubles each level.",
    min: 1,
    step: 0.1,
  },
  {
    key: "businessEconomy.vault.maxLevel",
    label: "Max Lv",
    description: "Highest vault tier.",
    tip: "Keep in sync with hours row.",
    min: 1,
  },
];

const VAULT_HOUR_KEYS = [
  "businessEconomy.vault.capHours.0",
  "businessEconomy.vault.capHours.1",
  "businessEconomy.vault.capHours.2",
  "businessEconomy.vault.capHours.3",
  "businessEconomy.vault.capHours.4",
] as const;

const SPONSOR_FIELDS: FieldDef[] = [
  {
    key: "businessEconomy.sponsorOffice.unlockPlayerLevel",
    label: "Unlock PL",
    description: "Player Level to build Sponsor Office.",
    tip: "Default 4.",
    min: 1,
  },
  {
    key: "businessEconomy.sponsorOffice.buildCost",
    label: "Build cost",
    description: "Funds to open the office.",
    tip: "Default 400.",
    min: 0,
  },
  {
    key: "businessEconomy.sponsorOffice.upgradeBaseCost",
    label: "Upgrade base",
    description: "First office upgrade cost.",
    tip: "Default 800.",
    min: 1,
  },
  {
    key: "businessEconomy.sponsorOffice.payoutIntervalHours",
    label: "Payout hours",
    description: "Hours between deal payout ticks.",
    tip: "Default 4.",
    min: 1,
  },
  {
    key: "businessEconomy.sponsorOffice.facilityBonusCapPercent",
    label: "Facility bonus cap %",
    description: "Max summed soft rate bonus from deals.",
    tip: "Default 25.",
    min: 0,
  },
  {
    key: "businessEconomy.sponsorOffice.maxCatchupTicks",
    label: "Catch-up ticks",
    description: "Max missed payout ticks on one settle.",
    tip: "Default 3.",
    min: 1,
  },
];

const BANK_FIELDS: FieldDef[] = [
  {
    key: "businessEconomy.sponsoredBank.interestPercent",
    label: "Interest %",
    description: "Percent per tick (floored).",
    tip: "1 = 1%.",
    min: 0,
    step: 0.5,
  },
  {
    key: "businessEconomy.sponsoredBank.intervalHours",
    label: "Interval hours",
    description: "Hours between interest ticks.",
    tip: "Default 4.",
    min: 1,
  },
  {
    key: "businessEconomy.sponsoredBank.minBalance",
    label: "Min balance",
    description: "Minimum Bank balance for a non-zero tick.",
    tip: "At 1%, need 100 for +1.",
    min: 0,
  },
  {
    key: "businessEconomy.sponsoredBank.maxInterestPerTick",
    label: "Cap / tick",
    description: "Max Funds per interest tick.",
    tip: "Anti-snowball.",
    min: 0,
  },
  {
    key: "businessEconomy.sponsoredBank.upgradeCost",
    label: "Activate cost",
    description: "Funds to activate sponsored bank.",
    tip: "0 = free.",
    min: 0,
  },
  {
    key: "businessEconomy.sponsoredBank.maxCatchupTicks",
    label: "Catch-up ticks",
    description: "Max missed ticks on one settle.",
    tip: "Default 3.",
    min: 1,
  },
];

const FACILITY_FIELDS: FieldDef[] = [
  {
    key: "businessEconomy.facilities.TICKET_OFFICE.baseRatePerHour",
    label: "Ticket rate / h",
    description: "Level-1 Ticket Office Funds per hour.",
    tip: "FTUE earner.",
  },
  {
    key: "businessEconomy.facilities.TICKET_OFFICE.baseBuildCost",
    label: "Ticket build",
    description: "Funds to open Ticket Office.",
    tip: "0 = free.",
  },
  {
    key: "businessEconomy.facilities.TICKET_OFFICE.unlockPlayerLevel",
    label: "Ticket unlock Lv",
    description: "Player level gate.",
    tip: "Usually 1.",
    min: 1,
  },
  {
    key: "businessEconomy.facilities.CLUB_SHOP.baseRatePerHour",
    label: "Shop rate / h",
    description: "Level-1 Club Shop base rate.",
    tip: "Before fans factor.",
  },
  {
    key: "businessEconomy.facilities.CLUB_SHOP.baseBuildCost",
    label: "Shop build",
    description: "Funds to open Club Shop.",
    tip: "Mid sink.",
  },
  {
    key: "businessEconomy.facilities.CLUB_SHOP.unlockPlayerLevel",
    label: "Shop unlock Lv",
    description: "Player level gate.",
    tip: "Default 3.",
    min: 1,
  },
  {
    key: "businessEconomy.shopFansDivisor",
    label: "Shop fans ÷",
    description: "Fans bonus divisor.",
    tip: "Higher = slower scaling.",
    min: 1,
  },
  {
    key: "businessEconomy.shopFansBonusCap",
    label: "Shop fans cap",
    description: "Max fans bonus fraction.",
    tip: "0.5 → +50%.",
    min: 0,
    step: 0.05,
  },
  {
    key: "businessEconomy.facilities.MUSEUM.baseRatePerHour",
    label: "Museum rate / h",
    description: "Level-1 Museum Funds per hour.",
    tip: "Late idle.",
  },
  {
    key: "businessEconomy.facilities.MUSEUM.baseBuildCost",
    label: "Museum build",
    description: "Funds to open Museum.",
    tip: "Default 2500.",
  },
  {
    key: "businessEconomy.facilities.MUSEUM.unlockPlayerLevel",
    label: "Museum unlock Lv",
    description: "Player level gate.",
    tip: "Default 5.",
    min: 1,
  },
];

type ClubBizConfigSectionsProps = {
  draft: GameConfig;
  setDraft: React.Dispatch<React.SetStateAction<GameConfig>>;
  onFieldChange: (path: string, raw: string) => void;
};

/**
 * Clear Club Biz layout: Managers first, then economy blocks.
 */
export function ClubBizConfigSections({
  draft,
  setDraft,
  onFieldChange,
}: ClubBizConfigSectionsProps) {
  const bank = draft.businessEconomy.sponsoredBank;
  const staffOn = draft.businessEconomy.staff.enabled;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-300 bg-linear-to-br from-emerald-50 to-white px-4 py-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
          Club Biz · اقتصاد باشگاه
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">
          Club Funds (idle)
        </h2>
        <p className="mt-1 max-w-xl text-sm text-slate-600">
          فقط پول کسب‌وکار باشگاه — به سکه‌های مسابقه وصل نیست. مدیران، صندوق،
          بانک اسپانسر و واحدها اینجاست.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
          <a
            href="#club-managers"
            className="rounded-full bg-indigo-600 px-3 py-1.5 text-white shadow-sm"
          >
            ↓ Managers / مدیران
          </a>
          <a
            href="#club-safe"
            className="rounded-full bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-200"
          >
            Safe
          </a>
          <a
            href="#club-bank"
            className="rounded-full bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-200"
          >
            Bank
          </a>
          <a
            href="#club-facilities"
            className="rounded-full bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-200"
          >
            Facilities
          </a>
        </div>
      </div>

      <Section
        step="1 · Primary"
        title="Managers"
        titleFa="مدیران"
        hint="Hire catalog shown in the Hub. Order = offer order. Unaffordable rows gray out for players."
        accent="indigo"
      >
        <div id="club-managers" className="scroll-mt-28 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2.5">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Staff hiring {staffOn ? "ON" : "OFF"}
              </p>
              <p className="text-[11px] text-slate-500">
                Toggle the whole managers feature for players
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-800">
              <input
                type="checkbox"
                className="h-4 w-4 accent-indigo-600"
                checked={staffOn}
                onChange={(e) =>
                  setDraft((prev) =>
                    mergeGameConfig({
                      ...prev,
                      businessEconomy: {
                        ...prev.businessEconomy,
                        staff: {
                          ...prev.businessEconomy.staff,
                          enabled: e.target.checked,
                        },
                      },
                    }),
                  )
                }
              />
              Enabled
            </label>
          </div>
          <FieldGrid
            fields={STAFF_KNOBS}
            draft={draft}
            onFieldChange={onFieldChange}
          />
          <StaffTemplatesEditor draft={draft} setDraft={setDraft} />
        </div>
      </Section>

      <Section
        step="2"
        title="Starter & boost"
        titleFa="شروع و بونوس"
        hint="Seed Funds for new clubs + first-win income boost."
        accent="emerald"
      >
        <div className="grid gap-1.5 sm:grid-cols-3">
          {STARTER_FIELDS.map((field) => (
            <label
              key={field.key}
              className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2"
            >
              <span className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                <span>{field.label}</span>
                <AdminHelpTip
                  text={`${field.description} ${field.tip}`.trim()}
                />
              </span>
              <Input
                type="number"
                min={field.min ?? 0}
                step={field.step ?? 1}
                value={getPath(draft, field.key)}
                onChange={(e) => onFieldChange(field.key, e.target.value)}
                className="h-8 font-mono text-sm font-semibold tabular-nums"
              />
            </label>
          ))}
          <label className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
            <span className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
              Boost hours
              <AdminHelpTip text="First-win income boost duration in hours (stored as ms)." />
            </span>
            <Input
              type="number"
              min={0.25}
              step={0.25}
              value={
                Math.round(
                  (getPath(draft, "businessEconomy.firstWinBoostMs") /
                    3_600_000) *
                    100,
                ) / 100
              }
              onChange={(e) => {
                const hours = Number(e.target.value);
                if (!Number.isFinite(hours) || hours <= 0) return;
                onFieldChange(
                  "businessEconomy.firstWinBoostMs",
                  String(Math.round(hours * 3_600_000)),
                );
              }}
              className="h-8 font-mono text-sm font-semibold tabular-nums"
            />
          </label>
        </div>
      </Section>

      <Section
        step="3"
        title="Safe (Vault)"
        titleFa="صندوق"
        hint="Holding tank after Collect. Withdraw when full (unless Treasurer)."
        accent="amber"
      >
        <div id="club-safe" className="scroll-mt-28 space-y-2">
          <FieldGrid
            fields={VAULT_CORE_FIELDS}
            draft={draft}
            onFieldChange={onFieldChange}
            cols={3}
          />
          <div>
            <p className="mb-1 text-[11px] font-bold text-slate-600">
              Capacity hours by level
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {VAULT_HOUR_KEYS.map((key, i) => (
                <label
                  key={key}
                  className="flex flex-col gap-0.5 rounded-lg border border-amber-200 bg-white px-2 py-1.5"
                >
                  <span className="text-center text-[10px] font-bold text-slate-500">
                    L{i + 1}
                  </span>
                  <Input
                    type="number"
                    min={1}
                    value={getPath(draft, key)}
                    onChange={(e) => onFieldChange(key, e.target.value)}
                    className="h-8 px-1 text-center font-mono text-sm font-semibold"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section
        step="4"
        title="Sponsored Bank"
        titleFa="بانک اسپانسر"
        hint="Optional interest on spendable Funds. Lazy settle — no mint cron."
        accent="sky"
      >
        <div id="club-bank" className="scroll-mt-28 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2.5">
            <p className="text-sm font-bold text-slate-900">
              Sponsored bank {bank.enabled ? "ON" : "OFF"}
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                className="h-4 w-4 accent-sky-600"
                checked={bank.enabled}
                onChange={(e) =>
                  setDraft((prev) =>
                    mergeGameConfig({
                      ...prev,
                      businessEconomy: {
                        ...prev.businessEconomy,
                        sponsoredBank: {
                          ...prev.businessEconomy.sponsoredBank,
                          enabled: e.target.checked,
                        },
                      },
                    }),
                  )
                }
              />
              Enabled
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <span className="text-xs font-semibold text-slate-600">
                Name (EN)
              </span>
              <Input
                value={bank.nameEn}
                onChange={(e) =>
                  setDraft((prev) =>
                    mergeGameConfig({
                      ...prev,
                      businessEconomy: {
                        ...prev.businessEconomy,
                        sponsoredBank: {
                          ...prev.businessEconomy.sponsoredBank,
                          nameEn: e.target.value,
                        },
                      },
                    }),
                  )
                }
                className="h-9 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <span className="text-xs font-semibold text-slate-600">
                Name (FA)
              </span>
              <Input
                value={bank.nameFa}
                onChange={(e) =>
                  setDraft((prev) =>
                    mergeGameConfig({
                      ...prev,
                      businessEconomy: {
                        ...prev.businessEconomy,
                        sponsoredBank: {
                          ...prev.businessEconomy.sponsoredBank,
                          nameFa: e.target.value,
                        },
                      },
                    }),
                  )
                }
                className="h-9 text-sm"
                dir="rtl"
              />
            </label>
          </div>
          <FieldGrid
            fields={BANK_FIELDS}
            draft={draft}
            onFieldChange={onFieldChange}
          />
        </div>
      </Section>

      <Section
        step="5"
        title="Sponsor Office"
        titleFa="دفتر اسپانسر"
        hint="Commercial deals → Funds ticks + soft facility rate bonus. Catalog lives in GameConfig defaults / JSON."
        accent="sky"
      >
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(draft.businessEconomy.sponsorOffice?.enabled)}
              onChange={(e) =>
                setDraft((prev) =>
                  mergeGameConfig({
                    ...prev,
                    businessEconomy: {
                      ...prev.businessEconomy,
                      sponsorOffice: {
                        ...prev.businessEconomy.sponsorOffice,
                        enabled: e.target.checked,
                      },
                    },
                  }),
                )
              }
            />
            Enabled
          </label>
          <FieldGrid
            fields={SPONSOR_FIELDS}
            draft={draft}
            onFieldChange={onFieldChange}
          />
        </div>
      </Section>

      <Section
        step="6"
        title="Facilities"
        titleFa="واحدها"
        hint="Ticket Office, Club Shop, Museum rates and unlocks."
        accent="slate"
      >
        <div id="club-facilities" className="scroll-mt-28">
          <FieldGrid
            fields={FACILITY_FIELDS}
            draft={draft}
            onFieldChange={onFieldChange}
          />
        </div>
      </Section>
    </div>
  );
}
