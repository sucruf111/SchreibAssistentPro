/* global Office */

import { callChatGPT } from "../services/openai";
import { STYLE_ANALYSIS_PROMPT } from "../services/prompts";
import type { StyleResult } from "../types";

export async function analyzeStyle(text: string): Promise<StyleResult> {
  return callChatGPT([
    { role: "system", content: STYLE_ANALYSIS_PROMPT },
    { role: "user", content: text },
  ]);
}

// ---- Style Profile Persistence (Office Roaming Settings) ----

export function saveStyleProfile(profile: any) {
  Office.context.roamingSettings.set("style_profile", JSON.stringify(profile));
  Office.context.roamingSettings.saveAsync();
}

export function loadStyleProfile(): any | null {
  const raw = Office.context.roamingSettings.get("style_profile");
  return raw ? JSON.parse(raw) : null;
}
