import type { QuizQuestion } from "./types";

/**
 * Mock Penalty Mode question bank. Shape mirrors the Prisma `Question` model
 * so swapping to a DB/remote fetch later is a drop-in change.
 */
export const PENALTY_QUESTIONS: QuizQuestion[] = [
  {
    id: "q_penalty_01",
    correctIndex: 1,
    difficulty: "easy",
    content: {
      en: {
        text: "Which country has won the most FIFA World Cups?",
        options: ["Germany", "Brazil", "Italy", "Argentina"],
        category: "World Cup",
      },
      fa: {
        text: "کدام کشور بیشترین قهرمانی جام جهانی را دارد؟",
        options: ["آلمان", "برزیل", "ایتالیا", "آرژانتین"],
        category: "جام جهانی",
      },
    },
  },
  {
    id: "q_penalty_02",
    correctIndex: 2,
    difficulty: "easy",
    content: {
      en: {
        text: "Who is the all-time top scorer in UEFA Champions League history?",
        options: [
          "Lionel Messi",
          "Robert Lewandowski",
          "Cristiano Ronaldo",
          "Karim Benzema",
        ],
        category: "Champions League",
      },
      fa: {
        text: "برترین گلزن تاریخ لیگ قهرمانان اروپا کیست؟",
        options: [
          "لیونل مسی",
          "روبرت لواندوفسکی",
          "کریستیانو رونالدو",
          "کریم بنزما",
        ],
        category: "لیگ قهرمانان",
      },
    },
  },
  {
    id: "q_penalty_03",
    correctIndex: 2,
    difficulty: "medium",
    content: {
      en: {
        text: "Which club is nicknamed 'The Red Devils'?",
        options: ["Liverpool", "Arsenal", "Manchester United", "AC Milan"],
        category: "Clubs",
      },
      fa: {
        text: "لقب «شیاطین سرخ» برای کدام باشگاه است؟",
        options: ["لیورپول", "آرسنال", "منچستر یونایتد", "آ.ث. میلان"],
        category: "باشگاه‌ها",
      },
    },
  },
  {
    id: "q_penalty_04",
    correctIndex: 0,
    difficulty: "hard",
    content: {
      en: {
        text: "In what year did Iran first qualify for the FIFA World Cup?",
        options: ["1978", "1990", "1998", "2006"],
        category: "History",
      },
      fa: {
        text: "ایران اولین بار در چه سالی به جام جهانی صعود کرد؟",
        options: ["۱۹۷۸", "۱۹۹۰", "۱۹۹۸", "۲۰۰۶"],
        category: "تاریخ",
      },
    },
  },
  {
    id: "q_penalty_05",
    correctIndex: 2,
    difficulty: "easy",
    content: {
      en: {
        text: "How many players from one team are on the pitch at kickoff?",
        options: ["9", "10", "11", "12"],
        category: "Rules",
      },
      fa: {
        text: "در شروع بازی چند بازیکن از یک تیم در زمین هستند؟",
        options: ["۹", "۱۰", "۱۱", "۱۲"],
        category: "قوانین",
      },
    },
  },
];

/**
 * FTUE tutorial shootout — a short, forgiving set of the three easiest
 * questions so first-time players get an early win. Kept as a subset of
 * `PENALTY_QUESTIONS` so server-side `verifyKickLog` validates the same ids.
 */
export const TUTORIAL_QUESTIONS: QuizQuestion[] = PENALTY_QUESTIONS.filter(
  (q) => q.difficulty === "easy",
).slice(0, 3);
