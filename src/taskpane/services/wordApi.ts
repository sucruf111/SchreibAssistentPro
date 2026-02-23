/* global Word */

import type { DocParagraph } from "../types";

/** Extract all paragraphs in one call. */
export async function extractDocument(): Promise<DocParagraph[]> {
  return Word.run(function (ctx) {
    var paras = ctx.document.body.paragraphs;
    paras.load("text,outlineLevel");
    return ctx.sync().then(function () {
      return paras.items.map(function (p, i) {
        return {
          index: i,
          text: p.text,
          headingLevel: p.outlineLevel < 9 ? p.outlineLevel + 1 : 0,
          wordCount: p.text.split(/\s+/).filter(function (w) { return w; }).length,
        };
      });
    });
  });
}

/** Get just the selected text. */
export async function getSelection(): Promise<string> {
  return Word.run(function (ctx) {
    var sel = ctx.document.getSelection();
    sel.load("text");
    return ctx.sync().then(function () {
      return sel.text;
    });
  });
}

/** Underline errors/warnings in the document. Skips marking if enabled is false. */
export async function markErrors(
  corrections: Array<{ original: string; severity: string }>,
  enabled: boolean
) {
  if (!enabled) return;
  return Word.run(async function (ctx) {
    var body = ctx.document.body;
    for (var i = 0; i < corrections.length; i++) {
      var c = corrections[i];
      if (!c.original || c.original.trim().length === 0) continue;
      try {
        var results = body.search(c.original, {
          matchCase: false,
          matchWholeWord: false,
        });
        results.load("items");
        await ctx.sync();
        for (var j = 0; j < results.items.length; j++) {
          var r = results.items[j];
          r.font.underline = Word.UnderlineType.wave;
          if (c.severity === "error") {
            r.font.underlineColor = "red";
          } else if (c.severity === "warning") {
            r.font.underlineColor = "#FFC107";
          } else {
            r.font.underlineColor = "#2196F3";
          }
        }
        await ctx.sync();
      } catch (_e) {
        // Skip corrections whose text can't be found in the document
      }
    }
  });
}

/** Apply a single correction: replace original text with suggestion in the document. */
export async function applyCorrection(original: string, replacement: string): Promise<boolean> {
  return Word.run(async function (ctx) {
    var body = ctx.document.body;
    var results = body.search(original, {
      matchCase: false,
      matchWholeWord: false,
    });
    results.load("items");
    await ctx.sync();
    if (results.items.length > 0) {
      // Replace first occurrence
      results.items[0].insertText(replacement, Word.InsertLocation.replace);
      await ctx.sync();
      return true;
    }
    return false;
  });
}

/** Insert text at the cursor position. */
export async function insertAtCursor(text: string) {
  return Word.run(function (ctx) {
    var sel = ctx.document.getSelection();
    sel.insertText(text, Word.InsertLocation.replace);
    return ctx.sync();
  });
}

/** Clear all underline formatting (reset). */
export async function clearAnnotations() {
  return Word.run(function (ctx) {
    var body = ctx.document.body;
    body.load("font");
    return ctx.sync().then(function () {
      body.font.underline = Word.UnderlineType.none;
      return ctx.sync();
    });
  });
}
