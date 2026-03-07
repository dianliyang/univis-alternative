export type PageType =
  | "unknown"
  | "home"
  | "semester-index"
  | "organization-list"
  | "course-detail"
  | "lecturer-profile"
  | "schedule-list";

export interface CrawlRecord {
  canonicalUrl: string;
  sourceUrl: string;
  fetchedAt: string;
  status: number;
  contentHash: string;
  path: string;
  discoveredLinks: string[];
}

export interface CrawlPolicyDecision {
  allowed: boolean;
  reason?: string;
}

export interface Session {
  day?: string;
  start?: string;
  end?: string;
  room?: string;
  frequency?: string;
  notes?: string;
}

export interface LecturerRef {
  name: string;
  sourceUrl?: string;
}

export type CourseLanguage = "english" | "german" | "bilingual" | "unknown";
export type LanguageConfidence = "high" | "medium" | "low";

export interface CourseLanguageInfo {
  language: CourseLanguage;
  confidence: LanguageConfidence;
  evidence: string[];
}

export interface ParsedCourse {
  sourceUrl: string;
  title: string;
  subtitle?: string;
  semester?: string;
  faculty?: string;
  institute?: string;
  description?: string;
  type?: string;
  languageText?: string;
  lecturers: LecturerRef[];
  sessions: Session[];
}

export interface NormalizedCourse extends ParsedCourse {
  id: string;
  slug: string;
  searchText: string;
  language: CourseLanguage;
  languageConfidence: LanguageConfidence;
  languageEvidence: string[];
  lastSeen: string;
}
