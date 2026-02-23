/* global Word */

import type { DocParagraph } from "../types";

/** Extract all paragraphs in one call. */
export async function extractDocument(): Promise<DocParagraph[]> {
  return Word.run(async (ctx) => {
    const paras = ctx.document.body.paragraphs;
    paras.load("text,outlineLevel");
    await ctx.sync();
    return paras.items.map((p, i) => ({
      index: i,
      text: p.text,
      headingLevel: p.outlineLevel < 9 ? p.outlineLevel + 1 : 0,
      wordCount: p.text.split(/\s+/).filter((w) => w).length,
    }));
  });
}

/** Get just the selected text. */
export async function getSelection(): Promise<string> {
  return Word.run(async (ctx) => {
    const sel = ctx.document.getSelection();
    sel.load("text");
    await ctx.sync();
    return sel.text;
  });
}

/** Underline errors/warnings in the document. Skips marking if enabled is false. */
export async function markErrors(
  corrections: Array<{ original: string; severity: string }>,
  enabled = true
) {
  if (!enabled) return;
  return Word.run(async (ctx) => {
    const body = ctx.document.body;
    for (const c of corrections) {
      const results = body.search(c.original, {
        matchCase: true,
        matchWholeWord: false,
      });
      results.load("items");
      await ctx.sync();
      for (const r of results.items) {
        r.font.underline = Word.UnderlineType.wave;
        r.font.underlineColor =
          c.severity === "error"
            ? "red"
            : c.severity === "warning"
              ? "#FFC107"
              : "#2196F3";
      }
    }
    await ctx.sync();
  });
}

/** Insert text at the cursor position. */
export async function insertAtCursor(text: string) {
  return Word.run(async (ctx) => {
    const sel = ctx.document.getSelection();
    sel.insertText(text, Word.InsertLocation.replace);
    await ctx.sync();
  });
}

/** Clear all underline formatting (reset). */
export async function clearAnnotations() {
  return Word.run(async (ctx) => {
    const body = ctx.document.body;
    body.load("font");
    await ctx.sync();
    body.font.underline = Word.UnderlineType.none;
    await ctx.sync();
  });
}
