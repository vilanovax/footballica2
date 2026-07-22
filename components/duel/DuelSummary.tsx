"use client";

import { useRouter } from "next/navigation";
import type { DuelSnapshot } from "@/lib/duel/snapshot";
import { toScorecard } from "@/lib/duel/toScorecard";
import { DuelScorecard } from "./DuelScorecard";

type DuelSummaryProps = {
  duel: DuelSnapshot;
  /** Fallback when snapshot parties aren't hydrated yet. */
  yourAvatar?: string | null;
  yourName?: string | null;
};

/**
 * In-progress duel board (wait / your-turn). Same Scorecard as the result
 * screen — only `matchStatus` + CTAs differ.
 */
export function DuelSummary({ duel, yourAvatar, yourName }: DuelSummaryProps) {
  const router = useRouter();
  const data = toScorecard(duel, { yourAvatar, yourName });

  return (
    <DuelScorecard
      data={data}
      onPrimaryAction={() => router.refresh()}
      onSecondaryAction={() => router.push("/play/duel")}
    />
  );
}
