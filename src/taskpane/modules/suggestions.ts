import { callChatGPT } from "../services/openai";
import { SUGGESTIONS_PROMPT } from "../services/prompts";
import type { SuggestionsResult } from "../types";

export async function getSuggestions(
  before: string,
  after: string,
  styleProfile: string
): Promise<SuggestionsResult> {
  const context =
    `--- TEXT DAVOR ---\n${before}\n\n--- HIER EINFÜGEN ---\n\n--- TEXT DANACH ---\n${after}`;
  return callChatGPT(
    [
      { role: "system", content: SUGGESTIONS_PROMPT(styleProfile || "Neutral-akademisch") },
      { role: "user", content: context },
    ],
    0.7 // Higher temperature for creative suggestions
  );
}
