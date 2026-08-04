"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
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
  const vaultFull = biz.canWithdraw;
  const vaultHigh = biz.vaultFillRatio >= 0.8 && biz.vaultBalance > 0;
  const boost = biz.incomeBoost;
  const vaultMaxed = biz.vaultUpgradeCost === null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-foreground">
          {t("club.biz.title")}
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-1.5 font-display text-[11px] font-bold">
          <button
            type="button"
            onClick={() => {
              haptic(HAPTIC.light);
              playSound("click");
              setBankOpen(true);
            }}
            title={t("club.biz.funds")}
            className={[
              "rounded-full px-2.5 py-1 transition-transform active:scale-95",
              biz.bank.sponsoredActive
                ? "bg-sky-500/20 text-sky-900 ring-2 ring-sky-300/60"
                : "bg-emerald-500/15 text-emerald-800",
            ].join(" ")}
          >
            {t("club.biz.fundsChip", {
              n: toLocaleDigits(biz.clubFunds, locale),
            })}
            {biz.bank.sponsoredActive ? " ★" : ""}
          </button>
          <button
            type="button"
            onClick={() => {
              haptic(HAPTIC.light);
              playSound("click");
              setVaultOpen(true);
            }}
            title={t("club.biz.vault")}
            className={[
              "rounded-full px-2.5 py-1 transition-transform active:scale-95",
              vaultHigh
                ? "bg-amber-400 text-amber-950 ring-2 ring-amber-300"
                : "bg-amber-500/15 text-amber-900",
            ].join(" ")}
          >
            {t("club.biz.vaultChip", {
              cur: toLocaleDigits(biz.vaultBalance, locale),
              max: toLocaleDigits(biz.vaultCap, locale),
            })}
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
                "rounded-full px-2.5 py-1 transition-transform active:scale-95",
                biz.staff.hasTreasurer
                  ? "bg-indigo-500/25 text-indigo-950 ring-2 ring-indigo-300/50"
                  : "bg-indigo-500/15 text-indigo-900",
              ].join(" ")}
            >
              {t("club.staff.chip", {
                n: toLocaleDigits(biz.staff.hiredCount, locale),
                max: toLocaleDigits(biz.staff.maxHired, locale),
              })}
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

      {vaultFull && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-center">
          <p className="font-display text-xs font-bold text-amber-950">
            {t("club.biz.vaultFull")}
          </p>
        </div>
      )}
      {!vaultFull && vaultHigh && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-center">
          <p className="font-display text-xs font-bold text-amber-950">
            {t("club.biz.vaultAlmostFull", {
              pct: toLocaleDigits(
                Math.round(biz.vaultFillRatio * 100),
                locale,
              ),
              eta: formatDuration(biz.msUntilVaultFull, locale),
            })}
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t("club.biz.rateLine", {
          rate: toLocaleDigits(biz.totalRatePerHour, locale),
          eta: formatDuration(biz.msUntilVaultFull, locale),
        })}
      </p>

      <div className="flex flex-col gap-2">
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
            className="btn-fantasy btn-fantasy-primary w-full"
          >
            {busy === "collect"
              ? "…"
              : t("club.biz.collectAll", {
                  n: toLocaleDigits(biz.collectableTotal, locale),
                })}
          </button>
        )}
        {vaultFull && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run("withdraw", () => withdrawVault(), () =>
                t("club.biz.withdrawn"),
              )
            }
            className="flex min-h-touch w-full items-center justify-center rounded-bubble border-2 border-amber-400 bg-amber-50 px-4 py-3 font-display text-sm font-bold text-amber-950 shadow-[0_4px_0_0_#d97706] transition-transform active:scale-[0.98]"
          >
            {busy === "withdraw"
              ? "…"
              : t("club.biz.withdraw", {
                  n: toLocaleDigits(biz.vaultBalance, locale),
                })}
          </button>
        )}
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

      <button
        type="button"
        onClick={() => {
          haptic(HAPTIC.light);
          playSound("click");
          setVaultOpen(true);
        }}
        className="flex min-h-touch w-full items-center justify-between rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3 font-display text-sm font-bold text-foreground transition-transform active:scale-[0.99]"
      >
        <span>
          {t("club.biz.upgradeVault", {
            n: toLocaleDigits(biz.vaultLevel, locale),
          })}
        </span>
        <span className="inline-flex items-center gap-1 text-emerald-800">
          {vaultMaxed ? (
            "MAX"
          ) : (
            t("club.biz.cardUpgrade", {
              n: toLocaleDigits(biz.vaultUpgradeCost!, locale),
            })
          )}
          <ChevronRight className="h-4 w-4 opacity-50 rtl:rotate-180" />
        </span>
      </button>

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
        {/* Hero — balance is the star */}
        <div className="relative -mx-1 overflow-hidden rounded-bubble-xl border border-white/15 bg-gradient-to-br from-[#3d2a08] via-[#7a5410] to-[#b8860b] shadow-[0_8px_0_0_rgba(0,0,0,0.35)]">
          <div
            className="pointer-events-none absolute -end-10 -top-8 h-36 w-36 rounded-full bg-amber-300/40 blur-3xl"
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
              className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/30 bg-black/30 text-4xl shadow-[0_0_36px_rgba(251,191,36,0.3)]"
              animate={{ y: [0, -4, 0] }}
              transition={{
                repeat: Infinity,
                duration: 2.4,
                ease: "easeInOut",
              }}
              aria-hidden
            >
              🗃️
            </motion.span>

            <div className="mt-2.5 flex items-center gap-1">
              {Array.from({ length: biz.vaultMaxLevel }, (_, i) => (
                <span
                  key={i}
                  className={[
                    "h-2 w-2 rounded-full border border-white/30",
                    i < biz.vaultLevel ? "bg-amber-300" : "bg-white/10",
                  ].join(" ")}
                  aria-hidden
                />
              ))}
            </div>

            <p className="mt-2 font-display text-[11px] font-bold uppercase tracking-widest text-white/55">
              {t("club.biz.statReady")}
            </p>
            <motion.p
              key={biz.vaultBalance}
              initial={{ scale: 0.92, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              dir="ltr"
              className={[
                "font-display text-5xl font-black tabular-nums tracking-tight drop-shadow-[0_2px_0_rgba(0,0,0,0.35)]",
                biz.vaultFillRatio >= 0.8 ? "text-amber-300" : "text-white",
              ].join(" ")}
            >
              {toLocaleDigits(biz.vaultBalance, locale)}
            </motion.p>
            <p className="mt-1 max-w-[16rem] text-center font-display text-xs font-bold text-white/75">
              {t("club.biz.vaultHeroHint", {
                cap: toLocaleDigits(biz.vaultCap, locale),
              })}
            </p>

            {biz.vaultCap > 0 && (
              <div className="mt-3 w-full max-w-[14rem]">
                <div className="mb-1 flex justify-between font-display text-[10px] font-bold text-white/50">
                  <span>
                    {toLocaleDigits(
                      Math.round(biz.vaultFillRatio * 100),
                      locale,
                    )}
                    %
                  </span>
                  <span>
                    {biz.vaultFillRatio >= 1
                      ? t("club.biz.bufferFull")
                      : formatDuration(biz.msUntilVaultFull, locale)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full border border-white/20 bg-black/40">
                  <motion.div
                    className={[
                      "h-full rounded-full",
                      biz.vaultFillRatio >= 0.8
                        ? "bg-gradient-to-r from-amber-400 to-orange-400"
                        : "bg-gradient-to-r from-emerald-400 to-lime-300",
                    ].join(" ")}
                    initial={false}
                    animate={{
                      width: `${Math.round(biz.vaultFillRatio * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="mt-3 text-center font-display text-xs font-bold text-white/55">
          {t("club.biz.vaultDesc")}
        </p>

        {/* Primary: Safe → Bank only when full */}
        {vaultFull ? (
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
            className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-bubble-xl bg-emerald-500 px-4 font-display text-base font-black text-white shadow-[0_5px_0_0_#047857]"
          >
            <span>{t("club.biz.withdrawShort")}</span>
            <span
              dir="ltr"
              className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-0.5 text-sm"
            >
              {toLocaleDigits(biz.vaultBalance, locale)}
            </span>
          </motion.button>
        ) : (
          <div className="mt-4 rounded-bubble-xl border-2 border-white/12 bg-white/8 px-3.5 py-3.5 text-center shadow-[0_3px_0_0_rgba(0,0,0,0.35)]">
            <p className="font-display text-sm font-black text-white/85">
              {t("club.biz.vaultWithdrawLocked")}
            </p>
            {biz.vaultBalance > 0 && biz.msUntilVaultFull > 0 && (
              <p className="mt-1 font-display text-xs font-bold text-white/55">
                {t("club.biz.vaultWithdrawLockedEta", {
                  eta: formatDuration(biz.msUntilVaultFull, locale),
                })}
              </p>
            )}
            {biz.staff.enabled && !biz.staff.hasTreasurer && (
              <p className="mt-2 font-display text-[11px] font-bold text-indigo-200/80">
                {t("club.staff.treasurerHint")}
              </p>
            )}
          </div>
        )}

        {/* Upgrade offer — bank style */}
        {!vaultMaxed &&
          biz.vaultUpgradeCost !== null &&
          biz.nextVaultCap != null && (
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
                      {t("club.biz.vaultNextCap", {
                        from: toLocaleDigits(biz.vaultCap, locale),
                        to: toLocaleDigits(biz.nextVaultCap, locale),
                      })}
                    </p>
                  </div>
                </div>
                <motion.button
                  type="button"
                  disabled={
                    pending || biz.clubFunds < biz.vaultUpgradeCost
                  }
                  onClick={() => {
                    setVaultOpen(false);
                    run("vault", () => upgradeVault(), () =>
                      t("club.biz.vaultUpgraded"),
                    );
                  }}
                  whileTap={
                    pending || biz.clubFunds < biz.vaultUpgradeCost
                      ? undefined
                      : { y: 3 }
                  }
                  className={[
                    "mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-bubble-xl px-4 font-display text-base font-black",
                    biz.clubFunds >= biz.vaultUpgradeCost
                      ? "bg-accent text-accent-foreground shadow-[0_5px_0_0_hsl(var(--accent-deep))]"
                      : "cursor-not-allowed border-2 border-white/15 bg-white/10 text-white/55",
                  ].join(" ")}
                >
                  {biz.clubFunds >= biz.vaultUpgradeCost ? (
                    <>
                      <span>{t("club.biz.upgradeShort")}</span>
                      <span
                        dir="ltr"
                        className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-0.5 text-sm"
                      >
                        💎 {toLocaleDigits(biz.vaultUpgradeCost, locale)}
                      </span>
                    </>
                  ) : (
                    t("club.biz.needFunds", {
                      n: toLocaleDigits(biz.vaultUpgradeCost, locale),
                      have: toLocaleDigits(biz.clubFunds, locale),
                    })
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

        {vaultMaxed && (
          <div className="mt-4 rounded-bubble-xl border-2 border-amber-400/50 bg-amber-500/15 px-3 py-3 text-center">
            <p className="font-display text-base font-black text-amber-300">
              👑 {t("club.biz.maxed")}
            </p>
          </div>
        )}
      </BottomSheet>
    </section>
  );
}
