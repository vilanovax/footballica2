"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { jalaaliMonthLength, toGregorian } from "jalaali-js";
import { toJalaali } from "jalaali-js";
import {
  dateKeyToJalali,
  formatJalaliLabel,
  jalaliToDateKey,
} from "@/lib/admin/jalali";

function todayJalali(): { jy: number; jm: number; jd: number } {
  const n = new Date();
  return toJalaali(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

const MONTHS_FA = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

/** Saturday-first week labels. */
const WEEKDAYS_FA = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

/** Jalali weekday with Saturday = 0. */
function jalaliWeekdaySat0(jy: number, jm: number, jd: number): number {
  const g = toGregorian(jy, jm, jd);
  const utc = new Date(Date.UTC(g.gy, g.gm - 1, g.gd));
  return (utc.getUTCDay() + 1) % 7;
}

type AdminJalaliDateFieldProps = {
  value: string;
  onChange: (dateKey: string) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Show Gregorian YYYY-MM-DD under the field (default true). */
  showGregorianHint?: boolean;
};

/**
 * Shamsi (Jalali) date picker backed by `jalaali-js`.
 * Stores Gregorian `YYYY-MM-DD` Live-Ops date keys.
 */
export function AdminJalaliDateField({
  value,
  onChange,
  disabled,
  id,
  className,
  showGregorianHint = true,
}: AdminJalaliDateFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = dateKeyToJalali(value);
  const seed = selected ?? todayJalali();
  const [open, setOpen] = useState(false);
  const [viewJy, setViewJy] = useState(seed.jy);
  const [viewJm, setViewJm] = useState(seed.jm);

  useEffect(() => {
    if (!selected) return;
    setViewJy(selected.jy);
    setViewJm(selected.jm);
  }, [selected?.jy, selected?.jm]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const cells = useMemo(() => {
    const daysInMonth = jalaaliMonthLength(viewJy, viewJm);
    const offset = jalaliWeekdaySat0(viewJy, viewJm, 1);
    const out: Array<{ jd: number; key: string } | null> = [];
    for (let i = 0; i < offset; i++) out.push(null);
    for (let jd = 1; jd <= daysInMonth; jd++) {
      out.push({ jd, key: jalaliToDateKey(viewJy, viewJm, jd) });
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [viewJy, viewJm]);

  function shiftMonth(delta: number) {
    let m = viewJm + delta;
    let y = viewJy;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setViewJy(y);
    setViewJm(m);
  }

  const label = selected ? formatJalaliLabel(value) : "انتخاب تاریخ";

  return (
    <div
      ref={rootRef}
      className={["relative", className].filter(Boolean).join(" ")}
    >
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-950 shadow-sm transition hover:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 disabled:opacity-50"
      >
        <span dir="rtl" className="tabular-nums">
          {label}
        </span>
        <CalendarDays className="h-4 w-4 shrink-0 text-emerald-700" />
      </button>

      {showGregorianHint && value ? (
        <p className="mt-1 font-mono text-[10px] text-emerald-800/70" dir="ltr">
          {value}
        </p>
      ) : null}

      {open ? (
        <div
          role="dialog"
          aria-label="تقویم شمسی"
          className="absolute start-0 z-[80] mt-1.5 w-[17.5rem] rounded-2xl border border-emerald-100 bg-white p-3 shadow-xl"
          dir="rtl"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="ماه بعد"
              onClick={() => shiftMonth(1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-800 hover:bg-emerald-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <p className="text-sm font-bold text-emerald-950">
              {MONTHS_FA[viewJm - 1]} {toPersianDigits(viewJy)}
            </p>
            <button
              type="button"
              aria-label="ماه قبل"
              onClick={() => shiftMonth(-1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-800 hover:bg-emerald-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[11px] font-bold text-emerald-800">
            {WEEKDAYS_FA.map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, i) => {
              if (!cell) {
                return <span key={`e-${i}`} className="h-9" />;
              }
              const isSelected = cell.key === value;
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => {
                    onChange(cell.key);
                    setOpen(false);
                  }}
                  className={[
                    "h-9 rounded-lg text-sm font-semibold tabular-nums transition",
                    isSelected
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-emerald-950 hover:bg-emerald-50",
                  ].join(" ")}
                >
                  {toPersianDigits(cell.jd)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
