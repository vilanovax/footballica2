"use client";

import { HelpCircle } from "lucide-react";

type AdminHelpTipProps = {
  /** Short help text shown on hover / focus. */
  text: string;
  label?: string;
};

/**
 * Lightweight admin field help — no Radix dependency.
 * Uses native title + a focusable popover for keyboard users.
 */
export function AdminHelpTip({ text, label = "Help" }: AdminHelpTipProps) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        title={text}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <HelpCircle className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute start-1/2 top-full z-50 mt-1.5 w-56 -translate-x-1/2 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-left text-[11px] font-normal leading-snug text-slate-600 opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

export function FieldLabel({
  children,
  tip,
  htmlFor,
}: {
  children: React.ReactNode;
  tip?: string;
  htmlFor?: string;
}) {
  return (
    <LabelRow htmlFor={htmlFor}>
      <span>{children}</span>
      {tip ? <AdminHelpTip text={tip} /> : null}
    </LabelRow>
  );
}

function LabelRow({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600"
    >
      {children}
    </label>
  );
}
