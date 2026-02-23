import { callChatGPT } from "../services/openai";
import { LEGITIMACY_PROMPT } from "../services/prompts";
import type { LegitimacyResult } from "../types";

export async function checkLegitimacy(
  text: string,
  citationStyle: string = "APA"
): Promise<LegitimacyResult> {
  return callChatGPT([
    { role: "system", content: LEGITIMACY_PROMPT(citationStyle) },
    { role: "user", content: text },
  ]);
}
