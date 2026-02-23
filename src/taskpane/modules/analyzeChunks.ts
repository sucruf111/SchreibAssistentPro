import type { Chunk, MetaContext } from "../services/chunker";
import { callChatGPT } from "../services/openai";

export async function analyzeChunks(
  chunks: Chunk[],
  _meta: MetaContext,
  _module: string,
  systemPrompt: string,
  onProgress: (done: number, total: number) => void,
  maxParallel: number = 3
): Promise<Map<string, any>> {
  const results = new Map<string, any>();
  let done = 0;

  // Process in batches of maxParallel
  for (let i = 0; i < chunks.length; i += maxParallel) {
    const batch = chunks.slice(i, i + maxParallel);

    const promises = batch.map(async (chunk) => {
      const context =
        `--- DOKUMENTKONTEXT ---\n${_meta.toc}\n(${_meta.totalWords} Wörter, ${_meta.totalChapters} Kapitel)\n\n` +
        `--- KAPITEL: ${chunk.chapter} ---\n` +
        (chunk.overlapBefore
          ? `\n[Vorheriger Kontext]: ${chunk.overlapBefore}\n\n`
          : "") +
        chunk.paragraphs.map((p) => p.text).join("\n\n");

      const result = await callChatGPT([
        { role: "system", content: systemPrompt },
        { role: "user", content: context },
      ]);

      results.set(chunk.id, result);
      done++;
      onProgress(done, chunks.length);
    });

    await Promise.all(promises);
  }

  return results;
}
