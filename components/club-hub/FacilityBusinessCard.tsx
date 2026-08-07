"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Lock } from "lucide-react";
import type { FacilityView } from "@/lib/club/businessEconomy";
import type { BusinessFacilityKey } from "@/lib/club/businessEconomy";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  GameChip,
  GameCta,
  GameIconWell,
  GameOffer,
  GamePanel,
  GameTile,
  type GamePanelTone,
} from "@/components/ui/game";
import { FundsCost } from "@/components/club-hub/FundsCost";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";
import { staffDisplayName } from "@/lib/club/staff";
import { useLiveFacilityFill } from "@/lib/club/useLiveFacilityFill";

const FACILITY_PANEL_TONE: Record<BusinessFacilityKey, GamePanelTone> = {
  TICKET_OFFICE: "emerald",
  CLUB_SHOP: "sky",
  MUSEUM: "amber",
};

const FACILITY_META: Record<
  BusinessFacilityKey,
  {
    icon: string;
    iconSrc: string;
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
    iconSrc: "/icons/stadium.png",
    nameKey: "club.biz.ticketOffice",
    descKey: "club.biz.ticketOfficeDesc",
    hero: "from-[#052e16] via-[#0f172a] to-[#14532d]",
    row: "from-[#0f3d32] via-[#16634a] to-[#0c2e26]",
    glow: "bg-emerald-400/40",
    pip: "bg-emerald-400",
    rim: "border-emerald-400/55",
  },
  CLUB_SHOP: {
    icon: "🛍️",
    iconSrc: "/icons/hub-shop.png",
    nameKey: "club.biz.clubShop",
    descKey: "club.biz.clubShopDesc",
    hero: "from-[#0c2d4a] via-[#0f172a] to-[#134e75]",
    row: "from-[#0c2d4a] via-[#155a8a] to-[#0a243c]",
    glow: "bg-sky-400/40",
    pip: "bg-sky-400",
    rim: "border-sky-400/55",
  },
  MUSEUM: {
    icon: "🏆",
    iconSrc: "/icons/trophy.png",
    nameKey: "club.biz.museum",
    descKey: "club.biz.museumDesc",
    hero: "from-[#3d2a08] via-[#0f172a] to-[#7a5410]",
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

  const rowTone: GamePanelTone =
    f.status === "LOCKED"
      ? "emerald"
      : f.status === "AVAILABLE"
        ? "amber"
        : FACILITY_PANEL_TONE[f.key];

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
        className={
          f.status === "LOCKED" ? "opacity-90" : undefined
        }
      >
        <GamePanel
          tone={rowTone}
          className={[
            "cursor-pointer px-3 py-3",
            f.status === "AVAILABLE" || (f.status === "BUILT" && f.canUpgrade)
              ? "ring-1 ring-accent/30"
              : "",
            f.status === "LOCKED" ? "grayscale-[0.35]" : "",
          ].join(" ")}
        >
        {(f.status === "BUILT" && live.fillPct > 0) ||
        f.status === "AVAILABLE" ? (
          <motion.div
            aria-hidden
            className={[
              "pointer-events-none absolute -end-8 top-0 h-28 w-28 rounded-full blur-2xl",
              f.status === "AVAILABLE" ? "bg-accent/40" : meta.glow,
            ].join(" ")}
            animate={{ opacity: [0.3, 0.65, 0.3], scale: [1, 1.08, 1] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
        ) : null}

        <div className="relative flex items-center gap-3">
          <div className="relative shrink-0">
            <GameIconWell
              size="lg"
              amber={f.status === "AVAILABLE"}
              src={meta.iconSrc}
              className={
                f.status === "LOCKED" ? "grayscale" : undefined
              }
              iconClassName="h-9 w-9 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
            />
            {f.status === "LOCKED" && (
              <span
                className="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0f172a] bg-slate-800 text-white/70 shadow-md"
                aria-hidden
              >
                <Lock className="h-3 w-3" />
              </span>
            )}
            {f.status === "BUILT" && (
              <span className="absolute -bottom-1 -start-1 rounded-full bg-black/65 px-1.5 py-0.5 font-display text-[9px] font-black text-white ring-1 ring-white/30">
                Lv{toLocaleDigits(f.level, locale)}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-display text-sm font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
                {t(meta.nameKey)}
              </p>
              {f.status === "AVAILABLE" && (
                <span className="rounded-full bg-accent px-2 py-0.5 font-display text-[10px] font-black text-accent-foreground shadow-[0_2px_0_0_hsl(var(--accent-deep))]">
                  {t("club.biz.readyToBuild")}
                </span>
              )}
              {f.staff && (
                <span className="rounded-full bg-indigo-400/25 px-2 py-0.5 font-display text-[10px] font-black text-indigo-100 ring-1 ring-indigo-300/40">
                  +{toLocaleDigits(f.staff.rateBonusPercent, locale)}%
                </span>
              )}
              {f.trophyBonusPercent > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/25 px-2 py-0.5 font-display text-[10px] font-black text-amber-100 ring-1 ring-amber-300/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/trophy.png"
                    alt=""
                    draggable={false}
                    className="h-3 w-3 object-contain"
                  />
                  +{toLocaleDigits(f.trophyBonusPercent, locale)}%
                </span>
              )}
              {f.stadiumCapBonusPercent > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-400/25 px-2 py-0.5 font-display text-[10px] font-black text-emerald-100 ring-1 ring-emerald-300/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/stadium.png"
                    alt=""
                    draggable={false}
                    className="h-3 w-3 object-contain"
                  />
                  +{toLocaleDigits(f.stadiumCapBonusPercent, locale)}%
                </span>
              )}
              {isMax && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/30 px-2 py-0.5 font-display text-[10px] font-black text-amber-100 ring-1 ring-amber-300/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/crown.png"
                    alt=""
                    draggable={false}
                    className="h-3 w-3 object-contain"
                  />
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

            {f.status === "BUILT" && (
              <div className="mt-1.5 flex items-center gap-1">
                {Array.from({ length: f.maxLevel }, (_, i) => (
                  <span
                    key={i}
                    className={[
                      "h-1.5 flex-1 rounded-full",
                      i < f.level
                        ? meta.pip
                        : i === f.level && !isMax
                          ? "bg-white/25 ring-1 ring-white/30"
                          : "bg-white/10",
                    ].join(" ")}
                    aria-hidden
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {f.status === "AVAILABLE" && f.buildCost !== null && (
              <motion.span
                animate={f.canBuild ? { scale: [1, 1.04, 1] } : undefined}
                transition={
                  f.canBuild ? { duration: 1.4, repeat: Infinity } : undefined
                }
                className={[
                  "inline-flex min-h-11 items-center gap-1 rounded-bubble px-3 py-2 font-display text-[11px] font-black shadow-[0_3px_0_0_rgba(0,0,0,0.4)]",
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
              </motion.span>
            )}
            {f.status === "BUILT" && f.upgradeCost !== null && (
              <motion.span
                animate={f.canUpgrade ? { scale: [1, 1.04, 1] } : undefined}
                transition={
                  f.canUpgrade ? { duration: 1.4, repeat: Infinity } : undefined
                }
                className={[
                  "inline-flex min-h-11 items-center gap-1 rounded-bubble px-3 py-2 font-display text-[11px] font-black shadow-[0_3px_0_0_rgba(0,0,0,0.4)]",
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
              </motion.span>
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
          <div className="relative mt-3 rounded-2xl border border-white/15 bg-black/40 px-2.5 py-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
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
        </GamePanel>
      </motion.div>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t(meta.nameKey)}
        subtitle={subtitle}
        closeLabel={t("common.close")}
        tone="dark"
      >
        <GamePanel
          className="-mx-1"
          tone={FACILITY_PANEL_TONE[f.key]}
        >
          <div
            className={[
              "pointer-events-none absolute -end-10 -top-8 h-36 w-36 rounded-full blur-3xl",
              meta.glow,
            ].join(" ")}
            aria-hidden
          />

          <div className="relative flex flex-col items-center px-4 pb-5 pt-5">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{
                repeat: Infinity,
                duration: 2.4,
                ease: "easeInOut",
              }}
            >
              <GameIconWell size="xl" amber src={meta.iconSrc} />
            </motion.div>

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
                {f.trophyBonusPercent > 0 && (
                  <p className="mt-1 font-display text-[11px] font-bold text-amber-200/90">
                    {t("club.biz.museumTrophyLine", {
                      pct: toLocaleDigits(f.trophyBonusPercent, locale),
                      n: toLocaleDigits(f.badgeCount, locale),
                    })}
                  </p>
                )}
                {f.stadiumCapBonusPercent > 0 && (
                  <p className="mt-1 font-display text-[11px] font-bold text-emerald-200/90">
                    {t("club.biz.ticketStadiumLine", {
                      n: toLocaleDigits(f.stadiumLevel, locale),
                      pct: toLocaleDigits(f.stadiumCapBonusPercent, locale),
                    })}
                  </p>
                )}
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
                    <div className="h-3 overflow-hidden rounded-full bg-black/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]">
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
                <GameChip className="mt-3 gap-1.5 px-3 py-1.5 text-xs text-white/85">
                  <Lock className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  {t("club.biz.unlockAt", {
                    n: toLocaleDigits(f.unlockPlayerLevel, locale),
                  })}
                </GameChip>
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
        </GamePanel>

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
            className="mt-3 w-full text-start transition-transform active:scale-[0.99]"
          >
            <GameTile className="flex w-full items-center justify-between px-3 py-3">
              <span className="flex items-center gap-2">
                {f.staff ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.staff.avatarImage}
                    alt=""
                    className="h-9 w-9 rounded-lg object-cover shadow-[0_0_0_1px_hsl(var(--arena-ring)/0.35)]"
                  />
                ) : (
                  <GameIconWell size="sm" src="/icons/hub-mission.png" />
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
                          pct: toLocaleDigits(
                            f.staff.rateBonusPercent,
                            locale,
                          ),
                        })
                      : t("club.staff.assignHint")}
                  </span>
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-white/45 rtl:rotate-180" />
            </GameTile>
          </button>
        )}

        {f.status === "BUILT" && (
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <GameTile className="px-3 py-3">
              <p className="flex items-center gap-1 font-display text-[10px] font-black uppercase tracking-wide text-white/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/energy.png"
                  alt=""
                  aria-hidden
                  className="h-3.5 w-3.5 object-contain"
                />
                {t("club.biz.statRate")}
              </p>
              <p
                dir="ltr"
                className="mt-1 font-display text-xl font-black tabular-nums text-white"
              >
                {t("club.biz.rateValue", {
                  n: toLocaleDigits(f.ratePerHour, locale),
                })}
              </p>
            </GameTile>
            <GameTile className="px-3 py-3">
              <p className="flex items-center gap-1 font-display text-[10px] font-black uppercase tracking-wide text-white/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/gift.png"
                  alt=""
                  aria-hidden
                  className="h-3.5 w-3.5 object-contain"
                />
                {t("club.biz.statCap")}
              </p>
              <p
                dir="ltr"
                className="mt-1 font-display text-xl font-black tabular-nums text-white"
              >
                {toLocaleDigits(f.storageCap, locale)}
              </p>
            </GameTile>
          </div>
        )}

        {f.status === "BUILT" && !isMax && f.upgradeCost != null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <GameOffer>
              <div className="flex items-center gap-3">
                <GameIconWell
                  size="md"
                  src="/icons/upgrade.png"
                  className="h-12 w-12 bg-accent shadow-[0_3px_0_0_hsl(var(--accent-deep))]"
                  iconClassName="h-7 w-7"
                />
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
              <GameCta
                variant="accent"
                block
                className="mt-3"
                disabled={pending || !f.canUpgrade}
                onClick={() => {
                  setOpen(false);
                  onUpgrade();
                }}
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
              </GameCta>
            </GameOffer>
          </motion.div>
        )}

        {isMax && (
          <GameTile
            tone="amber"
            className="mt-4 flex items-center justify-center gap-2 px-3 py-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/crown.png"
              alt=""
              draggable={false}
              className="h-6 w-6 object-contain"
            />
            <p className="font-display text-base font-black text-amber-300">
              {t("club.biz.maxed")}
            </p>
          </GameTile>
        )}

        {f.status === "AVAILABLE" && f.buildCost !== null && (
          <GameCta
            variant="accent"
            block
            className="mt-4"
            disabled={pending || !f.canBuild}
            onClick={() => {
              setOpen(false);
              onBuild();
            }}
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
          </GameCta>
        )}
      </BottomSheet>
    </>
  );
}
