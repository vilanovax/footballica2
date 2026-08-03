"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { FacilityView } from "@/lib/club/businessEconomy";
import type { BusinessFacilityKey } from "@/lib/club/businessEconomy";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";

const FACILITY_META: Record<
  BusinessFacilityKey,
  {
    icon: string;
    nameKey: string;
    descKey: string;
    /** Hero gradient wash */
    hero: string;
    /** Glow blob color */
    glow: string;
    pip: string;
  }
> = {
  TICKET_OFFICE: {
    icon: "🎫",
    nameKey: "club.biz.ticketOffice",
    descKey: "club.biz.ticketOfficeDesc",
    hero: "from-[#0d3b2e] via-[#145c45] to-[#1a7a55]",
    glow: "bg-emerald-400/40",
    pip: "bg-emerald-400",
  },
  CLUB_SHOP: {
    icon: "🛍️",
    nameKey: "club.biz.clubShop",
    descKey: "club.biz.clubShopDesc",
    hero: "from-[#0c2d4a] via-[#134e75] to-[#1d6fa5]",
    glow: "bg-sky-400/40",
    pip: "bg-sky-400",
  },
  MUSEUM: {
    icon: "🏆",
    nameKey: "club.biz.museum",
    descKey: "club.biz.museumDesc",
    hero: "from-[#3d2a08] via-[#7a5410] to-[#b8860b]",
    glow: "bg-amber-400/40",
    pip: "bg-amber-400",
  },
};

function facilityShellClass(level: number, status: string): string {
  if (status === "LOCKED") {
    return "border-slate-200 bg-slate-50/80 opacity-80";
  }
  if (status === "AVAILABLE") {
    return "border-emerald-300 bg-gradient-to-br from-emerald-50 to-white ring-1 ring-emerald-100 shadow-fantasy-sm";
  }
  if (level >= 4) {
    return "border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-fantasy ring-1 ring-amber-100";
  }
  if (level >= 2) {
    return "border-sky-300 bg-gradient-to-br from-sky-50 to-white ring-1 ring-sky-100 shadow-fantasy-sm";
  }
  return "border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white shadow-fantasy-sm";
}

function formatDuration(ms: number, locale: "en" | "fa"): string {
  if (ms <= 0) return "—";
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) {
    return locale === "fa"
      ? `${toLocaleDigits(m, locale)} د`
      : `${m}m`;
  }
  return locale === "fa"
    ? `${toLocaleDigits(h, locale)} س ${toLocaleDigits(m, locale)} د`
    : `${h}h ${m}m`;
}

type FacilityBusinessCardProps = {
  facility: FacilityView;
  clubFunds: number;
  pending: boolean;
  onBuild: () => void;
  onUpgrade: () => void;
};

/**
 * Slim Hub row + immersive game BottomSheet for a business unit.
 */
export function FacilityBusinessCard({
  facility: f,
  clubFunds,
  pending,
  onBuild,
  onUpgrade,
}: FacilityBusinessCardProps) {
  const { t, locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const meta = FACILITY_META[f.key];
  const isMax = f.status === "BUILT" && f.upgradeCost === null;
  const rateDelta =
    f.status === "BUILT" && f.nextRatePerHour != null
      ? f.nextRatePerHour - f.ratePerHour
      : null;
  const fillPct = Math.round(f.fillRatio * 100);

  function openSheet() {
    haptic(HAPTIC.light);
    playSound("click");
    setOpen(true);
  }

  const subtitle =
    f.status === "BUILT"
      ? t("club.biz.levelOf", {
          n: toLocaleDigits(f.level, locale),
          max: toLocaleDigits(f.maxLevel, locale),
        })
      : f.status === "AVAILABLE"
        ? t("club.biz.readyToBuild")
        : t("club.biz.unlockAt", {
            n: toLocaleDigits(f.unlockPlayerLevel, locale),
          });

  return (
    <>
      <motion.div
        role="button"
        tabIndex={0}
        onClick={openSheet}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openSheet();
          }
        }}
        whileTap={{ scale: 0.985 }}
        className={[
          "cursor-pointer rounded-2xl border px-3 py-3 transition-shadow active:shadow-inner",
          facilityShellClass(f.level, f.status),
        ].join(" ")}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={[
              "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl shadow-fantasy-sm",
              f.status === "BUILT"
                ? f.level >= 4
                  ? "bg-amber-200/80"
                  : f.level >= 2
                    ? "bg-sky-200/70"
                    : "bg-emerald-200/70"
                : "bg-slate-200/80",
            ].join(" ")}
            aria-hidden
          >
            {meta.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-display text-sm font-bold text-foreground">
                {t(meta.nameKey)}
              </p>
              {f.status === "BUILT" && (
                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    f.level >= 4
                      ? "bg-amber-200 text-amber-950"
                      : f.level >= 2
                        ? "bg-sky-200 text-sky-950"
                        : "bg-emerald-200 text-emerald-950",
                  ].join(" ")}
                >
                  {t("club.biz.level", {
                    n: toLocaleDigits(f.level, locale),
                  })}
                </span>
              )}
              {f.status === "AVAILABLE" && (
                <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-950">
                  {t("club.biz.readyToBuild")}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate font-display text-[11px] font-semibold text-muted-foreground">
              {f.status === "BUILT"
                ? t("club.biz.rowRate", {
                    rate: toLocaleDigits(f.ratePerHour, locale),
                    ready: toLocaleDigits(f.storedAmount, locale),
                  })
                : f.status === "AVAILABLE" && f.nextRatePerHour != null
                  ? t("club.biz.previewIncome", {
                      rate: toLocaleDigits(f.nextRatePerHour, locale),
                    })
                  : t("club.biz.unlockAt", {
                      n: toLocaleDigits(f.unlockPlayerLevel, locale),
                    })}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {f.status === "BUILT" && isMax && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                MAX
              </span>
            )}
            {f.status === "AVAILABLE" && f.buildCost !== null && (
              <span className="max-w-20 text-end font-display text-[11px] font-black leading-tight text-secondary">
                {f.buildCost === 0
                  ? t("club.biz.buildFree")
                  : t("club.biz.cardBuild", {
                      n: toLocaleDigits(f.buildCost, locale),
                    })}
              </span>
            )}
            {f.status === "BUILT" && f.upgradeCost !== null && (
              <span
                className={[
                  "max-w-20 text-end font-display text-[11px] font-black leading-tight",
                  f.canUpgrade ? "text-emerald-800" : "text-muted-foreground",
                ].join(" ")}
              >
                {t("club.biz.cardUpgrade", {
                  n: toLocaleDigits(f.upgradeCost, locale),
                })}
              </span>
            )}
            <ChevronRight
              className="h-4 w-4 text-muted-foreground rtl:rotate-180"
              aria-hidden
            />
          </div>
        </div>

        {f.status === "BUILT" && f.storageCap > 0 && (
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-black/5">
            <motion.div
              className={[
                "h-full rounded-full",
                f.fillRatio >= 0.9 ? "bg-amber-500" : "bg-emerald-500",
              ].join(" ")}
              initial={false}
              animate={{ width: `${fillPct}%` }}
            />
          </div>
        )}
      </motion.div>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t(meta.nameKey)}
        subtitle={subtitle}
        closeLabel={t("common.close")}
        tone="dark"
      >
        {/* Hero — collectable / income as the star number */}
        <div
          className={[
            "relative -mx-1 overflow-hidden rounded-bubble-xl border border-white/15 bg-gradient-to-br shadow-[0_8px_0_0_rgba(0,0,0,0.35)]",
            meta.hero,
          ].join(" ")}
        >
          <div
            className={[
              "pointer-events-none absolute -end-10 -top-8 h-36 w-36 rounded-full blur-3xl",
              meta.glow,
            ].join(" ")}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-14deg, transparent, transparent 14px, #fff 14px, #fff 15px)",
            }}
            aria-hidden
          />

          <div className="relative flex flex-col items-center px-4 pb-5 pt-5">
            <motion.span
              className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/30 bg-black/30 text-4xl shadow-[0_0_36px_rgba(255,255,255,0.18)]"
              animate={{ y: [0, -4, 0] }}
              transition={{
                repeat: Infinity,
                duration: 2.4,
                ease: "easeInOut",
              }}
              aria-hidden
            >
              {meta.icon}
            </motion.span>

            {f.status === "BUILT" && (
              <>
                <div className="mt-2.5 flex items-center gap-1">
                  {Array.from({ length: f.maxLevel }, (_, i) => (
                    <span
                      key={i}
                      className={[
                        "h-2 w-2 rounded-full border border-white/30",
                        i < f.level ? meta.pip : "bg-white/10",
                      ].join(" ")}
                      aria-hidden
                    />
                  ))}
                </div>
                <p className="mt-2 font-display text-[11px] font-bold uppercase tracking-widest text-white/55">
                  {t("club.biz.statReady")}
                </p>
                <motion.p
                  key={f.storedAmount}
                  initial={{ scale: 0.92, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  dir="ltr"
                  className={[
                    "font-display text-5xl font-black tabular-nums tracking-tight drop-shadow-[0_2px_0_rgba(0,0,0,0.35)]",
                    f.fillRatio >= 0.9 ? "text-amber-300" : "text-white",
                  ].join(" ")}
                >
                  {toLocaleDigits(f.storedAmount, locale)}
                </motion.p>
                <p className="mt-1 font-display text-xs font-bold text-white/75">
                  {t("club.biz.facilityHeroHint", {
                    rate: toLocaleDigits(f.ratePerHour, locale),
                  })}
                </p>
                {f.storageCap > 0 && (
                  <div className="mt-3 w-full max-w-[14rem]">
                    <div className="mb-1 flex justify-between font-display text-[10px] font-bold text-white/50">
                      <span>
                        {toLocaleDigits(fillPct, locale)}%
                      </span>
                      <span>
                        {f.msUntilFull > 0
                          ? formatDuration(f.msUntilFull, locale)
                          : t("club.biz.bufferFull")}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full border border-white/20 bg-black/40">
                      <motion.div
                        className={[
                          "h-full rounded-full",
                          f.fillRatio >= 0.9
                            ? "bg-gradient-to-r from-amber-400 to-orange-400"
                            : "bg-gradient-to-r from-emerald-400 to-lime-300",
                        ].join(" ")}
                        initial={false}
                        animate={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {f.status === "AVAILABLE" && f.nextRatePerHour != null && (
              <>
                <p className="mt-3 font-display text-[11px] font-bold uppercase tracking-widest text-white/55">
                  {t("club.biz.readyToBuild")}
                </p>
                <p
                  dir="ltr"
                  className="font-display text-4xl font-black tabular-nums text-white"
                >
                  {toLocaleDigits(f.nextRatePerHour, locale)}
                </p>
                <p className="mt-1 font-display text-xs font-bold text-white/75">
                  {t("club.biz.facilityPreviewHint")}
                </p>
              </>
            )}

            {f.status === "LOCKED" && (
              <>
                <p className="mt-3 rounded-full bg-white/15 px-3 py-1 font-display text-xs font-black text-white/85 ring-1 ring-white/20">
                  🔒{" "}
                  {t("club.biz.unlockAt", {
                    n: toLocaleDigits(f.unlockPlayerLevel, locale),
                  })}
                </p>
                {f.nextRatePerHour != null && (
                  <p className="mt-2 font-display text-xs font-bold text-white/65">
                    {t("club.biz.previewIncome", {
                      rate: toLocaleDigits(f.nextRatePerHour, locale),
                    })}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <p className="mt-3 text-center font-display text-xs font-bold text-white/55">
          {t(meta.descKey)}
        </p>

        {/* Built: two key numbers only */}
        {f.status === "BUILT" && (
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-bubble-xl border-2 border-white/12 bg-white/8 px-3 py-3 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]">
              <p className="font-display text-[10px] font-black uppercase tracking-wide text-white/50">
                ⚡ {t("club.biz.statRate")}
              </p>
              <p
                dir="ltr"
                className="mt-1 font-display text-xl font-black tabular-nums text-white"
              >
                {t("club.biz.rateValue", {
                  n: toLocaleDigits(f.ratePerHour, locale),
                })}
              </p>
            </div>
            <div className="rounded-bubble-xl border-2 border-white/12 bg-white/8 px-3 py-3 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]">
              <p className="font-display text-[10px] font-black uppercase tracking-wide text-white/50">
                📦 {t("club.biz.statCap")}
              </p>
              <p
                dir="ltr"
                className="mt-1 font-display text-xl font-black tabular-nums text-white"
              >
                {toLocaleDigits(f.storageCap, locale)}
              </p>
            </div>
          </div>
        )}

        {/* Upgrade offer = card + CTA (bank style) */}
        {f.status === "BUILT" && !isMax && f.upgradeCost != null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mt-4 overflow-hidden rounded-bubble-xl border-2 border-accent bg-gradient-to-br from-accent/30 via-[#2a1f08] to-[#12100a] p-1 shadow-[0_6px_0_0_hsl(var(--accent-deep))]"
          >
            <div className="rounded-[1.1rem] bg-gradient-to-b from-black/20 to-black/50 px-3.5 pb-3.5 pt-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-2xl shadow-[0_3px_0_0_hsl(var(--accent-deep))]"
                  aria-hidden
                >
                  ⬆
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[10px] font-black uppercase tracking-widest text-accent">
                    {t("club.biz.nextUpgrade")}
                  </p>
                  <p className="font-display text-lg font-black text-white">
                    {t("club.biz.level", {
                      n: toLocaleDigits(f.level + 1, locale),
                    })}
                    {rateDelta != null && rateDelta > 0 && (
                      <span className="ms-2 text-lime-300">
                        {t("club.biz.rateDelta", {
                          n: toLocaleDigits(rateDelta, locale),
                        })}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <motion.button
                type="button"
                disabled={pending || !f.canUpgrade}
                onClick={() => {
                  setOpen(false);
                  onUpgrade();
                }}
                whileTap={pending || !f.canUpgrade ? undefined : { y: 3 }}
                className={[
                  "mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-bubble-xl px-4 font-display text-base font-black",
                  f.canUpgrade
                    ? "bg-accent text-accent-foreground shadow-[0_5px_0_0_hsl(var(--accent-deep))]"
                    : "cursor-not-allowed border-2 border-white/15 bg-white/10 text-white/55",
                ].join(" ")}
              >
                {f.canUpgrade ? (
                  <>
                    <span>{t("club.biz.upgradeShort")}</span>
                    <span
                      dir="ltr"
                      className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-0.5 text-sm"
                    >
                      💎 {toLocaleDigits(f.upgradeCost, locale)}
                    </span>
                  </>
                ) : (
                  t("club.biz.needFunds", {
                    n: toLocaleDigits(f.upgradeCost, locale),
                    have: toLocaleDigits(clubFunds, locale),
                  })
                )}
              </motion.button>
            </div>
          </motion.div>
        )}

        {isMax && (
          <div className="mt-4 rounded-bubble-xl border-2 border-amber-400/50 bg-amber-500/15 px-3 py-3 text-center">
            <p className="font-display text-base font-black text-amber-300">
              👑 {t("club.biz.maxed")}
            </p>
          </div>
        )}

        {f.status === "AVAILABLE" && f.buildCost !== null && (
          <motion.button
            type="button"
            disabled={pending || !f.canBuild}
            onClick={() => {
              setOpen(false);
              onBuild();
            }}
            whileTap={pending || !f.canBuild ? undefined : { y: 3 }}
            className={[
              "mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-bubble-xl px-4 font-display text-base font-black",
              f.canBuild
                ? "bg-accent text-accent-foreground shadow-[0_6px_0_0_hsl(var(--accent-deep))]"
                : "cursor-not-allowed border-2 border-white/15 bg-white/10 text-white/55",
            ].join(" ")}
          >
            {f.buildCost === 0 ? (
              t("club.biz.buildFree")
            ) : f.canBuild ? (
              <>
                <span>{t("club.biz.buildShort")}</span>
                <span
                  dir="ltr"
                  className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-0.5 text-sm"
                >
                  💎 {toLocaleDigits(f.buildCost, locale)}
                </span>
              </>
            ) : (
              t("club.biz.needFunds", {
                n: toLocaleDigits(f.buildCost, locale),
                have: toLocaleDigits(clubFunds, locale),
              })
            )}
          </motion.button>
        )}
      </BottomSheet>
    </>
  );
}
