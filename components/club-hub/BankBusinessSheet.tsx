"use client";

import { motion } from "framer-motion";
import {
  activateSponsoredBank,
  deactivateSponsoredBank,
} from "@/actions/club/bank";
import type { ClubSnapshot } from "@/lib/club/upgrades";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  GameChip,
  GameCta,
  GameIconWell,
  GameOffer,
  GamePanel,
  GameTile,
} from "@/components/ui/game";
import { FundsCost } from "@/components/club-hub/FundsCost";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";

function formatDuration(ms: number, locale: "en" | "fa"): string {
  if (ms <= 0) return locale === "fa" ? "الان" : "now";
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

type BankBusinessSheetProps = {
  open: boolean;
  onClose: () => void;
  club: ClubSnapshot;
  pending: boolean;
  onClubUpdate: (club: ClubSnapshot) => void;
  onBusy: (label: string | null) => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
};

/**
 * Bank sheet — Arena design system reference implementation (DESIGN.md).
 */
export function BankBusinessSheet({
  open,
  onClose,
  club,
  pending,
  onClubUpdate,
  onBusy,
  onError,
  onSuccess,
}: BankBusinessSheetProps) {
  const { t, locale } = useTranslation();
  const bank = club.business.bank;
  const sponsorName =
    locale === "fa" ? bank.sponsorNameFa : bank.sponsorNameEn;
  const title = bank.sponsoredActive
    ? sponsorName
    : t("club.biz.bankDefaultName");
  const subtitle = bank.sponsoredActive
    ? t("club.biz.bankSponsoredBadge")
    : t("club.biz.bankClubBadge");

  const nextProfitLabel =
    bank.nextInterestEstimate > 0
      ? `+${toLocaleDigits(bank.nextInterestEstimate, locale)}`
      : t("club.biz.bankProfitNeedMin", {
          n: toLocaleDigits(bank.minBalance, locale),
        });

  async function activate() {
    onBusy("bank-up");
    const res = await activateSponsoredBank();
    onBusy(null);
    if (!res.ok) {
      onError(res.error);
      return;
    }
    onClubUpdate(res.club);
    onSuccess(t("club.biz.bankActivated", { name: sponsorName }));
    onClose();
  }

  async function deactivate() {
    onBusy("bank-down");
    const res = await deactivateSponsoredBank();
    onBusy(null);
    if (!res.ok) {
      onError(res.error);
      return;
    }
    onClubUpdate(res.club);
    onSuccess(t("club.biz.bankDeactivated"));
    onClose();
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      closeLabel={t("common.close")}
      tone="dark"
    >
      <GamePanel className="-mx-1" tone="emerald">
        <div className="absolute -inset-e-10 -top-8 h-36 w-36 rounded-full bg-arena-ring/25 blur-3xl" aria-hidden />
        <div className="relative flex flex-col items-center px-4 pb-6 pt-5">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{
              repeat: Infinity,
              duration: 2.4,
              ease: "easeInOut",
            }}
          >
            <GameIconWell size="xl" amber src="/icons/coin.png" />
          </motion.div>

          <p className="mt-3 font-display text-[11px] font-bold uppercase tracking-widest text-white/55">
            {t("club.biz.bankStatBalance")}
          </p>
          <motion.p
            key={bank.balance}
            initial={{ scale: 0.92, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            dir="ltr"
            className="mt-0.5 font-display text-5xl font-black tabular-nums tracking-tight text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.35)]"
          >
            {toLocaleDigits(bank.balance, locale)}
          </motion.p>
          <p className="mt-1.5 max-w-64 text-center font-display text-xs font-bold text-white/75">
            {bank.sponsoredActive
              ? t("club.biz.bankSponsoredHint", {
                  pct: toLocaleDigits(bank.interestPercent, locale),
                  hours: toLocaleDigits(bank.intervalHours, locale),
                })
              : t("club.biz.bankSpendHint")}
          </p>
        </div>
      </GamePanel>

      {bank.sponsoredActive && (
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <GameTile tone="emerald" className="px-3 py-3">
            <p className="flex items-center gap-1 font-display text-[10px] font-black uppercase tracking-wide text-emerald-200/90">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/coin.png"
                alt=""
                aria-hidden
                className="h-3.5 w-3.5 object-contain"
              />
              {t("club.biz.bankStatNextProfit")}
            </p>
            <p
              dir="ltr"
              className="mt-1 font-display text-2xl font-black tabular-nums text-emerald-100"
            >
              {nextProfitLabel}
            </p>
          </GameTile>
          <GameTile tone="amber" className="px-3 py-3">
            <p className="flex items-center gap-1 font-display text-[10px] font-black uppercase tracking-wide text-amber-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/timer.png"
                alt=""
                aria-hidden
                className="h-3.5 w-3.5 object-contain"
              />
              {t("club.biz.bankStatNextIn")}
            </p>
            <p className="mt-1 font-display text-2xl font-black tabular-nums text-white">
              {bank.msUntilNextInterest != null
                ? formatDuration(bank.msUntilNextInterest, locale)
                : "—"}
            </p>
          </GameTile>
        </div>
      )}

      {bank.sponsoredAvailable && !bank.sponsoredActive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <GameOffer>
            <div className="flex items-start gap-3">
              <GameIconWell size="lg" amber src="/icons/gift.png" className="bg-accent shadow-[0_4px_0_0_hsl(var(--accent-deep))]" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-[10px] font-black uppercase tracking-widest text-accent">
                  {t("club.biz.bankUpgradeTitle")}
                </p>
                <p className="mt-0.5 font-display text-xl font-black leading-tight text-white">
                  {sponsorName}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <GameChip>
                    {t("club.biz.bankOfferLine", {
                      pct: toLocaleDigits(bank.interestPercent, locale),
                      hours: toLocaleDigits(bank.intervalHours, locale),
                    })}
                  </GameChip>
                  <GameChip>{t("club.biz.bankPerkAuto")}</GameChip>
                </div>
              </div>
            </div>

            <GameCta
              variant="accent"
              block
              className="mt-3.5"
              disabled={pending || !bank.canAffordUpgrade}
              onClick={() => void activate()}
            >
              {bank.canAffordUpgrade ? (
                <>
                  <span>{t("club.biz.bankActivateShort")}</span>
                  <FundsCost amount={bank.upgradeCost} />
                </>
              ) : (
                t("club.biz.needFunds", {
                  n: toLocaleDigits(bank.upgradeCost, locale),
                  have: toLocaleDigits(bank.balance, locale),
                })
              )}
            </GameCta>
          </GameOffer>
        </motion.div>
      )}

      {bank.sponsoredActive && (
        <GameCta
          variant="ghost"
          block
          className="mt-4 min-h-11 text-xs font-bold"
          disabled={pending}
          onClick={() => void deactivate()}
        >
          {t("club.biz.bankDeactivateCta")}
        </GameCta>
      )}

      {!bank.sponsoredAvailable && (
        <p className="mt-4 text-center font-display text-xs font-bold text-white/45">
          {t("club.biz.bankSponsorOffline")}
        </p>
      )}
    </BottomSheet>
  );
}
