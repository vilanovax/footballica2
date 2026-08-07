"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, Landmark } from "lucide-react";
import { toast } from "sonner";
import {
  buildFacility,
  collectFacilities,
  upgradeFacility,
  upgradeVault,
  withdrawVault,
} from "@/actions/club/business";
import type { ClubSnapshot } from "@/lib/club/upgrades";
import { FacilityBusinessCard } from "@/components/club-hub/FacilityBusinessCard";
import { BankBusinessSheet } from "@/components/club-hub/BankBusinessSheet";
import { StaffBusinessSheet } from "@/components/club-hub/StaffBusinessSheet";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FundsCost } from "@/components/club-hub/FundsCost";
import type { BusinessFacilityKey } from "@/lib/club/businessEconomy";
import { playSound } from "@/lib/audio/SoundManager";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";

type BusinessPanelProps = {
  club: ClubSnapshot;
  onClubUpdate: (club: ClubSnapshot) => void;
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

/**
 * Club Funds panel — Collect All stays primary; facilities open detail sheets.
 */
export function BusinessPanel({ club, onClubUpdate }: BusinessPanelProps) {
  const { t, locale } = useTranslation();
  const biz = club.business;
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [staffFocus, setStaffFocus] = useState<BusinessFacilityKey | null>(
    null,
  );

  function run(
    label: string,
    action: () => Promise<
      | { ok: true; club: ClubSnapshot; transferred?: number }
      | { ok: false; error: string }
    >,
    okMsg?: (transferred?: number) => string,
  ) {
    setBusy(label);
    startTransition(async () => {
      const res = await action();
      setBusy(null);
      if (!res.ok) {
        toast.error(
          res.error === "VAULT_NOT_FULL"
            ? t("club.biz.vaultWithdrawLocked")
            : res.error,
        );
        haptic(HAPTIC.miss);
        return;
      }
      onClubUpdate(res.club);
      playSound("upgrade");
      haptic(HAPTIC.tap);
      if (okMsg) toast.success(okMsg(res.transferred));
    });
  }

  const primaryCollect = biz.collectableTotal > 0;
  const vaultIsFull =
    biz.vaultCap > 0 && biz.vaultBalance >= biz.vaultCap;
  const canWithdraw = biz.canWithdraw;
  /** Treasurer: withdraw allowed before Safe is literally full. */
  const treasurerEarly =
    canWithdraw && !vaultIsFull && biz.staff.hasTreasurer;
  const vaultFull = vaultIsFull;
  const vaultHigh = biz.vaultFillRatio >= 0.8 && biz.vaultBalance > 0;
  const boost = biz.incomeBoost;
  const vaultMaxed = biz.vaultUpgradeCost === null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-400/35 bg-amber-950/35 shadow-[0_2px_0_0_rgba(0,0,0,0.25)]"
            aria-hidden
          >
            <Landmark className="h-4 w-4 text-amber-200" />
          </span>
          <h2 className="font-display text-lg font-black text-foreground">
            {t("club.biz.title")}
          </h2>
        </div>
        {/* Full-width equal chips — no dead space beside the strip */}
        <div
          className={[
            "grid w-full gap-2",
            biz.staff.enabled ? "grid-cols-3" : "grid-cols-2",
          ].join(" ")}
        >
          {/* Bank */}
          <button
            type="button"
            onClick={() => {
              haptic(HAPTIC.light);
              playSound("click");
              setBankOpen(true);
            }}
            title={t("club.biz.funds")}
            className={[
              "flex min-h-12 min-w-0 items-center gap-1.5 rounded-2xl border-[3px] px-2 py-1.5 shadow-[0_3px_0_0_rgba(0,0,0,0.28)] ring-1 ring-white/10 transition-transform active:translate-y-px active:shadow-none",
              biz.bank.sponsoredActive
                ? "border-sky-300 bg-linear-to-b from-sky-400 to-sky-600 text-white"
                : "border-emerald-400/70 bg-linear-to-b from-emerald-500 to-emerald-700 text-white",
            ].join(" ")}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/25 ring-1 ring-white/25">
              <Landmark className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate font-display text-[9px] font-bold uppercase tracking-wide text-white/75">
                {t("club.biz.funds")}
              </span>
              <span className="block truncate font-display text-sm font-black tabular-nums drop-shadow-sm">
                {toLocaleDigits(biz.clubFunds, locale)}
                {biz.bank.sponsoredActive ? " ★" : ""}
              </span>
            </span>
          </button>

          {/* Safe — tap opens sheet (upgrade lives there) */}
          <button
            type="button"
            onClick={() => {
              haptic(HAPTIC.light);
              playSound("click");
              setVaultOpen(true);
            }}
            title={t("club.biz.vault")}
            className={[
              "relative flex min-h-12 min-w-0 flex-col justify-center gap-1 rounded-2xl border-[3px] px-2 py-1.5 shadow-[0_3px_0_0_rgba(0,0,0,0.28)] ring-1 ring-white/10 transition-transform active:translate-y-px active:shadow-none",
              vaultFull
                ? "border-amber-200 bg-linear-to-b from-amber-300 to-amber-500 text-amber-950"
                : vaultHigh
                  ? "border-amber-300 bg-linear-to-b from-amber-400 to-amber-600 text-amber-950"
                  : "border-amber-500/60 bg-linear-to-b from-[#5c3d0a] to-[#3d2808] text-amber-50",
            ].join(" ")}
          >
            <span className="flex w-full items-center gap-1.5">
              <span
                className={[
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1",
                  vaultFull || vaultHigh
                    ? "bg-amber-950/15 ring-amber-950/20"
                    : "bg-black/30 ring-white/20",
                ].join(" ")}
                aria-hidden
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/gift.png"
                  alt=""
                  draggable={false}
                  className="h-4 w-4 object-contain"
                />
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span
                  className={[
                    "block truncate font-display text-[9px] font-bold uppercase tracking-wide",
                    vaultFull || vaultHigh
                      ? "text-amber-950/70"
                      : "text-amber-100/70",
                  ].join(" ")}
                >
                  {t("club.biz.vault")}
                </span>
                <span className="block truncate font-display text-sm font-black tabular-nums">
                  {toLocaleDigits(biz.vaultBalance, locale)}
                  <span className="text-[10px] opacity-60">
                    /{toLocaleDigits(biz.vaultCap, locale)}
                  </span>
                </span>
              </span>
              {!vaultMaxed && (
                <span
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-display text-xs font-black",
                    vaultFull || vaultHigh
                      ? "bg-amber-950/20 text-amber-950"
                      : "bg-accent text-accent-foreground",
                  ].join(" ")}
                  aria-hidden
                >
                  ↑
                </span>
              )}
            </span>
            <span
              className={[
                "h-1 w-full overflow-hidden rounded-full",
                vaultFull || vaultHigh ? "bg-amber-950/20" : "bg-black/40",
              ].join(" ")}
            >
              <span
                className={[
                  "block h-full rounded-full",
                  vaultFull
                    ? "bg-amber-950"
                    : "bg-linear-to-r from-amber-300 to-yellow-200",
                ].join(" ")}
                style={{
                  width: `${Math.min(100, Math.round(biz.vaultFillRatio * 100))}%`,
                }}
              />
            </span>
          </button>

          {biz.staff.enabled && (
            <button
              type="button"
              onClick={() => {
                haptic(HAPTIC.light);
                playSound("click");
                setStaffFocus(null);
                setStaffOpen(true);
              }}
              title={t("club.staff.title")}
              className={[
                "flex min-h-12 min-w-0 items-center gap-1.5 rounded-2xl border-[3px] px-2 py-1.5 shadow-[0_3px_0_0_rgba(0,0,0,0.28)] ring-1 ring-white/10 transition-transform active:translate-y-px active:shadow-none",
                biz.staff.hasTreasurer
                  ? "border-rose-200 bg-linear-to-b from-rose-400 to-rose-600 text-white"
                  : "border-rose-400/55 bg-linear-to-b from-[#7f1d1d] to-[#450a0a] text-rose-50",
              ].join(" ")}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/25 ring-1 ring-white/25">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/hub-mission.png"
                  alt=""
                  draggable={false}
                  className="h-4 w-4 object-contain"
                />
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate font-display text-[9px] font-bold uppercase tracking-wide text-white/70">
                  {t("club.staff.chipLabel")}
                </span>
                <span className="block truncate font-display text-sm font-black tabular-nums">
                  {toLocaleDigits(biz.staff.hiredCount, locale)}
                  <span className="text-[10px] opacity-60">
                    /{toLocaleDigits(biz.staff.maxHired, locale)}
                  </span>
                </span>
              </span>
            </button>
          )}
        </div>
      </div>

      {boost.active && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-accent/40 bg-accent/10 px-3 py-2.5">
          <p className="font-display text-xs font-bold text-accent-deep">
            {t("club.biz.boostActive", {
              pct: toLocaleDigits(
                Math.round((boost.multiplier - 1) * 100),
                locale,
              ),
            })}
          </p>
          <span className="shrink-0 font-display text-[11px] font-bold text-accent-deep">
            {formatDuration(boost.msRemaining, locale)}
          </span>
        </div>
      )}

      {/* Collect desk — game treasure panel */}
      <div
        className={[
          "relative overflow-hidden rounded-bubble-xl border-[3px] shadow-[0_6px_0_0_rgba(0,0,0,0.28)]",
          vaultFull
            ? "border-amber-300"
            : primaryCollect
              ? "border-accent"
              : "border-emerald-700/40",
        ].join(" ")}
      >
        <div
          className={[
            "absolute inset-0 bg-linear-to-br",
            vaultFull
              ? "from-[#5c3d0a] via-[#8a5a12] to-[#3d2808]"
              : "from-[#0d3b2e] via-[#145c45] to-[#0a281c]",
          ].join(" ")}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-18deg, transparent, transparent 12px, #fff 12px, #fff 13px)",
          }}
          aria-hidden
        />
        <motion.div
          aria-hidden
          className={[
            "pointer-events-none absolute -end-10 -top-10 h-36 w-36 rounded-full blur-3xl",
            vaultFull ? "bg-amber-300/40" : "bg-emerald-300/30",
          ].join(" ")}
          animate={{ opacity: [0.35, 0.65, 0.35], scale: [1, 1.12, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative px-4 pb-2 pt-4 text-center">
          <p className="font-display text-[11px] font-black uppercase tracking-[0.18em] text-white/55">
            {vaultFull
              ? t("club.biz.vaultFullShort")
              : t("club.biz.readyHero")}
          </p>

          {vaultFull || primaryCollect ? (
            <>
              <div className="mt-2 flex items-center justify-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/coin.png"
                  alt=""
                  aria-hidden
                  className="h-9 w-9 drop-shadow-[0_3px_0_rgba(0,0,0,0.35)]"
                />
                <motion.p
                  key={
                    vaultFull ? biz.vaultBalance : biz.collectableTotal
                  }
                  initial={{ scale: 0.88, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  dir="ltr"
                  className={[
                    "font-display text-5xl font-black leading-none tabular-nums tracking-tight drop-shadow-[0_3px_0_rgba(0,0,0,0.4)]",
                    vaultFull ? "text-amber-200" : "text-accent",
                  ].join(" ")}
                >
                  {toLocaleDigits(
                    vaultFull ? biz.vaultBalance : biz.collectableTotal,
                    locale,
                  )}
                </motion.p>
              </div>
              <p className="mt-2 font-display text-xs font-bold text-white/70">
                {vaultFull
                  ? t("club.biz.vault")
                  : t("club.biz.rateShort", {
                      rate: toLocaleDigits(biz.totalRatePerHour, locale),
                    })}
              </p>
            </>
          ) : (
            <div className="mt-3 flex flex-col items-center">
              <motion.div
                className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/25 bg-black/25 shadow-[0_0_28px_rgba(52,211,153,0.35)]"
                animate={{ y: [0, -5, 0] }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/gift.png"
                  alt=""
                  aria-hidden
                  className="h-11 w-11 drop-shadow-[0_2px_0_rgba(0,0,0,0.4)]"
                />
                <motion.span
                  aria-hidden
                  className="absolute -bottom-1 h-2 w-10 rounded-full bg-black/40 blur-[2px]"
                  animate={{ scaleX: [1, 0.85, 1], opacity: [0.5, 0.3, 0.5] }}
                  transition={{ duration: 2.2, repeat: Infinity }}
                />
              </motion.div>
              <p className="mt-3 font-display text-sm font-black text-white">
                {t("club.biz.cookingHint")}
              </p>
              <p className="mt-1 font-display text-[11px] font-bold text-emerald-200/80">
                {t("club.biz.rateShort", {
                  rate: toLocaleDigits(biz.totalRatePerHour, locale),
                })}
                {formatDuration(biz.msUntilVaultFull, locale) !== "—"
                  ? ` · ${formatDuration(biz.msUntilVaultFull, locale)}`
                  : ""}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            haptic(HAPTIC.light);
            playSound("click");
            setVaultOpen(true);
          }}
          className={[
            "relative mx-3 mt-2 rounded-2xl border-2 px-3 py-3 text-start shadow-[0_3px_0_0_rgba(0,0,0,0.35)] transition-transform active:translate-y-px active:shadow-none",
            vaultFull
              ? "border-amber-200/80 bg-linear-to-r from-amber-400 to-amber-300"
              : "border-amber-400/40 bg-linear-to-r from-[#3d2a08]/90 to-[#5c3d0a]/90",
          ].join(" ")}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-inner",
                vaultFull ? "bg-amber-950/20" : "bg-black/30",
              ].join(" ")}
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/gift.png"
                alt=""
                draggable={false}
                className="h-6 w-6 object-contain"
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={[
                    "font-display text-xs font-black",
                    vaultFull ? "text-amber-950" : "text-amber-100",
                  ].join(" ")}
                >
                  {t("club.biz.vaultFillLabel", {
                    cur: toLocaleDigits(biz.vaultBalance, locale),
                    max: toLocaleDigits(biz.vaultCap, locale),
                  })}
                </span>
                <span
                  className={[
                    "font-display text-[11px] font-bold tabular-nums",
                    vaultFull ? "text-amber-950/80" : "text-amber-200/80",
                  ].join(" ")}
                >
                  {vaultFull
                    ? "100%"
                    : formatDuration(biz.msUntilVaultFull, locale) === "—"
                      ? "—"
                      : formatDuration(biz.msUntilVaultFull, locale)}
                </span>
              </div>
              <div
                className={[
                  "mt-2 h-3.5 overflow-hidden rounded-full border",
                  vaultFull
                    ? "border-amber-950/20 bg-amber-950/20"
                    : "border-white/15 bg-black/40",
                ].join(" ")}
              >
                <motion.div
                  className={[
                    "relative h-full rounded-full",
                    vaultFull
                      ? "bg-amber-950"
                      : "bg-linear-to-r from-amber-400 via-yellow-300 to-amber-500",
                  ].join(" ")}
                  initial={false}
                  animate={{
                    width: `${Math.min(100, Math.round(biz.vaultFillRatio * 100))}%`,
                  }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                >
                  {!vaultFull && biz.vaultFillRatio > 0.08 && (
                    <motion.span
                      aria-hidden
                      className="absolute inset-y-0 end-0 w-6 bg-linear-to-l from-white/55 to-transparent"
                      animate={{ opacity: [0.25, 0.9, 0.25] }}
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
          </div>
        </button>

        <div className="relative flex flex-col gap-2 p-3 pt-3">
          {canWithdraw ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run("withdraw", () => withdrawVault(), () =>
                    t("club.biz.withdrawn"),
                  )
                }
                className="btn-fantasy btn-fantasy-accent w-full gap-2"
              >
                <ArrowLeftRight className="h-4 w-4 shrink-0" aria-hidden />
                {busy === "withdraw"
                  ? "…"
                  : treasurerEarly
                    ? t("club.biz.withdrawTreasurerCta", {
                        n: toLocaleDigits(biz.vaultBalance, locale),
                      })
                    : t("club.biz.withdrawCta", {
                        n: toLocaleDigits(biz.vaultBalance, locale),
                      })}
              </button>
              {treasurerEarly && (
                <p className="text-center font-display text-[10px] font-bold text-emerald-100/70">
                  {t("club.staff.treasurerActive")}
                </p>
              )}
              {primaryCollect && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(
                      "collect",
                      () => collectFacilities("ALL"),
                      (n) =>
                        t("club.biz.collected", {
                          n: toLocaleDigits(n ?? 0, locale),
                        }),
                    )
                  }
                  className="w-full py-2 text-center font-display text-xs font-black text-emerald-100/80 underline-offset-2 hover:underline"
                >
                  {busy === "collect"
                    ? "…"
                    : t("club.biz.collectShort", {
                        n: toLocaleDigits(biz.collectableTotal, locale),
                      })}
                </button>
              )}
            </>
          ) : primaryCollect ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(
                    "collect",
                    () => collectFacilities("ALL"),
                    (n) =>
                      t("club.biz.collected", {
                        n: toLocaleDigits(n ?? 0, locale),
                      }),
                  )
                }
                className="btn-fantasy btn-fantasy-accent w-full"
              >
                {busy === "collect"
                  ? "…"
                  : t("club.biz.collectShort", {
                      n: toLocaleDigits(biz.collectableTotal, locale),
                    })}
              </button>
              {vaultHigh &&
                biz.staff.enabled &&
                !biz.staff.hasTreasurer && (
                  <p className="text-center font-display text-[10px] font-bold text-amber-100/75">
                    {t("club.staff.treasurerHint")}
                  </p>
                )}
            </>
          ) : (
            <>
              <p className="pb-0.5 text-center font-display text-[10px] font-bold text-white/40">
                {t("club.biz.vaultTapHint")}
              </p>
              {vaultHigh &&
                biz.staff.enabled &&
                !biz.staff.hasTreasurer && (
                  <p className="text-center font-display text-[10px] font-bold text-amber-100/75">
                    {t("club.staff.treasurerHint")}
                  </p>
                )}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {biz.facilities.map((f) => (
          <FacilityBusinessCard
            key={f.key}
            facility={f}
            clubFunds={biz.clubFunds}
            pending={pending}
            onBuild={() =>
              run(`build-${f.key}`, () => buildFacility(f.key), () =>
                t("club.biz.built"),
              )
            }
            onUpgrade={() =>
              run(`up-${f.key}`, () => upgradeFacility(f.key), () =>
                t("club.biz.upgraded"),
              )
            }
            onManageStaff={
              biz.staff.enabled && f.status === "BUILT"
                ? () => {
                    setStaffFocus(f.key);
                    setStaffOpen(true);
                  }
                : undefined
            }
          />
        ))}
      </div>

      <BankBusinessSheet
        open={bankOpen}
        onClose={() => setBankOpen(false)}
        club={club}
        pending={pending || busy !== null}
        onClubUpdate={onClubUpdate}
        onBusy={setBusy}
        onError={(msg) => {
          toast.error(msg);
          haptic(HAPTIC.miss);
        }}
        onSuccess={(msg) => {
          toast.success(msg);
          playSound("upgrade");
          haptic(HAPTIC.tap);
        }}
      />

      <StaffBusinessSheet
        open={staffOpen}
        onClose={() => {
          setStaffOpen(false);
          setStaffFocus(null);
        }}
        club={club}
        pending={pending || busy !== null}
        onClubUpdate={onClubUpdate}
        onBusy={setBusy}
        onError={(msg) => {
          toast.error(msg);
          haptic(HAPTIC.miss);
        }}
        onSuccess={(msg) => {
          toast.success(msg);
          playSound("upgrade");
          haptic(HAPTIC.tap);
        }}
        focusFacilityKey={staffFocus}
      />

      <BottomSheet
        open={vaultOpen}
        onClose={() => setVaultOpen(false)}
        title={t("club.biz.vaultTitle")}
        subtitle={t("club.biz.levelOf", {
          n: toLocaleDigits(biz.vaultLevel, locale),
          max: toLocaleDigits(biz.vaultMaxLevel, locale),
        })}
        closeLabel={t("common.close")}
        tone="dark"
      >
        {/* Vault hero — amber on pitch dark */}
        <div className="relative -mx-1 overflow-hidden rounded-bubble-xl bg-linear-to-br from-[#3d2a08] via-[#0f172a] to-[#071410] shadow-[0_0_0_1px_rgba(251,191,36,0.45),0_4px_0_0_rgba(0,0,0,0.35)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-16deg, transparent, transparent 11px, #fff 11px, #fff 12px)",
            }}
            aria-hidden
          />
          <div className="absolute -end-8 -top-8 h-32 w-32 rounded-full bg-amber-400/20 blur-3xl" aria-hidden />
          <div className="relative flex flex-col items-center px-4 pb-4 pt-5">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/40 bg-black/40 shadow-[0_3px_0_0_rgba(0,0,0,0.35)]"
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/gift.png"
                alt=""
                draggable={false}
                className="h-9 w-9 object-contain"
              />
            </span>
            <motion.p
              key={biz.vaultBalance}
              initial={{ scale: 0.92, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              dir="ltr"
              className="mt-2 font-display text-5xl font-black tabular-nums text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.35)]"
            >
              {toLocaleDigits(biz.vaultBalance, locale)}
              <span className="text-lg font-bold text-white/50">
                /{toLocaleDigits(biz.vaultCap, locale)}
              </span>
            </motion.p>
            <div className="mt-3 h-3 w-full max-w-56 overflow-hidden rounded-full bg-black/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]">
              <motion.div
                className="h-full rounded-full bg-linear-to-r from-amber-300 to-yellow-200"
                initial={false}
                animate={{
                  width: `${Math.round(biz.vaultFillRatio * 100)}%`,
                }}
              />
            </div>
            <p className="mt-2 font-display text-[11px] font-bold text-white/65">
              {vaultFull
                ? t("club.biz.vaultFullShort")
                : biz.msUntilVaultFull > 0
                  ? t("club.biz.vaultEta", {
                      eta: formatDuration(biz.msUntilVaultFull, locale),
                    })
                  : t("club.biz.vault")}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          {canWithdraw && (
            <motion.button
              type="button"
              disabled={pending}
              onClick={() => {
                setVaultOpen(false);
                run("withdraw", () => withdrawVault(), () =>
                  t("club.biz.withdrawn"),
                );
              }}
              whileTap={pending ? undefined : { y: 3 }}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-bubble-xl bg-emerald-500 px-4 font-display text-base font-black text-white shadow-[0_5px_0_0_rgba(6,78,59,0.9)]"
            >
              <ArrowLeftRight className="h-4 w-4 shrink-0" aria-hidden />
              {treasurerEarly
                ? t("club.biz.withdrawTreasurerCta", {
                    n: toLocaleDigits(biz.vaultBalance, locale),
                  })
                : t("club.biz.withdrawCta", {
                    n: toLocaleDigits(biz.vaultBalance, locale),
                  })}
            </motion.button>
          )}
          {vaultFull && !biz.staff.hasTreasurer && biz.staff.enabled && (
            <p className="text-center font-display text-[11px] font-bold text-white/65">
              {t("club.biz.vaultFullHireTip")}
            </p>
          )}
          {treasurerEarly && (
            <p className="text-center font-display text-[11px] font-bold text-emerald-200/80">
              {t("club.staff.treasurerActive")}
            </p>
          )}

          {!vaultMaxed &&
            biz.vaultUpgradeCost !== null &&
            biz.nextVaultCap != null && (
              <button
                type="button"
                disabled={pending || biz.clubFunds < biz.vaultUpgradeCost}
                onClick={() => {
                  setVaultOpen(false);
                  run("vault", () => upgradeVault(), () =>
                    t("club.biz.vaultUpgraded"),
                  );
                }}
                className={[
                  "flex min-h-14 w-full items-center justify-between gap-3 rounded-bubble-xl px-4 font-display text-base font-black",
                  biz.clubFunds >= biz.vaultUpgradeCost
                    ? "bg-accent text-accent-foreground shadow-[0_5px_0_0_hsl(var(--accent-deep))]"
                    : "cursor-not-allowed bg-white/10 text-white/50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
                ].join(" ")}
              >
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                    {t("club.biz.nextUpgrade")}
                  </span>
                  <span>
                    {t("club.biz.vaultNextCap", {
                      from: toLocaleDigits(biz.vaultCap, locale),
                      to: toLocaleDigits(biz.nextVaultCap, locale),
                    })}
                  </span>
                </span>
                {biz.clubFunds >= biz.vaultUpgradeCost ? (
                  <span className="inline-flex items-center gap-1.5 rounded-bubble bg-black/20 px-3 py-2">
                    <span>{t("club.biz.upgradeShort")}</span>
                    <FundsCost
                      amount={biz.vaultUpgradeCost}
                      variant="plain"
                    />
                  </span>
                ) : (
                  <FundsCost
                    amount={biz.vaultUpgradeCost}
                    variant="plain"
                    className="opacity-70"
                  />
                )}
              </button>
            )}

          {vaultMaxed && (
            <div className="flex items-center justify-center gap-2 rounded-bubble-xl bg-amber-500/15 px-3 py-3 shadow-[0_0_0_1px_rgba(251,191,36,0.4)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/crown.png"
                alt=""
                draggable={false}
                className="h-6 w-6 object-contain"
              />
              <p className="font-display text-sm font-black text-amber-300">
                {t("club.biz.maxed")}
              </p>
            </div>
          )}
        </div>
      </BottomSheet>
    </section>
  );
}
