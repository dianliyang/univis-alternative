import type { CourseLanguageInfo } from "../types.js";

const ENGLISH_HINTS = [/english/i, /englisch/i, /\btaught in english\b/i, /\bin english\b/i];
const GERMAN_HINTS = [/german/i, /deutsch/i, /\bauf deutsch\b/i, /\bin german\b/i];

export function detectCourseLanguage(input: { languageText?: string; title?: string; description?: string; sessionsText?: string }): CourseLanguageInfo {
  const sources = [input.languageText, input.title, input.description, input.sessionsText].filter(Boolean) as string[];
  const evidence = new Set<string>();
  let english = false;
  let german = false;

  for (const source of sources) {
    for (const pattern of ENGLISH_HINTS) {
      if (pattern.test(source)) {
        english = true;
        evidence.add(source);
      }
    }
    for (const pattern of GERMAN_HINTS) {
      if (pattern.test(source)) {
        german = true;
        evidence.add(source);
      }
    }
  }

  if (english && german) {
    return { language: "bilingual", confidence: input.languageText ? "high" : "medium", evidence: [...evidence].slice(0, 3) };
  }
  if (english) {
    return { language: "english", confidence: input.languageText ? "high" : "medium", evidence: [...evidence].slice(0, 3) };
  }
  if (german) {
    return { language: "german", confidence: input.languageText ? "high" : "medium", evidence: [...evidence].slice(0, 3) };
  }
  return { language: "unknown", confidence: "low", evidence: [] };
}
