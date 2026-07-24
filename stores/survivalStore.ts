import { create } from "zustand";
import type { KickLog, KickResult, QuizQuestion } from "@/lib/quiz/types";
import { evaluateKick } from "@/lib/quiz/scoring";
import {
  SURVIVAL_DURATION_MS,
  SURVIVAL_LIVES,
  type SurvivalEndReason,
} from "@/lib/game/survival";

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
    const next = Math.max(0, s.timeLeftMs - deltaMs);
    if (next <= 0) {
      // Timeout = miss
      get().answer(null);
      return;
    }
    set({ timeLeftMs: next });
  },

  answer: (selectedIndex) => {
    const s = get();
    if (s.phase !== "playing" || s.queue.length === 0) return;
    const question = s.queue[0]!;
    const evaluation = evaluateKick(question, selectedIndex);
    const entry: KickLog = {
      questionId: question.id,
      selectedIndex,
      correctIndex: evaluation.correctIndex,
      result: evaluation.result,
      msRemaining: Math.round(s.timeLeftMs),
    };

    const seenQuestionIds = s.seenQuestionIds.includes(question.id)
      ? s.seenQuestionIds
      : [...s.seenQuestionIds, question.id];

    if (evaluation.isCorrect) {
      set({
        phase: "reveal",
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
      set({
        phase: "playing",
        queue: [],
        feedback: null,
        timeLeftMs: s.durationMs,
      });
      return { needPrefetch: true, finished: false };
    }

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
    const seen = new Set(s.seenQuestionIds);
    const fresh = questions.filter((q) => !seen.has(q.id));
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
  reset: () => set({ ...initialState }),
}));
