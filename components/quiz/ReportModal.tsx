"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Flag, X } from "lucide-react";
import { submitQuestionReport } from "@/actions/submitReport";
import { REPORT_REASONS, type ReportReasonCode } from "@/lib/reports/reasons";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { haptic, HAPTIC } from "@/lib/audio/haptics";

type ReportModalProps = {
  questionId: string;
  onClose: () => void;
};

export function ReportModal({ questionId, onClose }: ReportModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReasonCode | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  function handleSubmit() {
    if (!reason) return;
    start(async () => {
      const res = await submitQuestionReport(questionId, reason, note);
      if (res.ok) {
        haptic(HAPTIC.goal);
        toast.success(t("report.success"));
        onClose();
      } else {
        toast.error(t("report.error"));
      }
    });
  }

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label={t("report.cancel")}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Drawer */}
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ y: "100%", opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative z-10 w-full max-w-mobile rounded-t-bubble-lg bg-surface p-5 shadow-fantasy-lg sm:rounded-bubble-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <Flag className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold leading-tight text-surface-foreground">
                {t("report.title")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("report.subtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={t("report.cancel")}
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {REPORT_REASONS.map((r) => {
            const selected = reason === r.code;
            return (
              <motion.button
                key={r.code}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => setReason(r.code)}
                aria-pressed={selected}
                className={[
                  "rounded-full border-2 px-4 py-2 font-display text-sm font-bold transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground shadow-fantasy"
                    : "border-border bg-muted text-surface-foreground",
                ].join(" ")}
              >
                {t(`report.reasons.${r.code}`)}
              </motion.button>
            );
          })}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("report.notePlaceholder")}
          rows={2}
          maxLength={500}
          className="mt-4 w-full resize-none rounded-bubble border-2 border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
        />

        <div className="mt-4 flex items-center gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            disabled={!reason || pending}
            onClick={handleSubmit}
            className="flex-1 rounded-full bg-primary px-5 py-3 font-display text-base font-bold text-primary-foreground shadow-fantasy transition disabled:opacity-40"
          >
            {pending ? "…" : t("report.submit")}
          </motion.button>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-full px-4 py-3 font-display text-sm font-bold text-muted-foreground"
          >
            {t("report.cancel")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
