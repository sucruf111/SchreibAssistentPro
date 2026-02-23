import { create } from "zustand";
import type { CorrectionMode } from "./types";

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
  progress: { done: number; total: number } | null;
  setProgress: (p: { done: number; total: number } | null) => void;
}

export const useStore = create<AppState>((set) => ({
  mode: "standard",
  setMode: (mode) => set({ mode }),

  discipline: "allgemein",
  setDiscipline: (discipline) => set({ discipline }),

  citationStyle: "APA",
  setCitationStyle: (citationStyle) => set({ citationStyle }),

  correctionsEnabled: true,
  setCorrectionsEnabled: (correctionsEnabled) => set({ correctionsEnabled }),

  loading: false,
  setLoading: (loading) => set({ loading }),

  progress: null,
  setProgress: (progress) => set({ progress }),
}));
