"use server";

import { prisma } from "@/lib/prisma";
import { isIranPhone, normalizePhone } from "@/lib/auth/phone";
import {
  clearSessionCookie,
  setSessionCookie,
} from "@/lib/auth/session";
import { DEV_OTP_CODE } from "@/lib/auth/otp";

export type SendOtpResult =
  | { ok: true }
  | { ok: false; error: "invalid_phone" | "server_error" };

export type VerifyOtpResult =
  | { ok: true; status: "NEW" | "EXISTING" }
  | { ok: false; error: "invalid_phone" | "invalid_otp" | "server_error" };

/**
 * Validate Iranian mobile and "send" OTP.
 * MVP: no SMS provider — client shows the fixed code hint.
 */
export async function sendOtp(rawPhone: string): Promise<SendOtpResult> {
  const phone = normalizePhone(rawPhone);
  if (!isIranPhone(phone)) {
    return { ok: false, error: "invalid_phone" };
  }
  // Hook for a real SMS provider goes here.
  return { ok: true };
}

/**
 * Verify OTP, upsert the user by phone, set httpOnly session cookie.
 * Returns NEW when the user has no club yet (needs onboarding).
 */
export async function verifyOtp(
  rawPhone: string,
  code: string,
): Promise<VerifyOtpResult> {
  const phone = normalizePhone(rawPhone);
  if (!isIranPhone(phone)) {
    return { ok: false, error: "invalid_phone" };
  }
  if (code.trim() !== DEV_OTP_CODE) {
    return { ok: false, error: "invalid_otp" };
  }

  try {
    let user = await prisma.user.findUnique({
      where: { phone },
      include: { club: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { phone, displayName: null },
        include: { club: true },
      });
    }

    await setSessionCookie(user.id);
    return { ok: true, status: user.club ? "EXISTING" : "NEW" };
  } catch (err) {
    console.error("verifyOtp failed", err);
    return { ok: false, error: "server_error" };
  }
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
}
