import { callChatGPT } from "../services/openai";
import { PROOFREADING_PROMPT } from "../services/prompts";
import type { ProofreadResult } from "../types";

export async function proofread(
  text: string,
  discipline: string = "allgemein",
  textType: string = "wissenschaftliche Arbeit"
): Promise<ProofreadResult> {
  return callChatGPT([
    { role: "system", content: PROOFREADING_PROMPT(discipline, textType) },
    { role: "user", content: text },
  ]);
}
