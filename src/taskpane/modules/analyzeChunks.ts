import type { Chunk, MetaContext } from "../services/chunker";
import { callGemini } from "../services/gemini";

function wait(ms: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

export async function analyzeChunks(
  chunks: Chunk[],
  _meta: MetaContext,
  _module: string,
  systemPrompt: string,
  onProgress: (done: number, total: number, chapterName: string) => void
): Promise<Map<string, any>> {
  var results = new Map<string, any>();

  // Process one at a time with delay (Gemini Free Tier = 15 req/min)
  for (var i = 0; i < chunks.length; i++) {
    var chunk = chunks[i];

    // Report progress with chapter name
    onProgress(i, chunks.length, chunk.chapter);

    var context =
      "--- DOKUMENTKONTEXT ---\n" + _meta.toc + "\n(" + _meta.totalWords + " Wörter, " + _meta.totalChapters + " Kapitel)\n\n" +
      "--- KAPITEL: " + chunk.chapter + " ---\n" +
      (chunk.overlapBefore
        ? "\n[Vorheriger Kontext]: " + chunk.overlapBefore + "\n\n"
        : "") +
      chunk.paragraphs.map(function (p) { return p.text; }).join("\n\n");

    var result = await callGemini([
      { role: "system", content: systemPrompt },
      { role: "user", content: context },
    ]);

    results.set(chunk.id, result);
    onProgress(i + 1, chunks.length, chunk.chapter);

    // Wait between requests to avoid 429
    if (i < chunks.length - 1) {
      await wait(1500);
    }
  }

  return results;
}
