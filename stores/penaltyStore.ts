import { create } from "zustand";
import type { KickLog, KickResult, QuizQuestion } from "@/lib/quiz/types";
import { KICK_DURATION_MS, evaluateKick } from "@/lib/quiz/scoring";
import { computeMatchRewards, type RewardBreakdown } from "@/lib/game/economy";
import type { GameConfig } from "@/lib/game/economy";
import type { HelperKey } from "@/lib/game/helpers";
import {
  getPenaltyLiveTimeLeftMs,
  setPenaltyLiveTimeLeftMs,
} from "@/lib/quiz/liveMatchClock";

export type MatchPhase = "idle" | "playing" | "reveal" | "finished";

type FeedbackState = {
  selectedIndex: number | null;
  correctIndex: number;
  result: KickResult;
};

/** Live-config subset needed to price + apply in-match helpers. */
type HelperConfig = GameConfig["helpers"];

/** Options accepted when seeding a match. */
type StartOptions = {
  /** Time per question (Penalty 10s vs Quick 7s). */
  durationMs?: number;
  /** Spare questions available to the "Substitution" helper. */
  bench?: QuizQuestion[];
  /** Coin balance at kickoff — the affordability ceiling for helpers. */
  startingCoins?: number;
  /** Live helper costs (null disables the whole dock, e.g. tutorial). */
  helpers?: HelperConfig | null;
};

type PenaltyState = {
  phase: MatchPhase;
  questions: QuizQuestion[];
  currentIndex: number;
  timeLeftMs: number;
  /** Time allotted per question this match (Penalty 10s vs Quick 7s). */
  durationMs: number;
  goals: number;
  log: KickLog[];
  feedback: FeedbackState | null;
  rewards: RewardBreakdown | null;
  /** Freezes the fuse (e.g. while a "leave match?" dialog is open). */
  paused: boolean;

  // ── In-match helpers (coin-spend facilitators) ──
  /** Helper pricing for this match (null = helpers disabled). */
  helpers: HelperConfig | null;
  /** Coin balance at kickoff (helpers can't exceed startingCoins − coinsSpent). */
  startingCoins: number;
  /** Running coin total spent on helpers this match (settled server-side). */
  coinsSpent: number;
  /** Spare questions the Substitution helper can swap in. */
  bench: QuizQuestion[];
  /** Wrong option indices eliminated on the CURRENT question. */
  eliminated: number[];
  /** Helpers already used on the current question (once-per-type gate). */
  helpersThisQuestion: HelperKey[];
  /** Every helper used this match, in order (settlement + usedHelp flag). */
  helpersLog: HelperKey[];

  // actions
  start: (questions: QuizQuestion[], options?: StartOptions) => void;
  tick: (deltaMs: number) => void;
  answer: (selectedIndex: number | null) => void;
  next: () => void;
  setPaused: (paused: boolean) => void;
  useHelper: (key: HelperKey) => void;
  reset: () => void;
};

const initialState = {
  phase: "idle" as MatchPhase,
  questions: [] as QuizQuestion[],
  currentIndex: 0,
  timeLeftMs: KICK_DURATION_MS,
  durationMs: KICK_DURATION_MS,
  goals: 0,
  log: [] as KickLog[],
  feedback: null as FeedbackState | null,
  rewards: null as RewardBreakdown | null,
  paused: false,
  helpers: null as HelperConfig | null,
  startingCoins: 0,
  coinsSpent: 0,
  bench: [] as QuizQuestion[],
  eliminated: [] as number[],
  helpersThisQuestion: [] as HelperKey[],
  helpersLog: [] as HelperKey[],
};

/** Pick `count` wrong option indices to eliminate, skipping already-removed ones. */
function pickWrongToEliminate(
  correctIndex: number,
  optionCount: number,
  already: number[],
  count: number,
): number[] {
  const candidates: number[] = [];
  for (let i = 0; i < optionCount; i++) {
    if (i !== correctIndex && !already.includes(i)) candidates.push(i);
  }
  // Shuffle so the removed options vary between uses.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, Math.max(0, count));
}

export const usePenaltyStore = create<PenaltyState>((set, get) => ({
  ...initialState,

  start: (questions, options = {}) => {
    const duration = options.durationMs ?? KICK_DURATION_MS;
    setPenaltyLiveTimeLeftMs(duration);
    set({
      ...initialState,
      questions,
      phase: "playing",
      durationMs: duration,
      timeLeftMs: duration,
      bench: options.bench ?? [],
      startingCoins: options.startingCoins ?? 0,
      helpers: options.helpers ?? null,
    });
  },

  tick: (deltaMs) => {
    const { phase, paused } = get();
    if (phase !== "playing" || paused) return;

    // Clamp the frame delta. When the tab is backgrounded (phone locked, app
    // switched) rAF pauses, so the first frame on resume reports a multi-second
    // gap — without this clamp the whole fuse burns at once and the kick is an
    // instant, unfair miss. Capping the step effectively freezes the timer while
    // hidden and resumes it smoothly.
    const step = Math.min(Math.max(0, deltaMs), 200);
    const next = getPenaltyLiveTimeLeftMs() - step;
    if (next <= 0) {
      setPenaltyLiveTimeLeftMs(0);
      set({ timeLeftMs: 0 });
      get().answer(null); // fuse burned out → forced miss
      return;
    }
    // Hot path: mutate the live clock only — no Zustand/React re-render.
    setPenaltyLiveTimeLeftMs(next);
  },

  answer: (selectedIndex) => {
    const { phase, questions, currentIndex, goals, log } = get();
    if (phase !== "playing") return;

    const question = questions[currentIndex];
    const evaluation = evaluateKick(question, selectedIndex);
    const msRemaining = Math.max(0, getPenaltyLiveTimeLeftMs());

    const entry: KickLog = {
      questionId: question.id,
      selectedIndex,
      correctIndex: evaluation.correctIndex,
      result: evaluation.result,
      msRemaining,
    };

    set({
      phase: "reveal",
      timeLeftMs: msRemaining,
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
    const { currentIndex, questions, log, durationMs } = get();
    const isLast = currentIndex >= questions.length - 1;

    if (isLast) {
      set({
        phase: "finished",
        feedback: null,
        rewards: computeMatchRewards(log),
      });
      return;
    }

    setPenaltyLiveTimeLeftMs(durationMs);
    set({
      phase: "playing",
      currentIndex: currentIndex + 1,
      timeLeftMs: durationMs,
      feedback: null,
      // Fresh question → helper availability resets.
      eliminated: [],
      helpersThisQuestion: [],
    });
  },

  setPaused: (paused) => set({ paused }),

  useHelper: (key) => {
    const s = get();
    if (s.phase !== "playing" || !s.helpers) return;
    if (s.helpersThisQuestion.includes(key)) return;

    const cost = s.helpers[key];
    if (s.startingCoins - s.coinsSpent < cost) return; // unaffordable

    const question = s.questions[s.currentIndex];
    if (!question) return;

    // Substitution: swap the current question for a bench one. The old question
    // is discarded (never logged), and the fresh slot re-opens hint/50-50/time.
    if (key === "reroll") {
      if (s.bench.length === 0) return;
      const [fresh, ...restBench] = s.bench;
      setPenaltyLiveTimeLeftMs(s.durationMs);
      set({
        questions: s.questions.map((q, i) =>
          i === s.currentIndex ? fresh : q,
        ),
        bench: restBench,
        timeLeftMs: s.durationMs,
        eliminated: [],
        // Keep only reroll so the same slot can't be re-rolled twice.
        helpersThisQuestion: ["reroll"],
        coinsSpent: s.coinsSpent + cost,
        helpersLog: [...s.helpersLog, key],
      });
      return;
    }

    if (key === "extraTime") {
      const boosted = Math.min(
        s.durationMs,
        getPenaltyLiveTimeLeftMs() + s.helpers.extraTimeMs,
      );
      setPenaltyLiveTimeLeftMs(boosted);
      set({
        timeLeftMs: boosted,
        helpersThisQuestion: [...s.helpersThisQuestion, key],
        coinsSpent: s.coinsSpent + cost,
        helpersLog: [...s.helpersLog, key],
      });
      return;
    }

    // hint (removes 1) / fifty (removes 2) → eliminate wrong options.
    const removes = key === "fifty" ? 2 : 1;
    const optionCount = question.content.en.options.length;
    const add = pickWrongToEliminate(
      question.correctIndex,
      optionCount,
      s.eliminated,
      removes,
    );
    set({
      eliminated: [...s.eliminated, ...add],
      helpersThisQuestion: [...s.helpersThisQuestion, key],
      coinsSpent: s.coinsSpent + cost,
      helpersLog: [...s.helpersLog, key],
    });
  },

  reset: () => {
    setPenaltyLiveTimeLeftMs(initialState.timeLeftMs);
    set({ ...initialState });
  },
}));
