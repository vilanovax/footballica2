"use client";

import { motion } from "framer-motion";
import {
  assignStaff,
  fireStaff,
  hireStaff,
} from "@/actions/club/staff";
import type { ClubSnapshot } from "@/lib/club/upgrades";
import type { BusinessFacilityKey } from "@/lib/club/businessEconomy";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";

type StaffBusinessSheetProps = {
  open: boolean;
  onClose: () => void;
  club: ClubSnapshot;
  pending: boolean;
  onClubUpdate: (club: ClubSnapshot) => void;
  onBusy: (label: string | null) => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  /** Prefill assign target when opened from a facility card. */
  focusFacilityKey?: BusinessFacilityKey | null;
};

const FACILITY_NAME: Record<BusinessFacilityKey, string> = {
  TICKET_OFFICE: "club.biz.ticketOffice",
  CLUB_SHOP: "club.biz.clubShop",
  MUSEUM: "club.biz.museum",
};

/**
 * Hire / assign staff pool — one sheet, bank-modal tone.
 */
export function StaffBusinessSheet({
  open,
  onClose,
  club,
  pending,
  onClubUpdate,
  onBusy,
  onError,
  onSuccess,
  focusFacilityKey = null,
}: StaffBusinessSheetProps) {
  const { t, locale } = useTranslation();
  const staff = club.business.staff;
  const builtKeys = club.business.facilities
    .filter((f) => f.status === "BUILT")
    .map((f) => f.key);

  async function hire(templateKey: string) {
    onBusy("staff-hire");
    const res = await hireStaff(templateKey);
    onBusy(null);
    if (!res.ok) {
      onError(
        res.error === "STAFF_CAP"
          ? t("club.staff.capReached")
          : res.error === "NEED_FUNDS"
            ? t("club.staff.needFunds")
            : res.error,
      );
      return;
    }
    onClubUpdate(res.club);
    onSuccess(t("club.staff.hired"));
  }

  async function assign(staffId: string, key: string | null) {
    onBusy("staff-assign");
    const res = await assignStaff(staffId, key);
    onBusy(null);
    if (!res.ok) {
      onError(res.error);
      return;
    }
    onClubUpdate(res.club);
    onSuccess(
      key ? t("club.staff.assigned") : t("club.staff.benched"),
    );
  }

  async function fire(staffId: string) {
    onBusy("staff-fire");
    const res = await fireStaff(staffId);
    onBusy(null);
    if (!res.ok) {
      onError(res.error);
      return;
    }
    onClubUpdate(res.club);
    onSuccess(t("club.staff.fired"));
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("club.staff.title")}
      subtitle={t("club.staff.subtitle", {
        n: toLocaleDigits(staff.hiredCount, locale),
        max: toLocaleDigits(staff.maxHired, locale),
      })}
      closeLabel={t("common.close")}
      tone="dark"
    >
      <div className="relative -mx-1 overflow-hidden rounded-bubble-xl border border-white/15 bg-gradient-to-br from-[#1e293b] via-[#334155] to-[#0f172a] shadow-[0_8px_0_0_rgba(0,0,0,0.35)]">
        <div className="relative flex flex-col items-center px-4 pb-5 pt-5">
          <motion.span
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/25 bg-black/30 text-3xl"
            animate={{ y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
            aria-hidden
          >
            👔
          </motion.span>
          <p className="mt-2 max-w-[17rem] text-center font-display text-xs font-bold text-white/75">
            {t("club.staff.heroHint")}
          </p>
          {staff.hasTreasurer && (
            <p className="mt-2 rounded-full bg-emerald-500/20 px-3 py-1 font-display text-[11px] font-black text-emerald-200 ring-1 ring-emerald-400/40">
              {t("club.staff.treasurerActive")}
            </p>
          )}
        </div>
      </div>

      {/* Hire offers */}
      {staff.enabled && staff.offers.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 font-display text-[11px] font-black uppercase tracking-widest text-white/50">
            {t("club.staff.hireTitle")}
          </p>
          <div className="flex flex-col gap-2.5">
            {staff.offers.map((offer) => (
              <div
                key={offer.templateKey}
                className="flex items-center gap-3 rounded-bubble-xl border-2 border-white/12 bg-white/8 px-3 py-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={offer.avatarImage}
                  alt=""
                  className="h-12 w-12 rounded-xl object-cover ring-2 ring-white/20"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-black text-white">
                    {t(`club.staff.templates.${offer.nameKey}`)}
                  </p>
                  <p className="font-display text-[11px] font-bold text-lime-300">
                    {offer.role === "TREASURER"
                      ? t("club.staff.perkTreasurer", {
                          pct: toLocaleDigits(offer.rateBonusPercent, locale),
                        })
                      : t("club.staff.perkRate", {
                          pct: toLocaleDigits(offer.rateBonusPercent, locale),
                        })}
                  </p>
                </div>
                <motion.button
                  type="button"
                  disabled={pending || !offer.canAfford}
                  onClick={() => void hire(offer.templateKey)}
                  whileTap={pending || !offer.canAfford ? undefined : { y: 2 }}
                  className={[
                    "shrink-0 rounded-bubble px-3 py-2 font-display text-xs font-black",
                    offer.canAfford
                      ? "bg-accent text-accent-foreground shadow-[0_3px_0_0_hsl(var(--accent-deep))]"
                      : "cursor-not-allowed bg-white/10 text-white/45",
                  ].join(" ")}
                >
                  💎 {toLocaleDigits(offer.cost, locale)}
                </motion.button>
              </div>
            ))}
          </div>
        </div>
      )}

      {staff.enabled && staff.nextHireCost === null && staff.hiredCount > 0 && (
        <p className="mt-3 text-center font-display text-xs font-bold text-white/45">
          {t("club.staff.capReached")}
        </p>
      )}

      {/* Roster */}
      {staff.members.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 font-display text-[11px] font-black uppercase tracking-widest text-white/50">
            {t("club.staff.rosterTitle")}
          </p>
          <div className="flex flex-col gap-2.5">
            {staff.members.map((m) => (
              <div
                key={m.id}
                className={[
                  "rounded-bubble-xl border-2 px-3 py-3",
                  focusFacilityKey && !m.assignedFacilityKey
                    ? "border-accent/60 bg-accent/10"
                    : "border-white/12 bg-white/8",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.avatarImage}
                    alt=""
                    className="h-11 w-11 rounded-xl object-cover ring-2 ring-white/20"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-black text-white">
                      {t(`club.staff.templates.${m.nameKey}`)}
                      {m.role === "TREASURER" ? " 💼" : ""}
                    </p>
                    <p className="font-display text-[11px] font-bold text-white/55">
                      +{toLocaleDigits(m.rateBonusPercent, locale)}% ·{" "}
                      {m.assignedFacilityKey
                        ? t(FACILITY_NAME[m.assignedFacilityKey])
                        : t("club.staff.bench")}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {focusFacilityKey && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void assign(m.id, focusFacilityKey)}
                      className="rounded-full bg-accent px-2.5 py-1 font-display text-[11px] font-black text-accent-foreground"
                    >
                      {t("club.staff.putHere")}
                    </button>
                  )}
                  {builtKeys.map((fk) => (
                    <button
                      key={fk}
                      type="button"
                      disabled={pending || m.assignedFacilityKey === fk}
                      onClick={() => void assign(m.id, fk)}
                      className={[
                        "rounded-full px-2.5 py-1 font-display text-[11px] font-bold ring-1",
                        m.assignedFacilityKey === fk
                          ? "bg-white/20 text-white ring-white/30"
                          : "bg-white/5 text-white/75 ring-white/15",
                      ].join(" ")}
                    >
                      {t(FACILITY_NAME[fk])}
                    </button>
                  ))}
                  {m.assignedFacilityKey && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void assign(m.id, null)}
                      className="rounded-full bg-white/5 px-2.5 py-1 font-display text-[11px] font-bold text-white/60 ring-1 ring-white/15"
                    >
                      {t("club.staff.toBench")}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void fire(m.id)}
                    className="rounded-full px-2.5 py-1 font-display text-[11px] font-bold text-rose-300/80 ring-1 ring-rose-400/30"
                  >
                    {t("club.staff.fire")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!staff.enabled && (
        <p className="mt-4 text-center font-display text-xs font-bold text-white/45">
          {t("club.staff.offline")}
        </p>
      )}
    </BottomSheet>
  );
}
