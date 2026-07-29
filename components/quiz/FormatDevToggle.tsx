"use client";

import { useEffect, useState } from "react";
import type { ForceFormat } from "@/lib/dev/formatMocks";

const COOKIE = "ff_format";
const OPTIONS: Array<{ value: "" | ForceFormat; label: string }> = [
  { value: "", label: "Off" },
  { value: "IMAGE", label: "IMAGE" },
  { value: "CAREER_PATH", label: "CAREER" },
  { value: "REVEAL_IMAGE", label: "REVEAL" },
  { value: "HIGHER_LOWER", label: "H/L" },
  { value: "ALL", label: "ALL" },
];

function readCookie(): string {
  if (typeof document === "undefined") return "";
  const hit = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE}=`));
  return hit ? decodeURIComponent(hit.split("=")[1] ?? "") : "";
}

function writeCookie(value: string) {
  const maxAge = value ? 60 * 60 * 24 * 7 : 0;
  document.cookie = `${COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h.endsWith(".local");
}

/**
 * Local-only chip to force format mocks into the next match draw.
 * Sets `ff_format` cookie → `getMatchQuestions` injects mocks (not on Vercel).
 */
export function FormatDevToggle() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isLocalDevHost());
    setValue(readCookie().toUpperCase());
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-[calc(theme(spacing.nav)+1rem)] start-3 z-[60] max-w-[min(100vw-1.5rem,20rem)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-black/75 px-3 py-1.5 font-display text-[10px] font-black uppercase tracking-wider text-amber-300 shadow-lg ring-1 ring-amber-400/40 backdrop-blur-sm"
      >
        Dev format {value ? `· ${value}` : ""}
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap gap-1 rounded-2xl bg-black/85 p-2 shadow-xl ring-1 ring-white/15 backdrop-blur-md">
          {OPTIONS.map((opt) => {
            const active = (value || "") === opt.value;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  writeCookie(opt.value);
                  setValue(opt.value);
                  setOpen(false);
                  window.location.reload();
                }}
                className={[
                  "rounded-full px-2.5 py-1 font-display text-[10px] font-bold",
                  active
                    ? "bg-amber-400 text-black"
                    : "bg-white/10 text-white/85 hover:bg-white/20",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
