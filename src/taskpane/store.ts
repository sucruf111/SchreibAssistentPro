import { create } from "zustand";
import type { CorrectionMode } from "./types";

export interface ChapterInfo {
  title: string;
  wordCount: number;
  startIndex: number;
  endIndex: number;
}

export interface DocInfo {
  totalWords: number;
  selectedWords: number;
  hasSelection: boolean;
  chapters: ChapterInfo[];
}

interface AppState {
  // Settings
  mode: CorrectionMode;
  setMode: (m: CorrectionMode) => void;

  discipline: string;
  setDiscipline: (d: string) => void;

  citationStyle: string;
  setCitationStyle: (s: string) => void;

  // Correction toggle
  correctionsEnabled: boolean;
  setCorrectionsEnabled: (enabled: boolean) => void;

  // UI state
  loading: boolean;
  setLoading: (l: boolean) => void;

  // Large doc progress
  progress: { done: number; total: number; chapterName: string } | null;
  setProgress: (p: { done: number; total: number; chapterName: string } | null) => void;

  // Document info
  docInfo: DocInfo | null;
  setDocInfo: (info: DocInfo | null) => void;

  // Analysis scope
  analysisScope: "selection" | "full" | "chapters";
  setAnalysisScope: (scope: "selection" | "full" | "chapters") => void;

  // Selected chapters for chapter-based analysis
  selectedChapters: number[];
  setSelectedChapters: (indices: number[]) => void;

  // Auto-check flag (set when opened via context menu)
  autoCheck: boolean;
  setAutoCheck: (auto: boolean) => void;
}

export var useStore = create<AppState>(function (set) {
  return {
    mode: "standard",
    setMode: function (mode) { set({ mode: mode }); },

    discipline: "allgemein",
    setDiscipline: function (discipline) { set({ discipline: discipline }); },

    citationStyle: "APA",
    setCitationStyle: function (citationStyle) { set({ citationStyle: citationStyle }); },

    correctionsEnabled: true,
    setCorrectionsEnabled: function (correctionsEnabled) { set({ correctionsEnabled: correctionsEnabled }); },

    loading: false,
    setLoading: function (loading) { set({ loading: loading }); },

    progress: null,
    setProgress: function (progress) { set({ progress: progress }); },

    docInfo: null,
    setDocInfo: function (docInfo) { set({ docInfo: docInfo }); },

    analysisScope: "full",
    setAnalysisScope: function (analysisScope) { set({ analysisScope: analysisScope }); },

    selectedChapters: [],
    setSelectedChapters: function (selectedChapters) { set({ selectedChapters: selectedChapters }); },

    autoCheck: false,
    setAutoCheck: function (autoCheck) { set({ autoCheck: autoCheck }); },
  };
});
