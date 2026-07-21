"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin/auth";

export type ReportActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const VALID_STATUSES = ["PENDING", "RESOLVED", "REJECTED"] as const;
type ReportStatus = (typeof VALID_STATUSES)[number];

async function assertAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

/** Move a report through the triage queue (resolve / reject / reopen). */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
): Promise<ReportActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "Unauthorized." };
  if (!VALID_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status." };
  }

  try {
    await prisma.questionReport.update({ where: { id: reportId }, data: { status } });
  } catch {
    return { ok: false, error: "Report not found." };
  }

  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  return { ok: true, id: reportId };
}
