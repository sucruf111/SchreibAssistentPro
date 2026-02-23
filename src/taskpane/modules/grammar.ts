import { callGemini } from "../services/gemini";
import { GRAMMAR_PROMPT, GRAMMAR_MODE_EXTRA } from "../services/prompts";
import type { GrammarCorrection, CorrectionMode } from "../types";

export async function checkGrammar(
  text: string,
  mode: CorrectionMode = "standard"
): Promise<GrammarCorrection[]> {
  var systemPrompt = GRAMMAR_PROMPT + (GRAMMAR_MODE_EXTRA[mode] || "");
  var result = await callGemini([
    { role: "system", content: systemPrompt },
    { role: "user", content: text },
  ]);
  return result.corrections || [];
}
