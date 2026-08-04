"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  assignStaff,
  fireStaff,
  hireStaff,
} from "@/actions/club/staff";
import type { ClubSnapshot } from "@/lib/club/upgrades";
import type { BusinessFacilityKey } from "@/lib/club/businessEconomy";
import type { StaffMemberView, StaffOfferView } from "@/lib/club/staff";
import { staffDisplayName } from "@/lib/club/staff";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FundsCost } from "@/components/club-hub/FundsCost";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";

type StaffListRow =
  | { kind: "hired"; member: StaffMemberView }
  | { kind: "offer"; offer: StaffOfferView };

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

const FACILITY_ICON: Record<BusinessFacilityKey, string> = {
  TICKET_OFFICE: "🎫",
  CLUB_SHOP: "🛍️",
  MUSEUM: "🏆",
};

/**
 * Hire / assign staff pool — one sheet, bank-modal tone.
 * Assign goes through a dedicated business-picker sheet.
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
  const builtFacilities = club.business.facilities.filter(
    (f) => f.status === "BUILT",
  );
  const [assignTarget, setAssignTarget] = useState<StaffMemberView | null>(
    null,
  );

  /** One list in catalog order — hired stay in place, not shoved to a footer. */
  const listRows = useMemo((): StaffListRow[] => {
    const byTemplate = new Map(
      staff.members.map((m) => [m.templateKey, m] as const),
    );
    const offerByKey = new Map(
      staff.offers.map((o) => [o.templateKey, o] as const),
    );
    const keys =
      staff.catalogKeys.length > 0
        ? staff.catalogKeys
        : [
            ...staff.members.map((m) => m.templateKey),
            ...staff.offers.map((o) => o.templateKey),
          ];
    const rows: StaffListRow[] = [];
    const seen = new Set<string>();
    for (const key of keys) {
      if (seen.has(key)) continue;
      seen.add(key);
      const member = byTemplate.get(key);
      if (member) {
        rows.push({ kind: "hired", member });
        continue;
      }
      const offer = offerByKey.get(key);
      if (offer) rows.push({ kind: "offer", offer });
    }
    for (const m of staff.members) {
      if (!seen.has(m.templateKey)) {
        rows.push({ kind: "hired", member: m });
      }
    }
    return rows;
  }, [staff.catalogKeys, staff.members, staff.offers]);

  useEffect(() => {
    if (!open) setAssignTarget(null);
  }, [open]);

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
    onSuccess(key ? t("club.staff.assigned") : t("club.staff.benched"));
    setAssignTarget(null);
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
    setAssignTarget(null);
  }

  function occupantLabel(facilityKey: BusinessFacilityKey): string | null {
    const other = staff.members.find(
      (m) =>
        m.assignedFacilityKey === facilityKey &&
        m.id !== assignTarget?.id,
    );
    return other ? staffDisplayName(other, locale) : null;
  }

  return (
    <>
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
              transition={{
                repeat: Infinity,
                duration: 2.4,
                ease: "easeInOut",
              }}
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

        {staff.enabled && listRows.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 font-display text-[11px] font-black uppercase tracking-widest text-white/50">
              {t("club.staff.hireTitle")}
            </p>
            <div className="flex flex-col gap-2.5">
              {listRows.map((row) => {
                if (row.kind === "offer") {
                  const offer = row.offer;
                  return (
                    <div
                      key={`offer-${offer.templateKey}`}
                      className={[
                        "flex items-center gap-3 rounded-bubble-xl border-2 px-3 py-3 transition-all",
                        offer.canAfford
                          ? "border-white/12 bg-white/8"
                          : "border-white/8 bg-white/[0.03] opacity-55 grayscale",
                      ].join(" ")}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={offer.avatarImage}
                        alt=""
                        className={[
                          "h-12 w-12 rounded-xl object-cover ring-2",
                          offer.canAfford ? "ring-white/20" : "ring-white/10",
                        ].join(" ")}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={[
                            "font-display text-sm font-black",
                            offer.canAfford ? "text-white" : "text-white/70",
                          ].join(" ")}
                        >
                          {staffDisplayName(offer, locale)}
                        </p>
                        <p
                          className={[
                            "font-display text-[11px] font-bold",
                            offer.canAfford
                              ? "text-lime-300"
                              : "text-white/40",
                          ].join(" ")}
                        >
                          {offer.role === "TREASURER"
                            ? t("club.staff.perkTreasurer", {
                                pct: toLocaleDigits(
                                  offer.rateBonusPercent,
                                  locale,
                                ),
                              })
                            : t("club.staff.perkRate", {
                                pct: toLocaleDigits(
                                  offer.rateBonusPercent,
                                  locale,
                                ),
                              })}
                        </p>
                        {!offer.canAfford && (
                          <p className="mt-0.5 font-display text-[10px] font-bold text-white/35">
                            {t("club.staff.needFunds")}
                          </p>
                        )}
                      </div>
                      <motion.button
                        type="button"
                        disabled={pending || !offer.canAfford}
                        onClick={() => void hire(offer.templateKey)}
                        whileTap={
                          pending || !offer.canAfford ? undefined : { y: 2 }
                        }
                        className={[
                          "shrink-0 rounded-bubble px-3 py-2 font-display text-xs font-black",
                          offer.canAfford
                            ? "bg-accent text-accent-foreground shadow-[0_3px_0_0_hsl(var(--accent-deep))]"
                            : "cursor-not-allowed bg-white/10 text-white/40",
                        ].join(" ")}
                      >
                        <FundsCost
                          amount={offer.cost}
                          variant="plain"
                          className="font-black"
                        />
                      </motion.button>
                    </div>
                  );
                }

                const m = row.member;
                return (
                  <div
                    key={`hired-${m.id}`}
                    className={[
                      "rounded-bubble-xl border-2 px-3 py-3",
                      focusFacilityKey && !m.assignedFacilityKey
                        ? "border-accent/60 bg-accent/10"
                        : "border-emerald-400/35 bg-emerald-500/10",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.avatarImage}
                        alt=""
                        className="h-12 w-12 rounded-xl object-cover ring-2 ring-emerald-300/40"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-display text-sm font-black text-white">
                            {staffDisplayName(m, locale)}
                            {m.role === "TREASURER" ? " 💼" : ""}
                          </p>
                          <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 font-display text-[10px] font-black text-emerald-200 ring-1 ring-emerald-300/30">
                            {t("club.staff.hiredBadge")}
                          </span>
                        </div>
                        <p className="font-display text-[11px] font-bold text-lime-300/90">
                          +{toLocaleDigits(m.rateBonusPercent, locale)}% ·{" "}
                          {m.assignedFacilityKey
                            ? t(FACILITY_NAME[m.assignedFacilityKey])
                            : t("club.staff.bench")}
                        </p>
                      </div>
                      <motion.button
                        type="button"
                        disabled={pending || builtFacilities.length === 0}
                        onClick={() => setAssignTarget(m)}
                        whileTap={
                          pending || builtFacilities.length === 0
                            ? undefined
                            : { y: 2 }
                        }
                        className={[
                          "shrink-0 rounded-bubble px-3 py-2 font-display text-[11px] font-black",
                          builtFacilities.length > 0
                            ? "border border-white/25 bg-white/10 text-white"
                            : "cursor-not-allowed bg-white/5 text-white/35",
                        ].join(" ")}
                      >
                        {m.assignedFacilityKey
                          ? t("club.staff.changeDesk")
                          : t("club.staff.connectCta")}
                      </motion.button>
                    </div>

                    {focusFacilityKey &&
                      m.assignedFacilityKey !== focusFacilityKey && (
                        <motion.button
                          type="button"
                          disabled={pending}
                          onClick={() => void assign(m.id, focusFacilityKey)}
                          whileTap={pending ? undefined : { y: 2 }}
                          className="mt-2.5 flex min-h-10 w-full items-center justify-center rounded-bubble bg-accent px-3 font-display text-xs font-black text-accent-foreground shadow-[0_3px_0_0_hsl(var(--accent-deep))]"
                        >
                          {t("club.staff.putHere")}
                        </motion.button>
                      )}

                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void fire(m.id)}
                      className="mt-1.5 w-full py-1 text-center font-display text-[11px] font-bold text-rose-300/70"
                    >
                      {t("club.staff.fire")}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {staff.enabled &&
          staff.nextHireCost === null &&
          staff.hiredCount > 0 && (
            <p className="mt-3 text-center font-display text-xs font-bold text-white/45">
              {t("club.staff.capReached")}
            </p>
          )}

        {!staff.enabled && (
          <p className="mt-4 text-center font-display text-xs font-bold text-white/45">
            {t("club.staff.offline")}
          </p>
        )}
      </BottomSheet>

      <BottomSheet
        open={assignTarget != null}
        onClose={() => setAssignTarget(null)}
        title={t("club.staff.pickBusinessTitle")}
        subtitle={
          assignTarget
            ? t("club.staff.pickBusinessSubtitle", {
                name: staffDisplayName(assignTarget, locale),
              })
            : undefined
        }
        closeLabel={t("common.close")}
        tone="dark"
        layer="overlay"
      >
        {assignTarget && (
          <div className="flex flex-col gap-2.5">
            {builtFacilities.map((f) => {
              const selected = assignTarget.assignedFacilityKey === f.key;
              const occupant = occupantLabel(f.key);
              return (
                <motion.button
                  key={f.key}
                  type="button"
                  disabled={pending || selected}
                  onClick={() => void assign(assignTarget.id, f.key)}
                  whileTap={pending || selected ? undefined : { y: 2 }}
                  className={[
                    "flex min-h-14 w-full items-center gap-3 rounded-bubble-xl border-2 px-3 py-3 text-start",
                    selected
                      ? "border-accent/60 bg-accent/20"
                      : "border-white/12 bg-white/8",
                  ].join(" ")}
                >
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/30 text-xl"
                    aria-hidden
                  >
                    {FACILITY_ICON[f.key]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-sm font-black text-white">
                      {t(FACILITY_NAME[f.key])}
                    </span>
                    <span className="block font-display text-[11px] font-bold text-white/55">
                      {selected
                        ? t("club.staff.currentlyHere")
                        : occupant
                          ? t("club.staff.occupiedBy", { name: occupant })
                          : t("club.staff.deskFree")}
                    </span>
                  </span>
                  {selected ? (
                    <span className="font-display text-xs font-black text-accent">
                      ✓
                    </span>
                  ) : (
                    <span className="font-display text-xs font-bold text-white/45">
                      →
                    </span>
                  )}
                </motion.button>
              );
            })}

            <motion.button
              type="button"
              disabled={pending || assignTarget.assignedFacilityKey == null}
              onClick={() => void assign(assignTarget.id, null)}
              whileTap={
                pending || assignTarget.assignedFacilityKey == null
                  ? undefined
                  : { y: 2 }
              }
              className={[
                "mt-1 flex min-h-12 w-full items-center justify-center rounded-bubble-xl border-2 px-3 font-display text-sm font-black",
                assignTarget.assignedFacilityKey
                  ? "border-white/15 bg-white/5 text-white/80"
                  : "cursor-not-allowed border-white/10 bg-white/5 text-white/35",
              ].join(" ")}
            >
              {t("club.staff.toBench")}
            </motion.button>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
