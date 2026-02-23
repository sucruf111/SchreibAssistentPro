import { callGemini } from "../services/gemini";
import { PROOFREADING_PROMPT } from "../services/prompts";
import type { ProofreadResult } from "../types";

export async function proofread(
  text: string,
  discipline?: string,
  textType?: string
): Promise<ProofreadResult> {
  var disc = discipline || "allgemein";
  var tt = textType || "wissenschaftliche Arbeit";
  return callGemini([
    { role: "system", content: PROOFREADING_PROMPT(disc, tt) },
    { role: "user", content: text },
  ]);
}
