"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  requireUserClub,
  toClubSnapshotWithBooster,
} from "@/lib/player/current";
import { getGameConfig } from "@/lib/game/gameConfig";
import type { ClubSnapshot } from "@/lib/club/upgrades";
import type { BusinessFacilityKey } from "@/lib/club/businessEconomy";
import {
  buildStaffOffers,
  getStaffTemplate,
  hireCostAtCount,
} from "@/lib/club/staff";
import {
  isFacilityKey,
  settleStaffAutoCollect,
} from "@/lib/club/staffService";
import { settleClubBankInterest } from "@/lib/club/businessService";
import { tehranDayKeyClient } from "@/lib/game/tehranClock";

export type StaffActionResult =
  | { ok: true; club: ClubSnapshot }
  | { ok: false; error: string };

class StaffError extends Error {}

/** Hire a staff candidate from today's offers (by template key). */
export async function hireStaff(
  templateKey: string,
): Promise<StaffActionResult> {
  try {
    const clubSnap = await prisma.$transaction(async (tx) => {
      const pair = await requireUserClub(tx);
      if (!pair) throw new StaffError("Not authenticated.");
      const { user } = pair;
      let { club } = pair;
      club = await settleClubBankInterest(club, tx);
      club = await settleStaffAutoCollect(club, tx);

      const config = await getGameConfig();
      const staffCfg = config.businessEconomy.staff;
      if (!staffCfg.enabled) throw new StaffError("Staff hiring is offline.");

      const tmpl = getStaffTemplate(templateKey);
      if (!tmpl) throw new StaffError("Unknown staff candidate.");

      const hired = await tx.clubStaff.findMany({ where: { clubId: club.id } });
      if (hired.length >= staffCfg.maxHired) {
        throw new StaffError("STAFF_CAP");
      }
      if (hired.some((h) => h.templateKey === templateKey)) {
        throw new StaffError("Already hired.");
      }

      const offers = buildStaffOffers({
        clubId: club.id,
        hiredTemplateKeys: hired.map((h) => h.templateKey),
        hiredCount: hired.length,
        clubFunds: club.clubFunds,
        dayKey: tehranDayKeyClient(new Date()),
        config,
      });
      if (!offers.some((o) => o.templateKey === templateKey)) {
        throw new StaffError("Offer expired — refresh and try again.");
      }

      const cost = hireCostAtCount(hired.length, config);
      if (club.clubFunds < cost) throw new StaffError("NEED_FUNDS");

      await tx.clubStaff.create({
        data: {
          clubId: club.id,
          templateKey: tmpl.key,
          avatarKey: tmpl.avatarKey,
          role: tmpl.role,
          rateBonusPercent: tmpl.rateBonusPercent,
          assignedFacilityKey: null,
        },
      });

      const updated = await tx.club.update({
        where: { id: club.id },
        data: { clubFunds: { decrement: cost } },
      });
      return toClubSnapshotWithBooster(updated, tx, user.xp);
    });
    revalidatePath("/club");
    return { ok: true, club: clubSnap };
  } catch (err) {
    if (err instanceof StaffError) {
      return { ok: false, error: err.message };
    }
    console.error("hireStaff failed", err);
    return { ok: false, error: "Hire failed. Please try again." };
  }
}

/** Assign hired staff to a BUILT facility (or null to bench). */
export async function assignStaff(
  staffId: string,
  facilityKey: string | null,
): Promise<StaffActionResult> {
  try {
    const clubSnap = await prisma.$transaction(async (tx) => {
      const pair = await requireUserClub(tx);
      if (!pair) throw new StaffError("Not authenticated.");
      const { user } = pair;
      let { club } = pair;
      club = await settleClubBankInterest(club, tx);
      club = await settleStaffAutoCollect(club, tx);

      const staff = await tx.clubStaff.findFirst({
        where: { id: staffId, clubId: club.id },
      });
      if (!staff) throw new StaffError("Staff not found.");

      let assignKey: BusinessFacilityKey | null = null;
      if (facilityKey != null) {
        if (!isFacilityKey(facilityKey)) {
          throw new StaffError("Unknown facility.");
        }
        const fac = await tx.clubFacility.findUnique({
          where: {
            clubId_key: { clubId: club.id, key: facilityKey },
          },
        });
        if (!fac || fac.status !== "BUILT") {
          throw new StaffError("Facility not open.");
        }
        assignKey = facilityKey;

        // Clear whoever currently sits at this desk.
        await tx.clubStaff.updateMany({
          where: {
            clubId: club.id,
            assignedFacilityKey: assignKey,
            NOT: { id: staff.id },
          },
          data: { assignedFacilityKey: null },
        });
      }

      await tx.clubStaff.update({
        where: { id: staff.id },
        data: { assignedFacilityKey: assignKey },
      });

      return toClubSnapshotWithBooster(club, tx, user.xp);
    });
    revalidatePath("/club");
    return { ok: true, club: clubSnap };
  } catch (err) {
    if (err instanceof StaffError) {
      return { ok: false, error: err.message };
    }
    console.error("assignStaff failed", err);
    return { ok: false, error: "Assign failed. Please try again." };
  }
}

/** Fire staff (free, no refund). */
export async function fireStaff(staffId: string): Promise<StaffActionResult> {
  try {
    const clubSnap = await prisma.$transaction(async (tx) => {
      const pair = await requireUserClub(tx);
      if (!pair) throw new StaffError("Not authenticated.");
      const { user } = pair;
      let { club } = pair;
      club = await settleClubBankInterest(club, tx);

      const deleted = await tx.clubStaff.deleteMany({
        where: { id: staffId, clubId: club.id },
      });
      if (deleted.count === 0) throw new StaffError("Staff not found.");

      return toClubSnapshotWithBooster(club, tx, user.xp);
    });
    revalidatePath("/club");
    return { ok: true, club: clubSnap };
  } catch (err) {
    if (err instanceof StaffError) {
      return { ok: false, error: err.message };
    }
    console.error("fireStaff failed", err);
    return { ok: false, error: "Fire failed. Please try again." };
  }
}
