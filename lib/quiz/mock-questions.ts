import type { QuizQuestion } from "./types";

/**
 * Mock Penalty Mode question bank. Shape mirrors the Prisma `Question` model
 * so swapping to a DB/remote fetch later is a drop-in change.
 */
export const PENALTY_QUESTIONS: QuizQuestion[] = [
  {
    id: "q_penalty_01",
    questionText: "Which country has won the most FIFA World Cups?",
    options: ["Germany", "Brazil", "Italy", "Argentina"],
    correctIndex: 1,
    difficulty: "easy",
    category: "World Cup",
  },
  {
    id: "q_penalty_02",
    questionText: "Who is the all-time top scorer in UEFA Champions League history?",
    options: ["Lionel Messi", "Robert Lewandowski", "Cristiano Ronaldo", "Karim Benzema"],
    correctIndex: 2,
    difficulty: "easy",
    category: "Champions League",
  },
  {
    id: "q_penalty_03",
    questionText: "Which club is nicknamed 'The Red Devils'?",
    options: ["Liverpool", "Arsenal", "Manchester United", "AC Milan"],
    correctIndex: 2,
    difficulty: "medium",
    category: "Clubs",
  },
  {
    id: "q_penalty_04",
    questionText: "In what year did Iran first qualify for the FIFA World Cup?",
    options: ["1978", "1990", "1998", "2006"],
    correctIndex: 0,
    difficulty: "hard",
    category: "History",
  },
  {
    id: "q_penalty_05",
    questionText: "How many players from one team are on the pitch at kickoff?",
    options: ["9", "10", "11", "12"],
    correctIndex: 2,
    difficulty: "easy",
    category: "Rules",
  },
];
