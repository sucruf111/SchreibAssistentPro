import { callGemini } from "../services/gemini";
import { STYLE_ANALYSIS_PROMPT } from "../services/prompts";
import type { StyleResult } from "../types";

export async function analyzeStyle(text: string): Promise<StyleResult> {
  return callGemini([
    { role: "system", content: STYLE_ANALYSIS_PROMPT },
    { role: "user", content: text },
  ]);
}

// ---- Style Profile Persistence (localStorage with timestamp) ----

export function saveStyleProfile(profile: any) {
  localStorage.setItem("style_profile", JSON.stringify(profile));
  localStorage.setItem("style_profile_date", new Date().toISOString());
}

export function loadStyleProfile(): { profile: any; date: string } | null {
  var raw = localStorage.getItem("style_profile");
  var date = localStorage.getItem("style_profile_date");
  if (!raw) return null;
  try {
    return { profile: JSON.parse(raw), date: date || "" };
  } catch (_e) {
    return null;
  }
}

export function clearStyleProfile() {
  localStorage.removeItem("style_profile");
  localStorage.removeItem("style_profile_date");
}
