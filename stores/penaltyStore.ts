import { create } from "zustand";
import type { KickLog, KickResult, QuizQuestion } from "@/lib/quiz/types";
import { KICK_DURATION_MS, evaluateKick } from "@/lib/quiz/scoring";
import { computeMatchRewards, type RewardBreakdown } from "@/lib/game/economy";

export type MatchPhase = "idle" | "playing" | "reveal" | "finished";

type FeedbackState = {
  selectedIndex: number | null;
  correctIndex: number;
  result: KickResult;
};

type PenaltyState = {
  phase: MatchPhase;
  questions: QuizQuestion[];
  currentIndex: number;
  timeLeftMs: number;
  goals: number;
  log: KickLog[];
  feedback: FeedbackState | null;
  rewards: RewardBreakdown | null;

  // actions
  start: (questions: QuizQuestion[]) => void;
  tick: (deltaMs: number) => void;
  answer: (selectedIndex: number | null) => void;
  next: () => void;
  reset: () => void;
};

const initialState = {
  phase: "idle" as MatchPhase,
  questions: [] as QuizQuestion[],
  currentIndex: 0,
  timeLeftMs: KICK_DURATION_MS,
  goals: 0,
  log: [] as KickLog[],
  feedback: null as FeedbackState | null,
  rewards: null as RewardBreakdown | null,
};

export const usePenaltyStore = create<PenaltyState>((set, get) => ({
  ...initialState,

  start: (questions) =>
    set({
      ...initialState,
      questions,
      phase: "playing",
      timeLeftMs: KICK_DURATION_MS,
    }),

  tick: (deltaMs) => {
    const { phase, timeLeftMs } = get();
    if (phase !== "playing") return;

    const next = timeLeftMs - deltaMs;
    if (next <= 0) {
      set({ timeLeftMs: 0 });
      get().answer(null); // fuse burned out → forced miss
      return;
    }
    set({ timeLeftMs: next });
  },

  answer: (selectedIndex) => {
    const { phase, questions, currentIndex, timeLeftMs, goals, log } = get();
    if (phase !== "playing") return;

    const question = questions[currentIndex];
    const evaluation = evaluateKick(question, selectedIndex);
    const msRemaining = Math.max(0, timeLeftMs);

    const entry: KickLog = {
      questionId: question.id,
      selectedIndex,
      correctIndex: evaluation.correctIndex,
      result: evaluation.result,
      msRemaining,
    };

    set({
      phase: "reveal",
      goals: goals + (evaluation.isCorrect ? 1 : 0),
      log: [...log, entry],
      feedback: {
        selectedIndex,
        correctIndex: evaluation.correctIndex,
        result: evaluation.result,
      },
    });
  },

  next: () => {
    const { currentIndex, questions, log } = get();
    const isLast = currentIndex >= questions.length - 1;

    if (isLast) {
      set({
        phase: "finished",
        feedback: null,
        rewards: computeMatchRewards(log),
      });
      return;
    }

    set({
      phase: "playing",
      currentIndex: currentIndex + 1,
      timeLeftMs: KICK_DURATION_MS,
      feedback: null,
    });
  },

  reset: () => set({ ...initialState }),
}));
