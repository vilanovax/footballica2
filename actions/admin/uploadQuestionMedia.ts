"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin/auth";

export type UploadQuestionMediaResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Store question prompt art under `public/questions/` and return a public URL.
 * Does not mutate a Question row — caller sets `mediaUrl` on the form.
 */
export async function uploadQuestionMedia(
  formData: FormData,
): Promise<UploadQuestionMediaResult> {
  const cookieStore = await cookies();
  if (!isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value)) {
    return { ok: false, error: "unauthorized" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "invalid_upload" };
  }
  if (file.size > 2_000_000) {
    return { ok: false, error: "file_too_large" };
  }

  const mime = file.type || "";
  const ext =
    mime === "image/png"
      ? "png"
      : mime === "image/webp"
        ? "webp"
        : mime === "image/jpeg" || mime === "image/jpg"
          ? "jpg"
          : null;
  if (!ext) return { ok: false, error: "unsupported_type" };

  try {
    const dir = path.join(process.cwd(), "public", "questions");
    await mkdir(dir, { recursive: true });
    const stem = randomBytes(8).toString("hex");
    const filename = `${stem}.${ext}`;
    const abs = path.join(dir, filename);
    await writeFile(abs, Buffer.from(await file.arrayBuffer()));
    return { ok: true, url: `/questions/${filename}` };
  } catch (err) {
    console.error("[uploadQuestionMedia]", err);
    return { ok: false, error: "upload_failed" };
  }
}
