import { callChatGPT } from "../services/openai";
import { GRAMMAR_PROMPT, GRAMMAR_MODE_EXTRA } from "../services/prompts";
import type { GrammarCorrection, CorrectionMode } from "../types";

export async function checkGrammar(
  text: string,
  mode: CorrectionMode = "standard"
): Promise<GrammarCorrection[]> {
  const systemPrompt = GRAMMAR_PROMPT + (GRAMMAR_MODE_EXTRA[mode] || "");
  const result = await callChatGPT([
    { role: "system", content: systemPrompt },
    { role: "user", content: text },
  ]);
  return result.corrections || [];
}
