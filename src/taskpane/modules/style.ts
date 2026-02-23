import { callGemini } from "../services/gemini";
import { STYLE_ANALYSIS_PROMPT } from "../services/prompts";
import type { StyleResult } from "../types";

export async function analyzeStyle(text: string): Promise<StyleResult> {
  return callGemini([
    { role: "system", content: STYLE_ANALYSIS_PROMPT },
    { role: "user", content: text },
  ]);
}

// ---- Style Profile Persistence (localStorage) ----

export function saveStyleProfile(profile: any) {
  localStorage.setItem("style_profile", JSON.stringify(profile));
}

export function loadStyleProfile(): any | null {
  var raw = localStorage.getItem("style_profile");
  return raw ? JSON.parse(raw) : null;
}
