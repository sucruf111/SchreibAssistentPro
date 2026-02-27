// ---- Grammar & Spelling ----

export interface GrammarCorrection {
  original: string;
  suggestion: string;
  type:
    | "kasus"
    | "genus"
    | "komma"
    | "rechtschreibung"
    | "konjunktiv"
    | "dass_das"
    | "zusammenschreibung"
    | "tempus"
    | "wissenschaftlich"
    | "stilbruch";
  explanation: string;
  severity: "error" | "warning" | "info";
}

// ---- Scientific Proofreading ----

export interface ProofreadScore {
  score: number;
  issues: string[];
}

export interface ProofreadResult {
  scores: {
    structure: ProofreadScore;
    argumentation: ProofreadScore;
    precision: ProofreadScore;
    conventions: ProofreadScore;
    formal: ProofreadScore;
  };
  overall_score: number;
  summary: string;
}

// ---- Legitimacy & Source Checking ----

export interface CitationIssue {
  type: "format" | "consistency" | "plausibility" | "missing";
  description: string;
  suggestion: string;
}

export interface CitationResult {
  text: string;
  status: "ok" | "warning" | "error";
  issues: CitationIssue[];
}

export interface LegitimacyResult {
  citations: CitationResult[];
  overall: {
    style_detected: string;
    consistency_score: number;
  };
}

// ---- Style Analysis ----

export interface PunctuationHabits {
  semicolons: "selten" | "gelegentlich" | "haeufig";
  dashes: "selten" | "gelegentlich" | "haeufig";
  parentheses: "selten" | "gelegentlich" | "haeufig";
  colons: "selten" | "gelegentlich" | "haeufig";
}

export interface StyleProfile {
  formality: string;
  voice: string;
  sentence_length: string;
  complexity: string;
  passive_tendency: string;
  preferred_connectors: string[];
  vocabulary_level: string;
  // Enhanced fields (optional for backward compatibility)
  characteristic_words?: string[];
  characteristic_phrases?: string[];
  typical_sentence_starters?: string[];
  paragraph_transitions?: string[];
  punctuation_habits?: PunctuationHabits;
  avg_sentence_word_count?: number;
  sentence_length_variation?: string;
  passive_ratio_percent?: number;
}

export interface StyleDeviation {
  location: string;
  issue: string;
  suggestion: string;
}

export interface StyleResult {
  style_profile: StyleProfile;
  consistency: {
    score: number;
    deviations: StyleDeviation[];
  };
}

// ---- Suggestions ----

export interface Suggestion {
  text: string;
  type: "completion" | "expansion" | "transition" | "summary" | "counterargument";
  description: string;
}

export interface SuggestionsResult {
  suggestions: Suggestion[];
}

// ---- Rewrite ----

export interface RewriteChange {
  original: string;
  replacement: string;
  reason: string;
}

export interface RewriteResult {
  rewritten_text: string;
  changes_summary: string;
  changes: RewriteChange[];
  style_note?: string;
}

// ---- Document Chunks ----

export interface DocParagraph {
  index: number;
  text: string;
  headingLevel: number;
  wordCount: number;
}

// ---- Correction Mode ----

export type CorrectionMode = "soft" | "standard" | "strict";
