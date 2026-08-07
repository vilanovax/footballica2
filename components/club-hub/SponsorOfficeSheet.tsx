"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  buildSponsorOffice,
  clearSponsorDeal,
  signSponsorDeal,
  upgradeSponsorOffice,
} from "@/actions/club/sponsor";
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
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";

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

type SponsorOfficeSheetProps = {
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
 * Sponsor Office — build desk, upgrade slots, sign commercial deals.
 */
export function SponsorOfficeSheet({
  open,
  onClose,
  club,
  pending,
  onClubUpdate,
  onBusy,
  onError,
  onSuccess,
}: SponsorOfficeSheetProps) {
  const { t, locale } = useTranslation();
  const sponsor = club.business.sponsor;
  const [pickSlot, setPickSlot] = useState<number | null>(null);

  function mapError(err: string): string {
    if (err === "NEED_FUNDS") return t("club.sponsor.needFunds");
    if (err === "SPONSOR_OFFLINE") return t("club.sponsor.offline");
    return err;
  }

  async function build() {
    onBusy("sponsor-build");
    const res = await buildSponsorOffice();
    onBusy(null);
    if (!res.ok) {
      onError(mapError(res.error));
      return;
    }
    onClubUpdate(res.club);
    onSuccess(t("club.sponsor.built"));
  }

  async function upgrade() {
    onBusy("sponsor-up");
    const res = await upgradeSponsorOffice();
    onBusy(null);
    if (!res.ok) {
      onError(mapError(res.error));
      return;
    }
    onClubUpdate(res.club);
    onSuccess(t("club.sponsor.upgraded"));
  }

  async function sign(slotIndex: number, key: string) {
    onBusy("sponsor-sign");
    const res = await signSponsorDeal(slotIndex, key);
    onBusy(null);
    if (!res.ok) {
      onError(mapError(res.error));
      return;
    }
    onClubUpdate(res.club);
    onSuccess(t("club.sponsor.signed"));
    setPickSlot(null);
  }

  async function clear(slotIndex: number) {
    onBusy("sponsor-clear");
    const res = await clearSponsorDeal(slotIndex);
    onBusy(null);
    if (!res.ok) {
      onError(mapError(res.error));
      return;
    }
    onClubUpdate(res.club);
    onSuccess(t("club.sponsor.cleared"));
  }

  if (!sponsor.enabled) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title={t("club.sponsor.title")}
        closeLabel={t("common.close")}
        tone="dark"
      >
        <p className="font-display text-sm font-bold text-white/60">
          {t("club.sponsor.offline")}
        </p>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        setPickSlot(null);
        onClose();
      }}
      title={t("club.sponsor.title")}
      subtitle={
        sponsor.built
          ? t("club.biz.levelOf", {
              n: toLocaleDigits(sponsor.level, locale),
              max: toLocaleDigits(sponsor.maxLevel, locale),
            })
          : t("club.sponsor.unlockAt", {
              n: toLocaleDigits(sponsor.unlockPlayerLevel, locale),
            })
      }
      closeLabel={t("common.close")}
      tone="dark"
    >
      <GamePanel className="-mx-1" tone="sky">
        <div className="relative flex flex-col items-center px-4 pb-5 pt-5">
          <GameIconWell size="lg" src="/icons/hub-shop.png" className="h-16 w-16" />
          <motion.p
            key={sponsor.nextPayoutEstimate}
            initial={{ scale: 0.92, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            dir="ltr"
            className="mt-2 font-display text-4xl font-black tabular-nums text-white"
          >
            +{toLocaleDigits(sponsor.nextPayoutEstimate, locale)}
          </motion.p>
          <p className="mt-1 font-display text-xs font-bold text-white/70">
            {t("club.sponsor.payoutHint", {
              hours: toLocaleDigits(sponsor.payoutIntervalHours, locale),
            })}
          </p>
          {sponsor.facilityBonusPercent > 0 && (
            <GameChip className="mt-2">
              {t("club.sponsor.facilityBonus", {
                pct: toLocaleDigits(sponsor.facilityBonusPercent, locale),
              })}
            </GameChip>
          )}
          {sponsor.msUntilNextPayout != null && sponsor.deals.length > 0 && (
            <p className="mt-2 font-display text-[11px] font-bold text-sky-100/80">
              {t("club.sponsor.nextPayout", {
                eta: formatDuration(sponsor.msUntilNextPayout, locale),
              })}
            </p>
          )}
        </div>
      </GamePanel>

      {!sponsor.built ? (
        <GameOffer className="mt-4">
          <p className="font-display text-sm font-bold text-white/75">
            {t("club.sponsor.buildHint")}
          </p>
          <GameCta
            variant="accent"
            block
            className="mt-3"
            disabled={pending || !sponsor.canBuild}
            onClick={() => {
              haptic(HAPTIC.tap);
              playSound("click");
              void build();
            }}
          >
            {sponsor.canBuild ? (
              <>
                <span>{t("club.sponsor.buildCta")}</span>
                <FundsCost amount={sponsor.buildCost} />
              </>
            ) : club.business.playerLevel < sponsor.unlockPlayerLevel ? (
              t("club.sponsor.unlockAt", {
                n: toLocaleDigits(sponsor.unlockPlayerLevel, locale),
              })
            ) : (
              t("club.sponsor.needFunds")
            )}
          </GameCta>
        </GameOffer>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-2">
            <p className="font-display text-[11px] font-black uppercase tracking-widest text-white/50">
              {t("club.sponsor.slotsTitle", {
                n: toLocaleDigits(sponsor.slots, locale),
              })}
            </p>
            {Array.from({ length: sponsor.slots }, (_, slot) => {
              const deal = sponsor.deals.find((d) => d.slotIndex === slot);
              const name = deal
                ? locale === "fa"
                  ? deal.nameFa
                  : deal.nameEn
                : null;
              return (
                <GameTile
                  key={slot}
                  className="flex flex-col gap-2 px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display text-[10px] font-black uppercase tracking-wide text-white/45">
                        {t("club.sponsor.slot", {
                          n: toLocaleDigits(slot + 1, locale),
                        })}
                      </p>
                      <p className="truncate font-display text-sm font-black text-white">
                        {deal
                          ? name
                          : t("club.sponsor.emptySlot")}
                      </p>
                      {deal && (
                        <p className="font-display text-[11px] font-bold text-lime-300">
                          +{toLocaleDigits(deal.payoutPerTick, locale)}/
                          {locale === "fa" ? "تیک" : "tick"}
                          {deal.facilityRateBonusPercent > 0
                            ? ` · +${toLocaleDigits(deal.facilityRateBonusPercent, locale)}%`
                            : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          haptic(HAPTIC.light);
                          setPickSlot(pickSlot === slot ? null : slot);
                        }}
                        className="min-h-10 rounded-xl bg-accent px-3 font-display text-xs font-black text-accent-foreground"
                      >
                        {deal
                          ? t("club.sponsor.replace")
                          : t("club.sponsor.sign")}
                      </button>
                      {deal && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => void clear(slot)}
                          className="min-h-10 rounded-xl bg-white/10 px-3 font-display text-xs font-black text-white/70"
                        >
                          {t("club.sponsor.clear")}
                        </button>
                      )}
                    </div>
                  </div>
                  {deal?.msUntilExpiry != null && (
                    <p className="font-display text-[10px] font-bold text-white/45">
                      {t("club.sponsor.expiresIn", {
                        eta: formatDuration(deal.msUntilExpiry, locale),
                      })}
                    </p>
                  )}
                </GameTile>
              );
            })}
          </div>

          {pickSlot != null && (
            <div className="mt-4 flex flex-col gap-2">
              <p className="font-display text-[11px] font-black uppercase tracking-widest text-white/50">
                {t("club.sponsor.catalogTitle")}
              </p>
              {sponsor.offers.map((offer) => {
                const name = locale === "fa" ? offer.nameFa : offer.nameEn;
                const locked = offer.lockedReason != null;
                return (
                  <button
                    key={offer.key}
                    type="button"
                    disabled={pending || !offer.canAfford}
                    onClick={() => {
                      haptic(HAPTIC.tap);
                      playSound("upgrade");
                      void sign(pickSlot, offer.key);
                    }}
                    className={[
                      "flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 px-3 py-2.5 text-start",
                      offer.canAfford
                        ? "border-sky-300/40 bg-sky-500/15"
                        : "border-white/10 bg-white/5 opacity-55",
                    ].join(" ")}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/30 font-display text-[10px] font-black text-white/80">
                      {offer.tier.slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-sm font-black text-white">
                        {name}
                      </span>
                      <span className="block font-display text-[11px] font-bold text-white/60">
                        +{toLocaleDigits(offer.payoutPerTick, locale)} · +
                        {toLocaleDigits(
                          offer.facilityRateBonusPercent,
                          locale,
                        )}
                        %
                      </span>
                      {locked && (
                        <span className="mt-0.5 block font-display text-[10px] font-bold text-rose-200/80">
                          {offer.lockedReason === "LEVEL"
                            ? t("club.sponsor.lockLevel", {
                                n: toLocaleDigits(
                                  offer.requiresPlayerLevel,
                                  locale,
                                ),
                              })
                            : offer.lockedReason === "FANS"
                              ? t("club.sponsor.lockFans", {
                                  n: toLocaleDigits(
                                    offer.requiresFans,
                                    locale,
                                  ),
                                })
                              : offer.lockedReason === "STADIUM"
                                ? t("club.sponsor.lockStadium", {
                                    n: toLocaleDigits(
                                      offer.requiresStadiumLevel,
                                      locale,
                                    ),
                                  })
                                : t("club.sponsor.needFunds")}
                        </span>
                      )}
                    </span>
                    <FundsCost amount={offer.signCost} />
                  </button>
                );
              })}
            </div>
          )}

          {sponsor.upgradeCost != null && (
            <GameOffer className="mt-4">
              <p className="font-display text-[10px] font-black uppercase tracking-widest text-accent">
                {t("club.biz.nextUpgrade")}
              </p>
              <p className="font-display text-sm font-bold text-white/80">
                {t("club.sponsor.upgradeHint")}
              </p>
              <GameCta
                variant="accent"
                block
                className="mt-3"
                disabled={pending || !sponsor.canUpgrade}
                onClick={() => {
                  haptic(HAPTIC.tap);
                  playSound("click");
                  void upgrade();
                }}
              >
                {sponsor.canUpgrade ? (
                  <>
                    <span>{t("club.sponsor.upgradeCta")}</span>
                    <FundsCost amount={sponsor.upgradeCost} />
                  </>
                ) : (
                  t("club.sponsor.needFunds")
                )}
              </GameCta>
            </GameOffer>
          )}
        </>
      )}
    </BottomSheet>
  );
}
