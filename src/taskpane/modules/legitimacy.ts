import { callGemini } from "../services/gemini";
import { LEGITIMACY_PROMPT } from "../services/prompts";
import type { LegitimacyResult } from "../types";

export async function checkLegitimacy(
  text: string,
  citationStyle: string
): Promise<LegitimacyResult> {
  var style = citationStyle || "APA";
  return callGemini([
    { role: "system", content: LEGITIMACY_PROMPT(style) },
    { role: "user", content: text },
  ]);
}
