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
import {
  GameChip,
  GameCta,
  GameIconWell,
  GamePanel,
  GameTile,
} from "@/components/ui/game";
import { FundsCost } from "@/components/club-hub/FundsCost";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { toLocaleDigits } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

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
  focusFacilityKey?: BusinessFacilityKey | null;
};

const FACILITY_NAME: Record<BusinessFacilityKey, string> = {
  TICKET_OFFICE: "club.biz.ticketOffice",
  CLUB_SHOP: "club.biz.clubShop",
  MUSEUM: "club.biz.museum",
};

const FACILITY_ICON: Record<BusinessFacilityKey, string> = {
  TICKET_OFFICE: "/icons/stadium.png",
  CLUB_SHOP: "/icons/hub-shop.png",
  MUSEUM: "/icons/trophy.png",
};

/**
 * Staff sheet — Arena design system reference implementation (DESIGN.md).
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
    const hired = res.club.business.staff.members.find(
      (m) => m.templateKey === templateKey,
    );
    onSuccess(
      hired?.role === "TREASURER"
        ? t("club.staff.hiredTreasurer")
        : t("club.staff.hired"),
    );
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
        <GamePanel className="-mx-1" tone="emerald">
          <div className="relative flex flex-col items-center px-4 pb-5 pt-5">
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{
                repeat: Infinity,
                duration: 2.4,
                ease: "easeInOut",
              }}
            >
              <GameIconWell size="lg" amber src="/icons/hub-mission.png" />
            </motion.div>
            <p className="mt-2.5 max-w-68 text-center font-display text-xs font-bold text-white/75">
              {t("club.staff.heroHint")}
            </p>
            {staff.hasTreasurer && (
              <GameChip tone="emerald" className="mt-2">
                {t("club.staff.treasurerActive")}
              </GameChip>
            )}
          </div>
        </GamePanel>

        {staff.enabled && listRows.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 font-display text-[11px] font-black uppercase tracking-widest text-arena-muted/70">
              {t("club.staff.hireTitle")}
            </p>
            <div className="flex flex-col gap-2.5">
              {listRows.map((row) => {
                if (row.kind === "offer") {
                  const offer = row.offer;
                  return (
                    <GameTile
                      key={`offer-${offer.templateKey}`}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3",
                        !offer.canAfford && "opacity-55 grayscale",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={offer.avatarImage}
                        alt=""
                        className="h-12 w-12 rounded-xl object-cover shadow-[0_0_0_1px_rgba(255,255,255,0.15)]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-black text-white">
                          {staffDisplayName(offer, locale)}
                        </p>
                        <p
                          className={cn(
                            "font-display text-[11px] font-bold",
                            offer.canAfford
                              ? "text-amber-200"
                              : "text-white/40",
                          )}
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
                      <GameCta
                        variant="accent"
                        disabled={pending || !offer.canAfford}
                        className="min-h-10 shrink-0 rounded-bubble px-3 py-2 text-xs"
                        onClick={() => void hire(offer.templateKey)}
                      >
                        <FundsCost
                          amount={offer.cost}
                          variant="plain"
                          className="font-black"
                        />
                      </GameCta>
                    </GameTile>
                  );
                }

                const m = row.member;
                const highlight =
                  focusFacilityKey && !m.assignedFacilityKey;
                return (
                  <GameTile
                    key={`hired-${m.id}`}
                    tone={highlight ? "amber" : "emerald"}
                    className="px-3 py-3"
                  >
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.avatarImage}
                        alt=""
                        className="h-12 w-12 rounded-xl object-cover shadow-[0_0_0_1px_hsl(var(--arena-ring)/0.4)]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-display text-sm font-black text-white">
                            {staffDisplayName(m, locale)}
                          </p>
                          <GameChip tone="emerald">
                            {t("club.staff.hiredBadge")}
                          </GameChip>
                        </div>
                        <p className="font-display text-[11px] font-bold text-amber-200/90">
                          +{toLocaleDigits(m.rateBonusPercent, locale)}% ·{" "}
                          {m.assignedFacilityKey
                            ? t(FACILITY_NAME[m.assignedFacilityKey])
                            : t("club.staff.bench")}
                        </p>
                      </div>
                      <GameCta
                        variant="accent"
                        disabled={pending || builtFacilities.length === 0}
                        className="min-h-10 shrink-0 rounded-bubble px-3 py-2 text-[11px]"
                        onClick={() => setAssignTarget(m)}
                      >
                        {m.assignedFacilityKey
                          ? t("club.staff.changeDesk")
                          : t("club.staff.connectCta")}
                      </GameCta>
                    </div>

                    {focusFacilityKey &&
                      m.assignedFacilityKey !== focusFacilityKey && (
                        <GameCta
                          variant="accent"
                          block
                          className="mt-2.5 min-h-10 text-xs"
                          disabled={pending}
                          onClick={() => void assign(m.id, focusFacilityKey)}
                        >
                          {t("club.staff.putHere")}
                        </GameCta>
                      )}

                    <GameCta
                      variant="danger"
                      block
                      className="mt-2"
                      disabled={pending}
                      onClick={() => void fire(m.id)}
                    >
                      {t("club.staff.fire")}
                    </GameCta>
                  </GameTile>
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
                  className="text-start"
                >
                  <GameTile
                    tone={selected ? "amber" : "default"}
                    className="flex min-h-14 w-full items-center gap-3 px-3 py-3"
                  >
                    <GameIconWell size="md" src={FACILITY_ICON[f.key]} />
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
                      <span className="font-display text-xs font-black text-amber-300">
                        ✓
                      </span>
                    ) : (
                      <span className="font-display text-xs font-bold text-white/45">
                        →
                      </span>
                    )}
                  </GameTile>
                </motion.button>
              );
            })}

            <GameCta
              variant="ghost"
              block
              className="mt-1"
              disabled={pending || assignTarget.assignedFacilityKey == null}
              onClick={() => void assign(assignTarget.id, null)}
            >
              {t("club.staff.toBench")}
            </GameCta>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
