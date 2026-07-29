/**
 * Dev-only mock questions for polishing IMAGE / CAREER_PATH / etc.
 * Injected via NEXT_PUBLIC_FORCE_FORMAT or the ff_format cookie — never on deployed hosts.
 */

import type { QuizQuestion, QuizQuestionType } from "@/lib/quiz/types";

export type ForceFormat =
  | "IMAGE"
  | "CAREER_PATH"
  | "HIGHER_LOWER"
  | "REVEAL_IMAGE"
  | "ALL";

const FORCE_VALUES = new Set<string>([
  "IMAGE",
  "CAREER_PATH",
  "HIGHER_LOWER",
  "REVEAL_IMAGE",
  "ALL",
]);

export function parseForceFormat(raw: string | null | undefined): ForceFormat | null {
  const v = raw?.trim().toUpperCase();
  if (!v || !FORCE_VALUES.has(v)) return null;
  return v as ForceFormat;
}

/** Public Wikimedia / CDN assets — fine for local UI polish only. */
const MOCK_MEDIA = {
  realMadridCrest:
    "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg",
  manUtdCrest:
    "https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg",
  sportingCrest:
    "https://upload.wikimedia.org/wikipedia/en/e/e1/Sporting_Clube_de_Portugal_%28Logo%29.svg",
  juventusCrest:
    "https://upload.wikimedia.org/wikipedia/commons/1/15/Juventus_FC_2017_logo.svg",
  campNou:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Camp_Nou_panoramique.jpg/640px-Camp_Nou_panoramique.jpg",
};

function baseQuestion(
  partial: Omit<QuizQuestion, "difficulty" | "correctIndex"> & {
    correctIndex?: number;
    difficulty?: QuizQuestion["difficulty"];
  },
): QuizQuestion {
  return {
    difficulty: "medium",
    correctIndex: 0,
    ...partial,
  };
}

export const MOCK_IMAGE_QUESTION: QuizQuestion = baseQuestion({
  id: "dev-mock-image-crest",
  type: "IMAGE",
  mediaUrl: MOCK_MEDIA.realMadridCrest,
  content: {
    en: {
      text: "Which club does this crest belong to?",
      options: ["Real Madrid", "Barcelona", "Atlético Madrid", "Sevilla"],
      category: "Logos",
    },
    fa: {
      text: "این لوگو متعلق به کدام باشگاه است؟",
      options: ["رئال مادرید", "بارسلونا", "اتلتیکو مادرید", "سویا"],
      category: "لوگو",
    },
  },
});

export const MOCK_CAREER_PATH_QUESTION: QuizQuestion = baseQuestion({
  id: "dev-mock-career-ronaldo",
  type: "CAREER_PATH",
  content: {
    en: {
      text: "Who played for these clubs in this order?",
      options: [
        "Cristiano Ronaldo",
        "Luis Figo",
        "Ricardo Quaresma",
        "Nani",
      ],
      category: "Career",
      careerPath: {
        steps: [
          { name: "Sporting", logoUrl: MOCK_MEDIA.sportingCrest },
          { name: "Man United", logoUrl: MOCK_MEDIA.manUtdCrest },
          { name: "Real Madrid", logoUrl: MOCK_MEDIA.realMadridCrest },
          { name: "Juventus", logoUrl: MOCK_MEDIA.juventusCrest },
        ],
      },
    },
    fa: {
      text: "چه کسی به ترتیب در این باشگاه‌ها بازی کرد؟",
      options: [
        "کریستیانو رونالدو",
        "لوئیس فیگو",
        "ریکاردو کوارزما",
        "نانی",
      ],
      category: "مسیر شغلی",
      careerPath: {
        steps: [
          { name: "اسپورتینگ", logoUrl: MOCK_MEDIA.sportingCrest },
          { name: "من‌یونایتد", logoUrl: MOCK_MEDIA.manUtdCrest },
          { name: "رئال مادرید", logoUrl: MOCK_MEDIA.realMadridCrest },
          { name: "یوونتوس", logoUrl: MOCK_MEDIA.juventusCrest },
        ],
      },
    },
  },
});

/** Career path without logos — polish the chip / initials fallback. */
export const MOCK_CAREER_PATH_CHIPS: QuizQuestion = baseQuestion({
  id: "dev-mock-career-chips",
  type: "CAREER_PATH",
  content: {
    en: {
      text: "Identify the player from this career path.",
      options: ["Zlatan Ibrahimović", "Kaká", "Shevchenko", "Adriano"],
      category: "Career",
      careerPath: {
        steps: [
          { name: "Malmö" },
          { name: "Ajax" },
          { name: "Juventus" },
          { name: "Inter" },
          { name: "Barcelona" },
        ],
      },
    },
    fa: {
      text: "بازیکن این مسیر شغلی کیست؟",
      options: ["زلاتان ابراهیموویچ", "کاکا", "شوچنکو", "آدریانو"],
      category: "مسیر شغلی",
      careerPath: {
        steps: [
          { name: "مالمو" },
          { name: "آژاکس" },
          { name: "یوونتوس" },
          { name: "اینتر" },
          { name: "بارسلونا" },
        ],
      },
    },
  },
});

export const MOCK_REVEAL_QUESTION: QuizQuestion = baseQuestion({
  id: "dev-mock-reveal-stadium",
  type: "REVEAL_IMAGE",
  mediaUrl: MOCK_MEDIA.campNou,
  content: {
    en: {
      text: "Which stadium is coming into focus?",
      options: ["Camp Nou", "Santiago Bernabéu", "San Siro", "Allianz Arena"],
      category: "Stadiums",
    },
    fa: {
      text: "کدام استادیوم در حال واضح شدن است؟",
      options: ["کمپ نو", "برنابئو", "سن سیرو", "آلیانز آرنا"],
      category: "استادیوم",
    },
  },
});

export const MOCK_HIGHER_LOWER_QUESTION: QuizQuestion = baseQuestion({
  id: "dev-mock-higher-lower",
  type: "HIGHER_LOWER",
  content: {
    en: {
      text: "Who scored more career club goals?",
      options: ["Left is higher", "Right is higher", "Equal", "Not enough info"],
      category: "Compare",
      higherLower: {
        metricLabel: "Career club goals",
        left: { name: "Messi" },
        right: { name: "Ronaldo" },
      },
    },
    fa: {
      text: "کدام بازیکن گل باشگاهی بیشتری زده؟",
      options: ["سمت چپ بیشتر", "سمت راست بیشتر", "برابر", "اطلاعات کافی نیست"],
      category: "مقایسه",
      higherLower: {
        metricLabel: "گل باشگاهی دوران حرفه",
        left: { name: "مسی" },
        right: { name: "رونالدو" },
      },
    },
  },
});

function mocksFor(force: ForceFormat): QuizQuestion[] {
  switch (force) {
    case "IMAGE":
      return [MOCK_IMAGE_QUESTION];
    case "CAREER_PATH":
      return [MOCK_CAREER_PATH_QUESTION, MOCK_CAREER_PATH_CHIPS];
    case "REVEAL_IMAGE":
      return [MOCK_REVEAL_QUESTION];
    case "HIGHER_LOWER":
      return [MOCK_HIGHER_LOWER_QUESTION];
    case "ALL":
      return [
        MOCK_IMAGE_QUESTION,
        MOCK_CAREER_PATH_QUESTION,
        MOCK_CAREER_PATH_CHIPS,
        MOCK_REVEAL_QUESTION,
        MOCK_HIGHER_LOWER_QUESTION,
      ];
  }
}

/**
 * Prepend mock format questions into a drawn hand (dev polish).
 * Keeps total length; drops trailing bank questions as needed.
 */
export function injectFormatMocks(
  drawn: QuizQuestion[],
  force: ForceFormat | null,
): QuizQuestion[] {
  if (!force) return drawn;
  const mocks = mocksFor(force);
  if (mocks.length === 0) return drawn;
  if (drawn.length === 0) return mocks;
  const keep = Math.max(0, drawn.length - mocks.length);
  return [...mocks, ...drawn.slice(0, keep)].slice(0, drawn.length);
}

export function formatLabel(force: ForceFormat): string {
  return force;
}
