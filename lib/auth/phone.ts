/** Iranian mobile numbers: 09 + 9 digits (11 total). */
export const IRAN_PHONE_RE = /^09\d{9}$/;

export function isIranPhone(phone: string): boolean {
  return IRAN_PHONE_RE.test(phone.trim());
}

export function normalizePhone(phone: string): string {
  return phone.trim().replace(/[\s-]/g, "");
}
