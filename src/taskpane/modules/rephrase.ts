import { callGemini } from "../services/gemini";
import { REPHRASE_PROMPT } from "../services/prompts";
import type { RephraseResult } from "../types";

/**
 * Rephrase the given text in academic German style.
 * Returns 3 variants: formal, precise, elaborate.
 */
export async function rephraseText(text: string): Promise<RephraseResult> {
  // Limit input to ~3000 words for reasonable processing
  var words = text.split(/\s+/);
  if (words.length > 3000) {
    text = words.slice(0, 3000).join(" ");
  }

  var messages = [
    { role: "system", content: REPHRASE_PROMPT },
    { role: "user", content: text },
  ];

  var result = await callGemini(messages, 0.7);

  // Validate response structure
  if (!result || !result.variants || !Array.isArray(result.variants)) {
    throw new Error("Unerwartetes Antwortformat von Gemini.");
  }

  return result as RephraseResult;
}
