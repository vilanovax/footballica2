"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getDuel } from "@/actions/duel/getDuel";
import { selectDuelCategory } from "@/actions/duel/selectCategory";
import { submitDuelAttack } from "@/actions/duel/submitAttack";
import {
  beginDuelDefend,
  submitDuelDefend,
} from "@/actions/duel/submitDefend";
import type { DuelSnapshot } from "@/lib/duel/snapshot";
import type { DuelCategoryOption, DuelAnswerSubmission } from "@/lib/duel/types";
import type { QuizQuestion } from "@/lib/quiz/types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { playSound } from "@/lib/audio/SoundManager";
import { DraftPicker } from "./DraftPicker";
import { DuelQuiz } from "./DuelQuiz";
import { DuelWaiting } from "./DuelWaiting";
import { DuelResult } from "./DuelResult";
import { MATCHING_MIN_MS } from "./MatchingSearch";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";

type DuelArenaProps = {
  duelId: string;
  initialDuel: DuelSnapshot;
  initialQuestions: QuizQuestion[] | null;
  yourAvatar?: string | null;
  yourName?: string | null;
};

type Phase =
  | { kind: "matching" }
  | { kind: "draft"; options: DuelCategoryOption[] }
  | { kind: "quiz"; mode: "attack" | "defend"; questions: QuizQuestion[] }
  | { kind: "wait" }
  | { kind: "result" }
  | { kind: "loading" };

function derivePhase(
  duel: DuelSnapshot,
  questions: QuizQuestion[] | null,
): Phase {
  if (
    duel.status === "COMPLETED" ||
    duel.status === "EXPIRED" ||
    duel.status === "FORFEIT"
  ) {
    return { kind: "result" };
  }

  if (duel.status === "MATCHING") return { kind: "matching" };

  const waitingForThem =
    (duel.status === "WAITING_B" && duel.youAre === "challenger") ||
    (duel.status === "WAITING_A" && duel.youAre === "opponent");

  if (waitingForThem) return { kind: "wait" };

  const needsDefend =
    (duel.status === "WAITING_A" && duel.youAre === "challenger") ||
    (duel.status === "WAITING_B" && duel.youAre === "opponent") ||
    duel.status === "A_DEFENDING" ||
    duel.status === "B_DEFENDING";

  if (needsDefend) {
    if (questions && questions.length > 0) {
      return { kind: "quiz", mode: "defend", questions };
    }
    return { kind: "loading" };
  }

  if (
    (duel.status === "A_ATTACKING" || duel.status === "B_ATTACKING") &&
    (duel.canAct ||
      (duel.youAre === "challenger" && duel.status === "A_ATTACKING") ||
      (duel.youAre === "opponent" && duel.status === "B_ATTACKING"))
  ) {
    if (questions && questions.length > 0) {
      return { kind: "quiz", mode: "attack", questions };
    }
    if (duel.draftOptions && duel.draftOptions.length > 0) {
      return { kind: "draft", options: duel.draftOptions };
    }
    return { kind: "loading" };
  }

  return { kind: "wait" };
}

export function DuelArena({
  duelId,
  initialDuel,
  initialQuestions,
  yourAvatar,
  yourName,
}: DuelArenaProps) {
  const { t } = useTranslation();
  const [duel, setDuel] = useState(initialDuel);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(
    initialQuestions,
  );
  const [phase, setPhase] = useState<Phase>(() =>
    derivePhase(initialDuel, initialQuestions),
  );
  const [pending, startTransition] = useTransition();
  /** Tracks in-flight defend bootstrap; reset on cancel so Strict Mode can retry. */
  const beginDefendInFlight = useRef(false);
  const matchingStartedAt = useRef<number | null>(
    initialDuel.status === "MATCHING" ? performance.now() : null,
  );
  const [matchFoundHold, setMatchFoundHold] = useState(false);
  const [missionFeedback, setMissionFeedback] =
    useState<EvaluateMissionsResult | null>(null);
  const pendingAfterMatch = useRef<{
    duel: DuelSnapshot;
    questions: QuizQuestion[] | null;
  } | null>(null);

  const applyDuelState = useCallback(
    (next: DuelSnapshot, nextQuestions: QuizQuestion[] | null) => {
      const nextPhase = derivePhase(next, nextQuestions);

      if (next.status === "MATCHING" && matchingStartedAt.current == null) {
        matchingStartedAt.current = performance.now();
      }

      if (
        phase.kind === "matching" &&
        next.status !== "MATCHING" &&
        matchingStartedAt.current != null
      ) {
        const elapsed = performance.now() - matchingStartedAt.current;
        if (elapsed < MATCHING_MIN_MS) {
          pendingAfterMatch.current = { duel: next, questions: nextQuestions };
          setDuel(next);
          setQuestions(nextQuestions);
          setMatchFoundHold(true);
          return;
        }
      }

      setDuel(next);
      setQuestions(nextQuestions);
      setPhase(nextPhase);
      setMatchFoundHold(false);
      pendingAfterMatch.current = null;
    },
    [phase.kind],
  );

  const refresh = useCallback(async () => {
    const res = await getDuel(duelId);
    if (!res.ok) {
      toast.error(t("duel.errGeneric"));
      return;
    }
    applyDuelState(res.duel, res.questions);
  }, [duelId, t, applyDuelState]);

  useEffect(() => {
    if (!matchFoundHold || !pendingAfterMatch.current) return;
    const started = matchingStartedAt.current ?? performance.now();
    const remaining = Math.max(
      0,
      MATCHING_MIN_MS - (performance.now() - started),
    );
    const id = window.setTimeout(() => {
      const held = pendingAfterMatch.current;
      if (!held) return;
      setDuel(held.duel);
      setQuestions(held.questions);
      setPhase(derivePhase(held.duel, held.questions));
      setMatchFoundHold(false);
      pendingAfterMatch.current = null;
      playSound("whistle");
      // Short hold only — long delays left draft buttons under a stuck matching layer.
    }, remaining + 280);
    return () => window.clearTimeout(id);
  }, [matchFoundHold]);

  // Client fallback if SSR didn't already open the defend turn.
  useEffect(() => {
    const needsBegin =
      (duel.status === "WAITING_A" && duel.youAre === "challenger") ||
      (duel.status === "WAITING_B" && duel.youAre === "opponent") ||
      ((duel.status === "A_DEFENDING" || duel.status === "B_DEFENDING") &&
        (!questions || questions.length === 0));

    if (!needsBegin) return;
    if (questions && questions.length > 0) return;
    if (beginDefendInFlight.current) return;

    beginDefendInFlight.current = true;
    let cancelled = false;

    startTransition(async () => {
      const res = await beginDuelDefend(duelId);
      if (cancelled) {
        beginDefendInFlight.current = false;
        return;
      }
      if (!res.ok) {
        beginDefendInFlight.current = false;
        // Retry once via getDuel (also auto-opens defend).
        void refresh();
        return;
      }
      setDuel(res.duel);
      setQuestions(res.questions);
      setPhase({ kind: "quiz", mode: "defend", questions: res.questions });
      beginDefendInFlight.current = false;
      playSound("whistle");
    });

    return () => {
      cancelled = true;
      beginDefendInFlight.current = false;
    };
  }, [duel.status, duel.youAre, duelId, questions, refresh]);

  // Attack turn stuck without draft — re-fetch once.
  useEffect(() => {
    if (phase.kind !== "loading") return;
    const attackTurn =
      duel.status === "A_ATTACKING" || duel.status === "B_ATTACKING";
    if (!attackTurn) return;
    const id = window.setTimeout(() => {
      void refresh();
    }, 400);
    return () => window.clearTimeout(id);
  }, [phase.kind, duel.status, refresh]);

  useEffect(() => {
    if (phase.kind !== "wait" && phase.kind !== "matching") return;
    if (matchFoundHold) return;
    const ms = phase.kind === "matching" ? 2_000 : 12_000;
    const id = window.setInterval(() => {
      void refresh();
    }, ms);
    if (phase.kind === "matching") {
      const early = window.setTimeout(() => void refresh(), MATCHING_MIN_MS);
      return () => {
        window.clearInterval(id);
        window.clearTimeout(early);
      };
    }
    return () => window.clearInterval(id);
  }, [phase.kind, refresh, matchFoundHold]);

  function handlePickCategory(categoryId: string) {
    startTransition(async () => {
      const res = await selectDuelCategory(duelId, categoryId);
      if (!res.ok) {
        toast.error(t("duel.errGeneric"));
        return;
      }
      setQuestions(res.questions);
      setPhase({ kind: "quiz", mode: "attack", questions: res.questions });
      playSound("whistle");
    });
  }

  function handleAttackDone(answers: DuelAnswerSubmission[]) {
    startTransition(async () => {
      const res = await submitDuelAttack(duelId, answers);
      if (!res.ok) {
        toast.error(t("duel.errGeneric"));
        return;
      }
      setDuel(res.duel);
      setQuestions(null);
      setPhase(derivePhase(res.duel, null));
    });
  }

  function handleDefendDone(answers: DuelAnswerSubmission[]) {
    startTransition(async () => {
      const res = await submitDuelDefend(duelId, answers);
      if (!res.ok) {
        toast.error(t("duel.errGeneric"));
        return;
      }
      setDuel(res.duel);
      setQuestions(null);
      if (res.missions) setMissionFeedback(res.missions);
      setPhase(derivePhase(res.duel, null));
      if (res.duel.status === "COMPLETED") playSound("whistle");
    });
  }

  if (phase.kind === "result") {
    return <DuelResult duel={duel} missions={missionFeedback} />;
  }

  if (phase.kind === "matching" || matchFoundHold || phase.kind === "wait") {
    const showMatching = phase.kind === "matching" || matchFoundHold;
    return (
      <DuelWaiting
        mode={showMatching ? "matching" : "wait"}
        duel={duel}
        isBot={duel.isBotOpponent}
        yourAvatar={yourAvatar}
        yourName={yourName}
        matchFound={
          matchFoundHold || (showMatching && duel.status !== "MATCHING")
        }
        pending={pending}
        onRefresh={() => startTransition(() => void refresh())}
      />
    );
  }

  if (phase.kind === "draft") {
    return (
      <DraftPicker
        options={phase.options}
        pending={pending}
        onPick={handlePickCategory}
      />
    );
  }

  if (phase.kind === "quiz") {
    return (
      <DuelQuiz
        mode={phase.mode}
        title={
          phase.mode === "attack" ? t("duel.attackTitle") : t("duel.defendTitle")
        }
        subtitle={phase.mode === "defend" ? t("duel.defendSub") : undefined}
        questions={phase.questions}
        pending={pending}
        onComplete={
          phase.mode === "attack" ? handleAttackDone : handleDefendDone
        }
      />
    );
  }

  // Loading — keep it brief; offer a manual continue if something stalls.
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4">
      <motion.div
        aria-hidden
        className="text-5xl"
        animate={{ y: [0, -10, 0], opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
      >
        ⚽️
      </motion.div>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => void refresh())}
        className="btn-fantasy btn-fantasy-primary min-h-touch px-8"
      >
        {pending ? "…" : t("duel.continue")}
      </button>
    </section>
  );
}
