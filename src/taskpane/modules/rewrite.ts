import { callGemini } from "../services/gemini";
import { REWRITE_PROMPT, REWRITE_PROMPT_NO_PROFILE } from "../services/prompts";
import { loadStyleProfile } from "./style";
import type { RewriteResult } from "../types";

/**
 * Rewrite the given text in the author's style (if profile exists)
 * or in generic academic German with humanization rules.
 */
export async function rewriteText(text: string): Promise<RewriteResult> {
  // Limit input to ~3000 words
  var words = text.split(/\s+/);
  if (words.length > 3000) {
    text = words.slice(0, 3000).join(" ");
  }

  // Check for saved style profile
  var stored = loadStyleProfile();
  var prompt: string;
  if (stored && stored.profile) {
    prompt = REWRITE_PROMPT(JSON.stringify(stored.profile, null, 2));
  } else {
    prompt = REWRITE_PROMPT_NO_PROFILE;
  }

  var messages = [
    { role: "system", content: prompt },
    { role: "user", content: text },
  ];

  var result = await callGemini(messages, 0.7);

  // Validate response structure
  if (!result || !result.rewritten_text) {
    throw new Error("Unerwartetes Antwortformat von Gemini.");
  }

  // Ensure changes array exists
  if (!result.changes || !Array.isArray(result.changes)) {
    result.changes = [];
  }

  return result as RewriteResult;
}
