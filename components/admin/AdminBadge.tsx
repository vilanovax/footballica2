import type { ReactNode } from "react";
import { Type as TypeIcon, Image as ImageIcon } from "lucide-react";

type BadgeTone =
  | "slate"
  | "green"
  | "amber"
  | "rose"
  | "indigo"
  | "emerald";

const TONE_CLASSES: Record<BadgeTone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  green: "bg-green-100 text-green-700 ring-green-200",
  amber: "bg-amber-100 text-amber-700 ring-amber-200",
  rose: "bg-rose-100 text-rose-700 ring-rose-200",
  indigo: "bg-indigo-100 text-indigo-700 ring-indigo-200",
  emerald: "bg-emerald-100 text-emerald-700 ring-emerald-200",
};

export function AdminBadge({
  tone = "slate",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

// ─── Domain-specific badge mappings ──────────────────────────────────────────

export function TypeBadge({ type }: { type: "TEXT" | "IMAGE" }) {
  const Icon = type === "IMAGE" ? ImageIcon : TypeIcon;
  return (
    <span
      title={type === "IMAGE" ? "Image question" : "Text question"}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md ring-1 ring-inset ${
        type === "IMAGE"
          ? "bg-indigo-100 text-indigo-700 ring-indigo-200"
          : "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
      <span className="sr-only">{type}</span>
    </span>
  );
}

const DIFFICULTY_TONE = {
  EASY: "green",
  MEDIUM: "amber",
  HARD: "rose",
} as const;

export function DifficultyBadge({
  difficulty,
}: {
  difficulty: "EASY" | "MEDIUM" | "HARD";
}) {
  return (
    <AdminBadge tone={DIFFICULTY_TONE[difficulty]}>
      {difficulty.charAt(0) + difficulty.slice(1).toLowerCase()}
    </AdminBadge>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <AdminBadge tone={active ? "emerald" : "slate"}>
      {active ? "Active" : "Inactive"}
    </AdminBadge>
  );
}

const QUESTION_STATUS_TONE = {
  DRAFT: "slate",
  IN_REVIEW: "amber",
  PUBLISHED: "emerald",
  RETIRED: "rose",
} as const;

const QUESTION_STATUS_LABEL = {
  DRAFT: "Draft",
  IN_REVIEW: "In review",
  PUBLISHED: "Published",
  RETIRED: "Retired",
} as const;

export function QuestionStatusBadge({
  status,
}: {
  status: "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "RETIRED";
}) {
  return (
    <AdminBadge tone={QUESTION_STATUS_TONE[status]}>
      {QUESTION_STATUS_LABEL[status]}
    </AdminBadge>
  );
}

const REPORT_TONE = {
  PENDING: "amber",
  RESOLVED: "emerald",
  REJECTED: "rose",
} as const;

export function ReportStatusBadge({
  status,
}: {
  status: "PENDING" | "RESOLVED" | "REJECTED";
}) {
  return (
    <AdminBadge tone={REPORT_TONE[status]}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </AdminBadge>
  );
}
