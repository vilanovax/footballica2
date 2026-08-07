"use client";

import { HelpCircle } from "lucide-react";

type AdminHelpTipProps = {
  /** Short help body (1–3 sentences). */
  text: string;
  /** Optional bold lead line inside the tip. */
  title?: string;
  label?: string;
  /** Wider tip for longer Live-Ops explanations. */
  wide?: boolean;
};

/**
 * Field / section help for admin CMS.
 * Hover or keyboard-focus the ? to reveal a rich tip (no Radix dependency).
 */
export function AdminHelpTip({
  text,
  title,
  label = "Help",
  wide = false,
}: AdminHelpTipProps) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        title={title ? `${title} — ${text}` : text}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <HelpCircle className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <span
        role="tooltip"
        className={[
          "pointer-events-none absolute start-0 top-full z-50 mt-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left shadow-lg opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 sm:start-1/2 sm:-translate-x-1/2",
          wide ? "w-72 sm:w-80" : "w-60",
        ].join(" ")}
      >
        {title ? (
          <span className="mb-1 block text-[11px] font-semibold text-slate-800">
            {title}
          </span>
        ) : null}
        <span className="block text-[11px] font-normal leading-relaxed text-slate-600">
          {text}
        </span>
      </span>
    </span>
  );
}

export function FieldLabel({
  children,
  tip,
  tipTitle,
  htmlFor,
}: {
  children: React.ReactNode;
  tip?: string;
  tipTitle?: string;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600"
    >
      <span>{children}</span>
      {tip ? <AdminHelpTip text={tip} title={tipTitle} /> : null}
    </label>
  );
}

/** Soft callout used at the top of admin sections. Collapsed by default to keep tables above the fold. */
export function AdminHowItWorks({
  title,
  steps,
}: {
  title: string;
  steps: string[];
}) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white shadow-sm open:shadow-md">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold text-slate-800 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-50 text-[11px] font-bold text-sky-700 ring-1 ring-sky-100">
            ?
          </span>
          {title}
        </span>
        <span className="text-[11px] font-semibold text-slate-400 group-open:hidden">
          Show
        </span>
        <span className="hidden text-[11px] font-semibold text-slate-400 group-open:inline">
          Hide
        </span>
      </summary>
      <ol className="space-y-1.5 border-t border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}
