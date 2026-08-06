import { create } from "zustand";
import type { KickLog, KickResult, QuizQuestion } from "@/lib/quiz/types";
import { evaluateKick } from "@/lib/quiz/scoring";
import {
  SURVIVAL_DURATION_MS,
  SURVIVAL_LIVES,
  type SurvivalEndReason,
} from "@/lib/game/survival";
import {
  getSurvivalLiveTimeLeftMs,
  setSurvivalLiveTimeLeftMs,
} from "@/lib/quiz/liveMatchClock";

export type SurvivalPhase = "idle" | "playing" | "reveal" | "finished";

type FeedbackState = {
  selectedIndex: number | null;
  correctIndex: number;
  result: KickResult;
};

type SurvivalState = {
  phase: SurvivalPhase;
  categoryId: string | null;
  /** Remaining questions in the local queue (current is queue[0]). */
  queue: QuizQuestion[];
  seenQuestionIds: string[];
  lives: number;
  score: number;
  timeLeftMs: number;
  durationMs: number;
  log: KickLog[];
  feedback: FeedbackState | null;
  endReason: SurvivalEndReason | null;
  /** True while a background batch fetch is in flight. */
  prefetching: boolean;
  paused: boolean;

  start: (categoryId: string, initialBatch: QuizQuestion[]) => void;
  tick: (deltaMs: number) => void;
  answer: (selectedIndex: number | null) => void;
  /** Advance after reveal; returns whether the client should prefetch. */
  next: () => { needPrefetch: boolean; finished: boolean };
  appendBatch: (questions: QuizQuestion[]) => void;
  /** Victory Cap — no more questions after a correct answer. */
  clearBank: () => void;
  setPrefetching: (v: boolean) => void;
  setPaused: (paused: boolean) => void;
  reset: () => void;
};

const initialState = {
  phase: "idle" as SurvivalPhase,
  categoryId: null as string | null,
  queue: [] as QuizQuestion[],
  seenQuestionIds: [] as string[],
  lives: SURVIVAL_LIVES,
  score: 0,
  timeLeftMs: SURVIVAL_DURATION_MS,
  durationMs: SURVIVAL_DURATION_MS,
  log: [] as KickLog[],
  feedback: null as FeedbackState | null,
  endReason: null as SurvivalEndReason | null,
  prefetching: false,
  paused: false,
};

export const useSurvivalStore = create<SurvivalState>((set, get) => ({
  ...initialState,

  start: (categoryId, initialBatch) => {
    if (initialBatch.length === 0) return;
    setSurvivalLiveTimeLeftMs(SURVIVAL_DURATION_MS);
    set({
      ...initialState,
      phase: "playing",
      categoryId,
      queue: initialBatch,
      seenQuestionIds: [],
      lives: SURVIVAL_LIVES,
      timeLeftMs: SURVIVAL_DURATION_MS,
      durationMs: SURVIVAL_DURATION_MS,
    });
  },

  tick: (deltaMs) => {
    const s = get();
    if (s.phase !== "playing" || s.paused) return;
    // Same background-tab clamp as Penalty — avoid burning the whole fuse on resume.
    const step = Math.min(Math.max(0, deltaMs), 200);
    const next = getSurvivalLiveTimeLeftMs() - step;
    if (next <= 0) {
      setSurvivalLiveTimeLeftMs(0);
      set({ timeLeftMs: 0 });
      // Timeout = miss
      get().answer(null);
      return;
    }
    // Hot path: mutate the live clock only — no Zustand/React re-render.
    setSurvivalLiveTimeLeftMs(next);
  },

  answer: (selectedIndex) => {
    const s = get();
    if (s.phase !== "playing" || s.queue.length === 0) return;
    const question = s.queue[0]!;
    // Guard double-fire (tap + timer timeout in the same tick window).
    if (s.log.some((e) => e.questionId === question.id)) return;
    const evaluation = evaluateKick(question, selectedIndex);
    const msRemaining = Math.max(0, getSurvivalLiveTimeLeftMs());
    const entry: KickLog = {
      questionId: question.id,
      selectedIndex,
      correctIndex: evaluation.correctIndex,
      result: evaluation.result,
      msRemaining: Math.round(msRemaining),
    };

    const seenQuestionIds = s.seenQuestionIds.includes(question.id)
      ? s.seenQuestionIds
      : [...s.seenQuestionIds, question.id];

    if (evaluation.isCorrect) {
      set({
        phase: "reveal",
        timeLeftMs: msRemaining,
        feedback: {
          selectedIndex,
          correctIndex: evaluation.correctIndex,
          result: "goal",
        },
        score: s.score + 1,
        log: [...s.log, entry],
        seenQuestionIds,
      });
      return;
    }

    const lives = Math.max(0, s.lives - 1);
    set({
      phase: "reveal",
      timeLeftMs: msRemaining,
      feedback: {
        selectedIndex,
        correctIndex: evaluation.correctIndex,
        result: "miss",
      },
      lives,
      log: [...s.log, entry],
      seenQuestionIds,
      endReason: lives <= 0 ? "eliminated" : s.endReason,
    });
  },

  next: () => {
    const s = get();
    if (s.phase !== "reveal") {
      return { needPrefetch: false, finished: s.phase === "finished" };
    }

    if (s.endReason === "eliminated") {
      set({ phase: "finished", feedback: null, queue: [] });
      return { needPrefetch: false, finished: true };
    }

    // Drop the answered question from the front of the queue.
    const rest = s.queue.slice(1);

    if (s.endReason === "cleared") {
      set({
        phase: "finished",
        feedback: null,
        queue: [],
      });
      return { needPrefetch: false, finished: true };
    }

    if (rest.length === 0) {
      // Queue empty after a correct answer — client must fetch; if empty → Victory Cap.
      setSurvivalLiveTimeLeftMs(s.durationMs);
      set({
        phase: "playing",
        queue: [],
        feedback: null,
        timeLeftMs: s.durationMs,
      });
      return { needPrefetch: true, finished: false };
    }

    setSurvivalLiveTimeLeftMs(s.durationMs);
    set({
      phase: "playing",
      queue: rest,
      feedback: null,
      timeLeftMs: s.durationMs,
    });
    return {
      needPrefetch: rest.length <= 3,
      finished: false,
    };
  },

  appendBatch: (questions) => {
    const s = get();
    if (questions.length === 0) return;
    // Exclude answered + already-queued ids — prefetch only knew
    // `seenQuestionIds` (answered), so without this the same bank rows
    // re-enter the queue and settleSurvival rejects with duplicate_questions.
    const blocked = new Set<string>([
      ...s.seenQuestionIds,
      ...s.queue.map((q) => q.id),
      ...s.log.map((e) => e.questionId),
    ]);
    const fresh = questions.filter((q) => q?.id && !blocked.has(q.id));
    if (fresh.length === 0) return;
    set({
      queue: [...s.queue, ...fresh],
      prefetching: false,
    });
  },

  clearBank: () => {
    const s = get();
    if (s.phase === "finished") return;
    set({
      endReason: "cleared",
      phase: "finished",
      feedback: null,
      queue: [],
      prefetching: false,
    });
  },

  setPrefetching: (v) => set({ prefetching: v }),
  setPaused: (paused) => set({ paused }),
  reset: () => {
    setSurvivalLiveTimeLeftMs(initialState.timeLeftMs);
    set({ ...initialState });
  },
}));
