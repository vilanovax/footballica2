"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { resolveMatch, type ResolveMatchResult } from "@/actions/resolveMatch";
import type { KickSubmission, MatchRewards } from "@/lib/quiz/scoring";

type MatchResultProps = {
  rewards: MatchRewards;
  totalKicks: number;
  submissions: KickSubmission[];
  onPlayAgain: () => void;
  onExit: () => void;
};

type SaveState =
  | { status: "saving" }
  | { status: "saved"; data: Extract<ResolveMatchResult, { ok: true }> }
  | { status: "error"; message: string };

export function MatchResult({
  rewards,
  totalKicks,
  submissions,
  onPlayAgain,
  onExit,
}: MatchResultProps) {
  const won = rewards.goals > totalKicks / 2;
  const [save, setSave] = useState<SaveState>({ status: "saving" });

  // Guard against double-submit in React strict/dev double-invoke.
  const submittedRef = useRef(false);

  async function submit() {
    setSave({ status: "saving" });
    const result = await resolveMatch(submissions);
    if (result.ok) {
      setSave({ status: "saved", data: result });
    } else {
      setSave({ status: "error", message: result.error });
    }
  }

  useEffect(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (save.status === "saving") {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
          className="text-6xl"
          aria-hidden
        >
          ⚽️
        </motion.div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Saving Results…
          </h1>
          <p className="mt-1 font-display text-base font-semibold text-muted-foreground">
            در حال ذخیره نتیجه…
          </p>
        </div>
      </section>
    );
  }

  if (save.status === "error") {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="text-6xl" aria-hidden>
          📡
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-destructive">
            Save Failed
          </h1>
          <p className="mt-1 max-w-xs font-body text-sm font-semibold text-muted-foreground">
            {save.message}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={() => void submit()}
            className="btn-fantasy btn-fantasy-primary w-full justify-center"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={onExit}
            className="btn-fantasy btn-fantasy-accent w-full justify-center"
          >
            Back to Club
          </button>
        </div>
      </section>
    );
  }

  // Saved — show server-confirmed rewards + new balances.
  const { rewards: confirmed, balances } = save.data;

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className="flex flex-1 flex-col items-center justify-center gap-6 text-center"
    >
      <motion.div
        animate={{ rotate: [0, -6, 6, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 0.6 }}
        className="text-6xl"
        aria-hidden
      >
        {won ? "🏆" : "🧤"}
      </motion.div>

      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          {won ? "Shootout Won!" : "Shootout Lost"}
        </h1>
        <p className="mt-1 font-display text-lg font-semibold text-muted-foreground">
          {confirmed.goals} / {totalKicks} goals scored
        </p>
      </div>

      <div className="grid w-full grid-cols-3 gap-3">
        {[
          { label: "Coins", value: `+${confirmed.coins}`, tone: "text-accent-deep" },
          { label: "XP", value: `+${confirmed.xp}`, tone: "text-primary" },
          { label: "Fans", value: `+${confirmed.fans}`, tone: "text-secondary" },
        ].map((r) => (
          <div
            key={r.label}
            className="rounded-bubble border border-border bg-surface px-3 py-4 shadow-fantasy"
          >
            <p className={`font-display text-xl font-bold ${r.tone}`}>
              {r.value}
            </p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {r.label}
            </p>
          </div>
        ))}
      </div>

      {/* Server-confirmed club totals */}
      <div className="flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 font-display text-sm font-bold shadow-fantasy-sm">
        <span className="text-accent-deep">💰 {balances.coins}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-secondary">👥 {balances.fans}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-primary">
          ⚡ {balances.stamina}/{balances.maxStamina}
        </span>
      </div>

      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={onPlayAgain}
          className="btn-fantasy btn-fantasy-primary w-full justify-center"
        >
          Play Again
        </button>
        <button
          type="button"
          onClick={onExit}
          className="btn-fantasy btn-fantasy-accent w-full justify-center"
        >
          Back to Club
        </button>
      </div>
    </motion.section>
  );
}
