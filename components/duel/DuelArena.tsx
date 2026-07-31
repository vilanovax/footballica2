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
import { selectDuelMemory } from "@/actions/duel/selectMemory";
import { submitDuelAttack } from "@/actions/duel/submitAttack";
import {
  beginDuelDefend,
  submitDuelDefend,
} from "@/actions/duel/submitDefend";
import { beginMemoryTurn } from "@/actions/duel/beginMemoryTurn";
import { submitMemoryAttack } from "@/actions/duel/submitMemoryAttack";
import { submitMemoryDefend } from "@/actions/duel/submitMemoryDefend";
import type { DuelSnapshot } from "@/lib/duel/snapshot";
import type { DuelCategoryOption, DuelAnswerSubmission } from "@/lib/duel/types";
import type {
  MemoryAttemptSubmission,
  MemoryBoardJson,
} from "@/lib/duel/memoryTypes";
import type { QuizQuestion } from "@/lib/quiz/types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { playSound } from "@/lib/audio/SoundManager";
import { DraftPicker } from "./DraftPicker";
import { DuelQuiz } from "./DuelQuiz";
import { DuelWaiting } from "./DuelWaiting";
import { DuelResult } from "./DuelResult";
import { MemoryBoard } from "./MemoryBoard";
import { MATCHING_MIN_MS } from "./MatchingSearch";
import type { EvaluateMissionsResult } from "@/lib/game/missionTypes";

type DuelArenaProps = {
  duelId: string;
  initialDuel: DuelSnapshot;
  initialQuestions: QuizQuestion[] | null;
  initialMemoryBoard?: MemoryBoardJson | null;
  initialMemoryEndsAt?: string | null;
  initialMemoryRevealMs?: number | null;
  yourAvatar?: string | null;
  yourName?: string | null;
};

type Phase =
  | { kind: "matching" }
  | { kind: "draft"; options: DuelCategoryOption[] }
  | { kind: "quiz"; mode: "attack" | "defend"; questions: QuizQuestion[] }
  | {
      kind: "memory";
      mode: "attack" | "defend";
      board: MemoryBoardJson;
      endsAt: string;
      revealMs: number;
    }
  | { kind: "wait" }
  | { kind: "result" }
  | { kind: "loading" };

function activeRound(duel: DuelSnapshot) {
  if (duel.turn.roundNumber == null) return null;
  return duel.rounds.find((r) => r.roundNumber === duel.turn.roundNumber) ?? null;
}

function derivePhase(
  duel: DuelSnapshot,
  questions: QuizQuestion[] | null,
  memory: {
    board: MemoryBoardJson | null;
    endsAt: string | null;
    revealMs: number;
  },
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

  const round = activeRound(duel);
  const isMemory = round?.roundType === "MEMORY";

  const needsDefend =
    (duel.status === "WAITING_A" && duel.youAre === "challenger") ||
    (duel.status === "WAITING_B" && duel.youAre === "opponent") ||
    duel.status === "A_DEFENDING" ||
    duel.status === "B_DEFENDING";

  if (needsDefend) {
    if (isMemory) {
      if (memory.board && memory.endsAt) {
        return {
          kind: "memory",
          mode: "defend",
          board: memory.board,
          endsAt: memory.endsAt,
          revealMs: memory.revealMs,
        };
      }
      return { kind: "loading" };
    }
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
    if (isMemory) {
      if (memory.board && memory.endsAt) {
        return {
          kind: "memory",
          mode: "attack",
          board: memory.board,
          endsAt: memory.endsAt,
          revealMs: memory.revealMs,
        };
      }
      return { kind: "loading" };
    }
    if (questions && questions.length > 0) {
      return { kind: "quiz", mode: "attack", questions };
    }
    if (
      (duel.draftOptions && duel.draftOptions.length > 0) ||
      duel.memoryAvailable
    ) {
      return { kind: "draft", options: duel.draftOptions ?? [] };
    }
    return { kind: "loading" };
  }

  return { kind: "wait" };
}

export function DuelArena({
  duelId,
  initialDuel,
  initialQuestions,
  initialMemoryBoard = null,
  initialMemoryEndsAt = null,
  initialMemoryRevealMs = 2000,
  yourAvatar,
  yourName,
}: DuelArenaProps) {
  const { t } = useTranslation();
  const [duel, setDuel] = useState(initialDuel);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(
    initialQuestions,
  );
  const [memoryBoard, setMemoryBoard] = useState<MemoryBoardJson | null>(
    initialMemoryBoard,
  );
  const [memoryEndsAt, setMemoryEndsAt] = useState<string | null>(
    initialMemoryEndsAt,
  );
  const [memoryRevealMs, setMemoryRevealMs] = useState(
    initialMemoryRevealMs ?? 2000,
  );
  const [phase, setPhase] = useState<Phase>(() =>
    derivePhase(initialDuel, initialQuestions, {
      board: initialMemoryBoard,
      endsAt: initialMemoryEndsAt,
      revealMs: initialMemoryRevealMs ?? 2000,
    }),
  );
  const [pending, startTransition] = useTransition();
  const beginDefendInFlight = useRef(false);
  const beginMemoryInFlight = useRef(false);
  const matchingStartedAt = useRef<number | null>(
    initialDuel.status === "MATCHING" ? performance.now() : null,
  );
  const [matchFoundHold, setMatchFoundHold] = useState(false);
  const [missionFeedback, setMissionFeedback] =
    useState<EvaluateMissionsResult | null>(null);
  const pendingAfterMatch = useRef<{
    duel: DuelSnapshot;
    questions: QuizQuestion[] | null;
    memoryBoard: MemoryBoardJson | null;
    memoryEndsAt: string | null;
    memoryRevealMs: number;
  } | null>(null);

  const applyDuelState = useCallback(
    (
      next: DuelSnapshot,
      nextQuestions: QuizQuestion[] | null,
      nextMemory?: {
        board?: MemoryBoardJson | null;
        endsAt?: string | null;
        revealMs?: number | null;
      },
    ) => {
      const board = nextMemory?.board ?? memoryBoard;
      const endsAt = nextMemory?.endsAt ?? memoryEndsAt;
      const revealMs = nextMemory?.revealMs ?? memoryRevealMs;
      const nextPhase = derivePhase(next, nextQuestions, {
        board,
        endsAt,
        revealMs,
      });

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
          pendingAfterMatch.current = {
            duel: next,
            questions: nextQuestions,
            memoryBoard: board,
            memoryEndsAt: endsAt,
            memoryRevealMs: revealMs,
          };
          setDuel(next);
          setQuestions(nextQuestions);
          if (nextMemory?.board !== undefined) setMemoryBoard(nextMemory.board);
          if (nextMemory?.endsAt !== undefined)
            setMemoryEndsAt(nextMemory.endsAt);
          if (nextMemory?.revealMs != null)
            setMemoryRevealMs(nextMemory.revealMs);
          setMatchFoundHold(true);
          return;
        }
      }

      setDuel(next);
      setQuestions(nextQuestions);
      if (nextMemory?.board !== undefined) setMemoryBoard(nextMemory.board);
      if (nextMemory?.endsAt !== undefined) setMemoryEndsAt(nextMemory.endsAt);
      if (nextMemory?.revealMs != null) setMemoryRevealMs(nextMemory.revealMs);
      setPhase(nextPhase);
      setMatchFoundHold(false);
      pendingAfterMatch.current = null;
    },
    [phase.kind, memoryBoard, memoryEndsAt, memoryRevealMs],
  );

  const refresh = useCallback(async () => {
    const res = await getDuel(duelId);
    if (!res.ok) {
      toast.error(t("duel.errGeneric"));
      return;
    }
    applyDuelState(res.duel, res.questions, {
      board: res.memoryBoard ?? null,
      endsAt: res.memoryEndsAt ?? null,
      revealMs: res.memoryRevealMs ?? 2000,
    });
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
      setMemoryBoard(held.memoryBoard);
      setMemoryEndsAt(held.memoryEndsAt);
      setMemoryRevealMs(held.memoryRevealMs);
      setPhase(
        derivePhase(held.duel, held.questions, {
          board: held.memoryBoard,
          endsAt: held.memoryEndsAt,
          revealMs: held.memoryRevealMs,
        }),
      );
      setMatchFoundHold(false);
      pendingAfterMatch.current = null;
      playSound("whistle");
    }, remaining + 280);
    return () => window.clearTimeout(id);
  }, [matchFoundHold]);

  // QUIZ defend bootstrap
  useEffect(() => {
    const round = activeRound(duel);
    if (round?.roundType === "MEMORY") return;

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
  }, [duel.status, duel.youAre, duelId, questions, refresh, duel.turn.roundNumber, duel.rounds]);

  // MEMORY bootstrap (attack or defend)
  useEffect(() => {
    const round = activeRound(duel);
    if (round?.roundType !== "MEMORY") return;
    if (memoryBoard && memoryEndsAt) return;
    if (beginMemoryInFlight.current) return;

    const yourAttack =
      (duel.status === "B_ATTACKING" && duel.youAre === "opponent") ||
      (duel.status === "A_ATTACKING" && duel.youAre === "challenger");
    const yourDefend =
      (duel.status === "WAITING_A" && duel.youAre === "challenger") ||
      (duel.status === "WAITING_B" && duel.youAre === "opponent") ||
      ((duel.status === "A_DEFENDING" || duel.status === "B_DEFENDING") &&
        duel.canAct);

    if (!yourAttack && !yourDefend) return;

    beginMemoryInFlight.current = true;
    let cancelled = false;

    startTransition(async () => {
      const res = await beginMemoryTurn(duelId);
      if (cancelled) {
        beginMemoryInFlight.current = false;
        return;
      }
      if (!res.ok) {
        beginMemoryInFlight.current = false;
        void refresh();
        return;
      }
      setDuel(res.duel);
      setMemoryBoard(res.board);
      setMemoryEndsAt(res.endsAt);
      setMemoryRevealMs(res.revealMs);
      setPhase({
        kind: "memory",
        mode: res.mode,
        board: res.board,
        endsAt: res.endsAt,
        revealMs: res.revealMs,
      });
      beginMemoryInFlight.current = false;
      playSound("whistle");
    });

    return () => {
      cancelled = true;
      beginMemoryInFlight.current = false;
    };
  }, [
    duel.status,
    duel.youAre,
    duel.canAct,
    duelId,
    memoryBoard,
    memoryEndsAt,
    refresh,
    duel.turn.roundNumber,
    duel.rounds,
  ]);

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

  function handlePickMemory() {
    startTransition(async () => {
      const res = await selectDuelMemory(duelId);
      if (!res.ok) {
        if (res.error === "memory_already_used") {
          toast.error(t("duel.errMemoryUsed"));
        } else {
          toast.error(t("duel.errGeneric"));
        }
        void refresh();
        return;
      }
      setDuel(res.duel);
      setQuestions(null);
      setMemoryBoard(res.board);
      setMemoryEndsAt(null);
      setPhase({ kind: "loading" });
      playSound("whistle");
      // beginMemoryTurn effect will stamp the clock + open the board.
      void refresh();
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
      setMemoryBoard(null);
      setMemoryEndsAt(null);
      setPhase(derivePhase(res.duel, null, { board: null, endsAt: null, revealMs: memoryRevealMs }));
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
      // Round 2 MEMORY shell may already be on the snapshot.
      const r2 = res.duel.rounds.find((r) => r.roundNumber === 2);
      const board = r2?.board ?? null;
      setMemoryBoard(board);
      setMemoryEndsAt(null);
      setPhase(
        derivePhase(res.duel, null, {
          board,
          endsAt: null,
          revealMs: memoryRevealMs,
        }),
      );
      if (res.duel.status === "COMPLETED") playSound("whistle");
    });
  }

  function handleMemoryDone(attempt: MemoryAttemptSubmission) {
    startTransition(async () => {
      const isAttack = phase.kind === "memory" && phase.mode === "attack";
      const res = isAttack
        ? await submitMemoryAttack(duelId, attempt)
        : await submitMemoryDefend(duelId, attempt);
      if (!res.ok) {
        if (res.error === "turn_expired") {
          toast.error(t("duel.memory.errExpired"));
        } else {
          toast.error(t("duel.errGeneric"));
        }
        void refresh();
        return;
      }
      setDuel(res.duel);
      setQuestions(null);
      setMemoryBoard(null);
      setMemoryEndsAt(null);
      if ("missions" in res && res.missions) setMissionFeedback(res.missions);
      setPhase(
        derivePhase(res.duel, null, {
          board: null,
          endsAt: null,
          revealMs: memoryRevealMs,
        }),
      );
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
        memoryAvailable={duel.memoryAvailable}
        pending={pending}
        onPick={handlePickCategory}
        onPickMemory={handlePickMemory}
      />
    );
  }

  if (phase.kind === "memory") {
    return (
      <MemoryBoard
        mode={phase.mode}
        board={phase.board}
        endsAt={phase.endsAt}
        revealMs={phase.revealMs}
        pending={pending}
        onComplete={handleMemoryDone}
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
