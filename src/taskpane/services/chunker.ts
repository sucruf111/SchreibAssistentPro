import type { DocParagraph } from "../types";

const MAX_WORDS_PER_CHUNK = 4000; // ~5,500 tokens
const OVERLAP_WORDS = 300;

export interface Chunk {
  id: string;
  chapter: string;
  paragraphs: DocParagraph[];
  overlapBefore: string;
  overlapAfter: string;
}

export interface MetaContext {
  toc: string;
  totalWords: number;
  totalChapters: number;
}

export function chunkDocument(
  paragraphs: DocParagraph[]
): { chunks: Chunk[]; meta: MetaContext } {
  // Step 1: Split at chapter boundaries (Heading 1 or 2)
  const chapters = splitAtHeadings(paragraphs, [1, 2]);
  const chunks: Chunk[] = [];

  for (let i = 0; i < chapters.length; i++) {
    const [title, paras] = chapters[i];
    const words = paras.reduce((sum, p) => sum + p.wordCount, 0);

    if (words <= MAX_WORDS_PER_CHUNK) {
      chunks.push({
        id: `ch${i}`,
        chapter: title,
        paragraphs: paras,
        overlapBefore: "",
        overlapAfter: "",
      });
    } else {
      // Split further at subsections
      const sections = splitAtHeadings(paras, [3, 4]);
      for (let j = 0; j < sections.length; j++) {
        const [secTitle, secParas] = sections[j];
        const secWords = secParas.reduce((sum, p) => sum + p.wordCount, 0);
        const label = secTitle ? `${title} > ${secTitle}` : title;

        if (secWords <= MAX_WORDS_PER_CHUNK) {
          chunks.push({
            id: `ch${i}_s${j}`,
            chapter: label,
            paragraphs: secParas,
            overlapBefore: "",
            overlapAfter: "",
          });
        } else {
          // Last resort: split at paragraph boundaries
          const groups = splitAtWordLimit(secParas);
          groups.forEach((group, k) => {
            chunks.push({
              id: `ch${i}_s${j}_p${k}`,
              chapter: `${label} (${k + 1})`,
              paragraphs: group,
              overlapBefore: "",
              overlapAfter: "",
            });
          });
        }
      }
    }
  }

  // Add overlap text between adjacent chunks
  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) {
      const prevText = chunks[i - 1].paragraphs.map((p) => p.text).join(" ");
      const words = prevText.split(/\s+/);
      chunks[i].overlapBefore = words.slice(-OVERLAP_WORDS).join(" ");
    }
    if (i < chunks.length - 1) {
      const nextText = chunks[i + 1].paragraphs.map((p) => p.text).join(" ");
      const words = nextText.split(/\s+/);
      chunks[i].overlapAfter = words.slice(0, OVERLAP_WORDS).join(" ");
    }
  }

  // Build meta context
  const toc = paragraphs
    .filter((p) => p.headingLevel > 0)
    .map((p) => "  ".repeat(p.headingLevel - 1) + p.text)
    .join("\n");

  return {
    chunks,
    meta: {
      toc: toc.slice(0, 3000),
      totalWords: paragraphs.reduce((s, p) => s + p.wordCount, 0),
      totalChapters: chapters.length,
    },
  };
}

function splitAtHeadings(
  paragraphs: DocParagraph[],
  levels: number[]
): [string, DocParagraph[]][] {
  const groups: [string, DocParagraph[]][] = [];
  let title = "";
  let current: DocParagraph[] = [];

  for (const p of paragraphs) {
    if (levels.includes(p.headingLevel) && current.length > 0) {
      groups.push([title, current]);
      title = p.text;
      current = [p];
    } else {
      if (levels.includes(p.headingLevel)) title = p.text;
      current.push(p);
    }
  }
  if (current.length > 0) groups.push([title, current]);
  return groups;
}

function splitAtWordLimit(paragraphs: DocParagraph[]): DocParagraph[][] {
  const groups: DocParagraph[][] = [];
  let current: DocParagraph[] = [];
  let count = 0;

  for (const p of paragraphs) {
    if (count + p.wordCount > MAX_WORDS_PER_CHUNK && current.length > 0) {
      groups.push(current);
      current = [];
      count = 0;
    }
    current.push(p);
    count += p.wordCount;
  }
  if (current.length > 0) groups.push(current);
  return groups;
}
