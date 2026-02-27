import { callGemini } from "../services/gemini";
import { GRAMMAR_PROMPT, GRAMMAR_MODE_EXTRA, buildStrictExtra } from "../services/prompts";
import { loadStyleProfile } from "./style";
import type { GrammarCorrection, CorrectionMode } from "../types";

export async function checkGrammar(
  text: string,
  mode: CorrectionMode = "standard"
): Promise<GrammarCorrection[]> {
  var extra = "";
  if (mode === "strict") {
    // In strict mode, load style profile for additional checks
    var stored = loadStyleProfile();
    var profileJson: string | undefined;
    if (stored && stored.profile) {
      profileJson = JSON.stringify(stored.profile, null, 2);
    }
    extra = buildStrictExtra(profileJson);
  } else {
    extra = GRAMMAR_MODE_EXTRA[mode] || "";
  }

  var systemPrompt = GRAMMAR_PROMPT + extra;
  var result = await callGemini([
    { role: "system", content: systemPrompt },
    { role: "user", content: text },
  ]);
  return result.corrections || [];
}
