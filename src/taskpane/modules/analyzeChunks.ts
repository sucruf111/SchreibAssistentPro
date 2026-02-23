import type { Chunk, MetaContext } from "../services/chunker";
import { callGemini } from "../services/gemini";

export async function analyzeChunks(
  chunks: Chunk[],
  _meta: MetaContext,
  _module: string,
  systemPrompt: string,
  onProgress: (done: number, total: number) => void,
  maxParallel: number = 3
): Promise<Map<string, any>> {
  var results = new Map<string, any>();
  var done = 0;

  // Process in batches of maxParallel
  for (var i = 0; i < chunks.length; i += maxParallel) {
    var batch = chunks.slice(i, i + maxParallel);

    var promises = batch.map(function (chunk) {
      var context =
        "--- DOKUMENTKONTEXT ---\n" + _meta.toc + "\n(" + _meta.totalWords + " Wörter, " + _meta.totalChapters + " Kapitel)\n\n" +
        "--- KAPITEL: " + chunk.chapter + " ---\n" +
        (chunk.overlapBefore
          ? "\n[Vorheriger Kontext]: " + chunk.overlapBefore + "\n\n"
          : "") +
        chunk.paragraphs.map(function (p) { return p.text; }).join("\n\n");

      return callGemini([
        { role: "system", content: systemPrompt },
        { role: "user", content: context },
      ]).then(function (result) {
        results.set(chunk.id, result);
        done++;
        onProgress(done, chunks.length);
      });
    });

    await Promise.all(promises);
  }

  return results;
}
