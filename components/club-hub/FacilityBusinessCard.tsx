"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { FacilityView } from "@/lib/club/businessEconomy";
import type { BusinessFacilityKey } from "@/lib/club/businessEconomy";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FundsCost } from "@/components/club-hub/FundsCost";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";
import { staffDisplayName } from "@/lib/club/staff";
import { useLiveFacilityFill } from "@/lib/club/useLiveFacilityFill";

const FACILITY_META: Record<
  BusinessFacilityKey,
  {
    icon: string;
    nameKey: string;
    descKey: string;
    /** Hero gradient wash */
    hero: string;
    /** Hub row panel wash */
    row: string;
    /** Glow blob color */
    glow: string;
    pip: string;
    rim: string;
  }
> = {
  TICKET_OFFICE: {
    icon: "🎫",
    nameKey: "club.biz.ticketOffice",
    descKey: "club.biz.ticketOfficeDesc",
    hero: "from-[#0d3b2e] via-[#145c45] to-[#1a7a55]",
    row: "from-[#0f3d32] via-[#16634a] to-[#0c2e26]",
    glow: "bg-emerald-400/40",
    pip: "bg-emerald-400",
    rim: "border-emerald-400/55",
  },
  CLUB_SHOP: {
    icon: "🛍️",
    nameKey: "club.biz.clubShop",
    descKey: "club.biz.clubShopDesc",
    hero: "from-[#0c2d4a] via-[#134e75] to-[#1d6fa5]",
    row: "from-[#0c2d4a] via-[#155a8a] to-[#0a243c]",
    glow: "bg-sky-400/40",
    pip: "bg-sky-400",
    rim: "border-sky-400/55",
  },
  MUSEUM: {
    icon: "🏆",
    nameKey: "club.biz.museum",
    descKey: "club.biz.museumDesc",
    hero: "from-[#3d2a08] via-[#7a5410] to-[#b8860b]",
    row: "from-[#3d2a08] via-[#8a5a12] to-[#2a1c06]",
    glow: "bg-amber-400/40",
    pip: "bg-amber-400",
    rim: "border-amber-400/55",
  },
};

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
  /** Open staff sheet focused on this facility desk. */
  onManageStaff?: () => void;
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
  onManageStaff,
}: FacilityBusinessCardProps) {
  const { t, locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const meta = FACILITY_META[f.key];
  const isMax = f.status === "BUILT" && f.upgradeCost === null;
  const rateDelta =
    f.status === "BUILT" && f.nextRatePerHour != null
      ? f.nextRatePerHour - f.ratePerHour
      : null;
  const live = useLiveFacilityFill(f);

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

  const rowRim =
    f.status === "LOCKED"
      ? "border-white/15"
      : f.status === "AVAILABLE"
        ? "border-accent/70"
        : meta.rim;

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
        whileTap={{ scale: 0.985, y: 2 }}
        className={[
          "relative cursor-pointer overflow-hidden rounded-bubble-xl border-[3px] px-3 py-3 shadow-[0_5px_0_0_rgba(0,0,0,0.28)]",
          rowRim,
          f.status === "LOCKED" ? "opacity-90" : "",
        ].join(" ")}
      >
        <div
          className={[
            "absolute inset-0 bg-linear-to-br",
            f.status === "LOCKED"
              ? "from-[#1e293b] via-[#334155] to-[#0f172a]"
              : f.status === "AVAILABLE"
                ? "from-[#14532d] via-[#166534] to-[#052e16]"
                : meta.row,
          ].join(" ")}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-16deg, transparent, transparent 11px, #fff 11px, #fff 12px)",
          }}
          aria-hidden
        />
        {f.status === "BUILT" && live.fillPct > 0 && (
          <motion.div
            aria-hidden
            className={["pointer-events-none absolute -end-8 top-0 h-24 w-24 rounded-full blur-2xl", meta.glow].join(
              " ",
            )}
            animate={{ opacity: [0.25, 0.55, 0.25] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          />
        )}

        <div className="relative flex items-center gap-3">
          <div className="relative shrink-0">
            <span
              className={[
                "flex h-14 w-14 items-center justify-center rounded-2xl border-2 text-2xl shadow-[0_3px_0_0_rgba(0,0,0,0.35)]",
                f.status === "LOCKED"
                  ? "border-white/15 bg-black/30 grayscale"
                  : f.status === "AVAILABLE"
                    ? "border-accent/80 bg-accent/20"
                    : "border-white/25 bg-black/30",
              ].join(" ")}
              aria-hidden
            >
              {meta.icon}
            </span>
            {f.status === "LOCKED" && (
              <span
                className="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0f172a] bg-slate-800 text-[11px] shadow-md"
                aria-hidden
              >
                🔒
              </span>
            )}
            {f.status === "BUILT" && (
              <span className="absolute -bottom-1 -start-1 rounded-full bg-black/55 px-1.5 py-0.5 font-display text-[9px] font-black text-white ring-1 ring-white/25">
                Lv{toLocaleDigits(f.level, locale)}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-display text-sm font-black text-white drop-shadow-sm">
                {t(meta.nameKey)}
              </p>
              {f.status === "AVAILABLE" && (
                <span className="rounded-full bg-accent px-2 py-0.5 font-display text-[10px] font-black text-accent-foreground shadow-[0_2px_0_0_hsl(var(--accent-deep))]">
                  {t("club.biz.readyToBuild")}
                </span>
              )}
              {f.staff && (
                <span className="rounded-full bg-indigo-400/25 px-2 py-0.5 font-display text-[10px] font-black text-indigo-100 ring-1 ring-indigo-300/40">
                  👔 +{toLocaleDigits(f.staff.rateBonusPercent, locale)}%
                </span>
              )}
              {isMax && (
                <span className="rounded-full bg-amber-400/30 px-2 py-0.5 font-display text-[10px] font-black text-amber-100 ring-1 ring-amber-300/50">
                  MAX
                </span>
              )}
            </div>

            {f.status === "BUILT" ? (
              <div className="mt-1 flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/coin.png"
                  alt=""
                  aria-hidden
                  className="h-3.5 w-3.5"
                />
                <p className="truncate font-display text-[11px] font-bold text-white/75">
                  {toLocaleDigits(f.ratePerHour, locale)}
                  /{locale === "fa" ? "ساعت" : "hr"}
                  <span className="text-white/40"> · </span>
                  <span
                    className={
                      live.isFull ? "text-amber-200" : "text-emerald-200"
                    }
                  >
                    {toLocaleDigits(live.liveAmount, locale)}{" "}
                    {locale === "fa" ? "آماده" : "ready"}
                  </span>
                </p>
              </div>
            ) : (
              <p className="mt-1 truncate font-display text-[11px] font-bold text-white/70">
                {f.status === "AVAILABLE" && f.nextRatePerHour != null
                  ? t("club.biz.previewIncome", {
                      rate: toLocaleDigits(f.nextRatePerHour, locale),
                    })
                  : t("club.biz.unlockAt", {
                      n: toLocaleDigits(f.unlockPlayerLevel, locale),
                    })}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {f.status === "AVAILABLE" && f.buildCost !== null && (
              <span
                className={[
                  "inline-flex min-h-9 items-center gap-1 rounded-bubble px-2.5 py-1.5 font-display text-[11px] font-black shadow-[0_3px_0_0_rgba(0,0,0,0.35)]",
                  f.canBuild
                    ? "bg-accent text-accent-foreground"
                    : "bg-white/15 text-white/55",
                ].join(" ")}
              >
                {f.buildCost === 0 ? (
                  t("club.biz.buildFree")
                ) : (
                  <>
                    {t("club.biz.buildShort")}
                    <FundsCost
                      amount={f.buildCost}
                      variant="plain"
                      className="text-[11px] font-black"
                    />
                  </>
                )}
              </span>
            )}
            {f.status === "BUILT" && f.upgradeCost !== null && (
              <span
                className={[
                  "inline-flex min-h-9 items-center gap-1 rounded-bubble px-2.5 py-1.5 font-display text-[11px] font-black shadow-[0_3px_0_0_rgba(0,0,0,0.35)]",
                  f.canUpgrade
                    ? "bg-accent text-accent-foreground"
                    : "bg-white/15 text-white/55",
                ].join(" ")}
              >
                {t("club.biz.upgradeShort")}
                <FundsCost
                  amount={f.upgradeCost}
                  variant="plain"
                  className="text-[11px] font-black"
                />
              </span>
            )}
            {f.status === "LOCKED" && (
              <span className="rounded-full bg-white/10 px-2 py-1 font-display text-[10px] font-bold text-white/50">
                Lv {toLocaleDigits(f.unlockPlayerLevel, locale)}
              </span>
            )}
            <ChevronRight
              className="h-4 w-4 text-white/45 rtl:rotate-180"
              aria-hidden
            />
          </div>
        </div>

        {f.status === "BUILT" && f.storageCap > 0 && (
          <div className="relative mt-3 rounded-xl border border-white/15 bg-black/25 px-2.5 py-2">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span
                className={[
                  "inline-flex items-center gap-1 font-display text-[10px] font-black tabular-nums",
                  live.isFull ? "text-amber-200" : "text-emerald-200",
                ].join(" ")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/coin.png"
                  alt=""
                  aria-hidden
                  className="h-3 w-3"
                />
                {live.isFull
                  ? t("club.biz.liveBufferFull")
                  : t("club.biz.liveBuffer", {
                      ready: toLocaleDigits(live.liveAmount, locale),
                      cap: toLocaleDigits(f.storageCap, locale),
                    })}
              </span>
              <span className="font-display text-[10px] font-bold tabular-nums text-white/55">
                {toLocaleDigits(live.fillPct, locale)}%
                {!live.isFull && f.ratePerHour > 0
                  ? ` · ${formatDuration(
                      Math.ceil(
                        ((f.storageCap - live.liveAmount) / f.ratePerHour) *
                          3_600_000,
                      ),
                      locale,
                    )}`
                  : ""}
              </span>
            </div>
            <div
              className={[
                "relative h-3.5 overflow-hidden rounded-full border border-white/15",
                live.isFull ? "bg-amber-950/40" : "bg-black/45",
              ].join(" ")}
              role="progressbar"
              aria-valuenow={live.fillPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("club.biz.statReady")}
            >
              <motion.div
                className={[
                  "relative h-full rounded-full",
                  live.isFull
                    ? "bg-linear-to-r from-amber-400 via-yellow-300 to-amber-500"
                    : "bg-linear-to-r from-emerald-400 via-lime-300 to-emerald-500",
                ].join(" ")}
                initial={false}
                animate={{ width: `${live.fillPct}%` }}
                transition={{ type: "spring", stiffness: 80, damping: 22 }}
              >
                {!live.isFull && live.fillPct > 8 && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-y-0 end-0 w-8 bg-linear-to-l from-white/55 to-transparent"
                    animate={{ opacity: [0.2, 0.9, 0.2] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </motion.div>
            </div>
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
                  key={live.liveAmount}
                  initial={{ scale: 0.92, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  dir="ltr"
                  className={[
                    "font-display text-5xl font-black tabular-nums tracking-tight drop-shadow-[0_2px_0_rgba(0,0,0,0.35)]",
                    live.isFull ? "text-amber-300" : "text-white",
                  ].join(" ")}
                >
                  {toLocaleDigits(live.liveAmount, locale)}
                </motion.p>
                <p className="mt-1 font-display text-xs font-bold text-white/75">
                  {t("club.biz.facilityHeroHint", {
                    rate: toLocaleDigits(f.ratePerHour, locale),
                  })}
                </p>
                {f.storageCap > 0 && (
                  <div className="mt-3 w-full max-w-56">
                    <div className="mb-1 flex justify-between font-display text-[10px] font-bold text-white/50">
                      <span>
                        {t("club.biz.liveBuffer", {
                          ready: toLocaleDigits(live.liveAmount, locale),
                          cap: toLocaleDigits(f.storageCap, locale),
                        })}{" "}
                        · {toLocaleDigits(live.fillPct, locale)}%
                      </span>
                      <span>
                        {live.isFull
                          ? t("club.biz.bufferFull")
                          : formatDuration(
                              Math.ceil(
                                ((f.storageCap - live.liveAmount) /
                                  f.ratePerHour) *
                                  3_600_000,
                              ),
                              locale,
                            )}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full border border-white/20 bg-black/40">
                      <motion.div
                        className={[
                          "h-full rounded-full",
                          live.isFull
                            ? "bg-linear-to-r from-amber-400 to-orange-400"
                            : "bg-linear-to-r from-emerald-400 to-lime-300",
                        ].join(" ")}
                        initial={false}
                        animate={{ width: `${live.fillPct}%` }}
                        transition={{
                          type: "spring",
                          stiffness: 80,
                          damping: 22,
                        }}
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

        {f.status === "BUILT" && onManageStaff && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onManageStaff();
            }}
            className="mt-3 flex w-full items-center justify-between rounded-bubble-xl border-2 border-white/12 bg-white/8 px-3 py-3 text-start shadow-[0_3px_0_0_rgba(0,0,0,0.35)]"
          >
            <span className="flex items-center gap-2">
              {f.staff ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.staff.avatarImage}
                  alt=""
                  className="h-9 w-9 rounded-lg object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-lg">
                  👔
                </span>
              )}
              <span>
                <span className="block font-display text-xs font-black text-white">
                  {f.staff
                    ? staffDisplayName(f.staff, locale)
                    : t("club.staff.emptyDesk")}
                </span>
                <span className="block font-display text-[11px] font-bold text-white/55">
                  {f.staff
                    ? t("club.staff.perkRate", {
                        pct: toLocaleDigits(f.staff.rateBonusPercent, locale),
                      })
                    : t("club.staff.assignHint")}
                </span>
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-white/45 rtl:rotate-180" />
          </button>
        )}

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
                    <FundsCost amount={f.upgradeCost} />
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
                <FundsCost amount={f.buildCost} />
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
