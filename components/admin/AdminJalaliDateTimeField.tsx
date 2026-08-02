"use client";

import {
  formatDatetimeLocal,
  parseDatetimeLocal,
} from "@/lib/admin/jalali";
import { AdminJalaliDateField } from "@/components/admin/AdminJalaliDateField";
import { Input } from "@/components/ui/input";

type AdminJalaliDateTimeFieldProps = {
  value: string;
  onChange: (datetimeLocal: string) => void;
  disabled?: boolean;
  /** Allow clearing the schedule window. */
  clearable?: boolean;
  id?: string;
  className?: string;
};

/**
 * Shamsi date + local time. Value is `YYYY-MM-DDTHH:mm` (same as datetime-local).
 */
export function AdminJalaliDateTimeField({
  value,
  onChange,
  disabled,
  clearable,
  id,
  className,
}: AdminJalaliDateTimeFieldProps) {
  const parts = parseDatetimeLocal(value);
  const dateKey = parts?.dateKey ?? "";
  const time =
    parts != null
      ? `${String(parts.hours).padStart(2, "0")}:${String(parts.minutes).padStart(2, "0")}`
      : "";

  function setDate(nextKey: string) {
    if (!nextKey) {
      onChange("");
      return;
    }
    const [h, m] = (time || "00:00").split(":").map(Number);
    onChange(formatDatetimeLocal(nextKey, h || 0, m || 0));
  }

  function setTime(next: string) {
    if (!next) {
      if (!dateKey) {
        onChange("");
        return;
      }
      onChange(formatDatetimeLocal(dateKey, 0, 0));
      return;
    }
    const [hRaw, mRaw] = next.split(":");
    const h = Number(hRaw);
    const m = Number(mRaw);
    const key =
      dateKey ||
      (() => {
        const now = new Date();
        const y = now.getFullYear();
        const mo = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        return `${y}-${mo}-${d}`;
      })();
    onChange(formatDatetimeLocal(key, h || 0, m || 0));
  }

  return (
    <div className={["space-y-1.5", className].filter(Boolean).join(" ")}>
      <div className="grid grid-cols-[1fr_6.5rem] gap-2">
        <AdminJalaliDateField
          id={id}
          value={dateKey}
          onChange={setDate}
          disabled={disabled}
          showGregorianHint={false}
        />
        <Input
          type="time"
          value={time}
          disabled={disabled}
          onChange={(e) => setTime(e.target.value)}
          className="h-10"
          aria-label="Time"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {value ? (
          <p className="font-mono text-[10px] text-emerald-800/70" dir="ltr">
            {value.replace("T", " ")}
          </p>
        ) : null}
        {clearable && value ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("")}
            className="text-[11px] font-semibold text-emerald-800 underline-offset-2 hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
