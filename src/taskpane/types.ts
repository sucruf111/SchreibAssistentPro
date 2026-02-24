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
    | "tempus";
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

export interface StyleProfile {
  formality: string;
  voice: string;
  sentence_length: string;
  complexity: string;
  passive_tendency: string;
  preferred_connectors: string[];
  vocabulary_level: string;
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

// ---- Rephrase / Rewrite ----

export interface RephraseVariant {
  text: string;
  style: "formal" | "precise" | "elaborate";
  description: string;
}

export interface RephraseResult {
  variants: RephraseVariant[];
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
