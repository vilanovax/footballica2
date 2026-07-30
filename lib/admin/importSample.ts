/**
 * Canonical import shape + AI extraction prompt for Admin Settings.
 * Keep in sync with `importPayloadSchema` in questionSchema.ts.
 */

export const AI_QUESTION_EXTRACT_PROMPT = `You extract football trivia questions for Footballica (bilingual EN + FA quiz app).

Return ONLY valid JSON (no markdown fences, no commentary) matching this schema:

{
  "version": 1,
  "source": "ai-extract",
  "questions": [
    {
      "type": "TEXT",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "correctIndex": 0 | 1 | 2 | 3,
      "content": {
        "en": {
          "text": "Question in English?",
          "options": ["A", "B", "C", "D"]
        },
        "fa": {
          "text": "سوال به فارسی؟",
          "options": ["الف", "ب", "ج", "د"]
        }
      },
      "explanation": {
        "en": "Short fact after reveal (optional but preferred)",
        "fa": "واقعیت کوتاه بعد از جواب (اختیاری ولی بهتر است)"
      },
      "tags": ["lowercase-slug", "optional"],
      "status": "PUBLISHED",
      "source": "ai"
    }
  ]
}

Hard rules:
1. Exactly 4 options in EN and FA. Same meaning order in both locales.
2. correctIndex is 0-based (0 = first option). The correct option must be identical in meaning across EN/FA at that index.
3. Prefer type "TEXT". Do not invent image URLs.
4. Keep questions factual, mobile-friendly, one clear answer.
5. FA must be natural Persian (not word-by-word machine tone).
6. difficulty: EASY = casual fan, MEDIUM = regular, HARD = deep lore.
7. 8–20 questions per batch unless asked otherwise.
8. tags: short English lowercase slugs (worldcup, ucl, iran, premier-league).
9. No spoilers in the question text itself beyond what is needed to ask.

Optional fields (omit if unused):
- type IMAGE | REVEAL_IMAGE → require "mediaUrl": "https://…"
- type CAREER_PATH → content.en/fa.careerPath.steps: [{ "name": "Club" }, …] (≥2)
- type HIGHER_LOWER → content.en/fa.higherLower: { left:{name}, right:{name}, metricLabel }
`;

/** Drop-in sample for copy/download (valid import payload). */
export const SAMPLE_IMPORT_JSON = {
  version: 1 as const,
  source: "sample",
  questions: [
    {
      type: "TEXT" as const,
      difficulty: "MEDIUM" as const,
      correctIndex: 0,
      content: {
        en: {
          text: "Which club won the UEFA Champions League in 2024?",
          options: [
            "Real Madrid",
            "Borussia Dortmund",
            "Bayern Munich",
            "Manchester City",
          ],
        },
        fa: {
          text: "کدام باشگاه قهرمان لیگ قهرمانان اروپا ۲۰۲۴ شد؟",
          options: [
            "رئال مادرید",
            "بروسیا دورتموند",
            "بایرن مونیخ",
            "منچستر سیتی",
          ],
        },
      },
      explanation: {
        en: "Real Madrid beat Dortmund 2–0 in the Wembley final.",
        fa: "رئال مادرید دورتموند را ۲–۰ در فینال ومبلی شکست داد.",
      },
      tags: ["ucl", "2024"],
      status: "PUBLISHED" as const,
      source: "sample",
    },
    {
      type: "TEXT" as const,
      difficulty: "EASY" as const,
      correctIndex: 2,
      content: {
        en: {
          text: "Which country won the 2018 FIFA World Cup?",
          options: ["Croatia", "Brazil", "France", "Belgium"],
        },
        fa: {
          text: "کدام کشور قهرمان جام جهانی ۲۰۱۸ شد؟",
          options: ["کرواسی", "برزیل", "فرانسه", "بلژیک"],
        },
      },
      explanation: {
        en: "France beat Croatia 4–2 in Moscow.",
        fa: "فرانسه کرواسی را ۴–۲ در مسکو شکست داد.",
      },
      tags: ["worldcup", "2018"],
      status: "PUBLISHED" as const,
      source: "sample",
    },
    {
      type: "TEXT" as const,
      difficulty: "HARD" as const,
      correctIndex: 1,
      content: {
        en: {
          text: "Who scored the winning goal for Iran vs Wales at Qatar 2022?",
          options: ["Sardar Azmoun", "Rouzbeh Cheshmi", "Mehdi Taremi", "Alireza Jahanbakhsh"],
        },
        fa: {
          text: "گل پیروزی ایران برابر ولز در جام جهانی ۲۰۲۲ را چه کسی زد؟",
          options: ["سردار آزمون", "روزبه چشمی", "مهدی طارمی", "علیرضا جهانبخش"],
        },
      },
      explanation: {
        en: "Cheshmi equalized late; Taremi sealed it — ask focuses the equalizer often misremembered.",
        fa: "چشمی گل تساوی را زد؛ طارمی کار را تمام کرد — این سوال روی گل تساوی تمرکز دارد.",
      },
      tags: ["iran", "worldcup", "2022"],
      status: "PUBLISHED" as const,
      source: "sample",
    },
  ],
};

export function sampleImportJsonString(): string {
  return JSON.stringify(SAMPLE_IMPORT_JSON, null, 2);
}
