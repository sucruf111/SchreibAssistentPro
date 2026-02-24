/* global Word */

import type { DocParagraph } from "../types";
import type { DocInfo, ChapterInfo } from "../store";

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

/** Load document info: word count, selection, chapters. */
export async function loadDocumentInfo(): Promise<DocInfo> {
  var paragraphs = await extractDocument();
  var totalWords = 0;
  for (var i = 0; i < paragraphs.length; i++) {
    totalWords += paragraphs[i].wordCount;
  }

  // Detect chapters (heading level 1-2)
  var chapters: ChapterInfo[] = [];
  var currentChapter: ChapterInfo | null = null;
  for (var j = 0; j < paragraphs.length; j++) {
    var p = paragraphs[j];
    if (p.headingLevel === 1 || p.headingLevel === 2) {
      if (currentChapter) {
        currentChapter.endIndex = j - 1;
        chapters.push(currentChapter);
      }
      currentChapter = {
        title: p.text || ("Abschnitt " + (chapters.length + 1)),
        wordCount: 0,
        startIndex: j,
        endIndex: paragraphs.length - 1,
      };
    }
    if (currentChapter) {
      currentChapter.wordCount += p.wordCount;
    }
  }
  if (currentChapter) {
    currentChapter.endIndex = paragraphs.length - 1;
    chapters.push(currentChapter);
  }

  // If no headings found, create one chapter for the whole doc
  if (chapters.length === 0) {
    chapters.push({
      title: "Gesamtes Dokument",
      wordCount: totalWords,
      startIndex: 0,
      endIndex: paragraphs.length - 1,
    });
  }

  // Check selection
  var selectedWords = 0;
  var hasSelection = false;
  try {
    var selText = await getSelection();
    if (selText && selText.trim().length > 0) {
      hasSelection = true;
      selectedWords = selText.split(/\s+/).filter(function (w) { return w; }).length;
    }
  } catch (_e) {
    // No selection
  }

  return {
    totalWords: totalWords,
    selectedWords: selectedWords,
    hasSelection: hasSelection,
    chapters: chapters,
  };
}

/** Extract paragraphs for specific chapter indices only. */
export async function extractChapters(chapters: ChapterInfo[]): Promise<DocParagraph[]> {
  var allParagraphs = await extractDocument();
  var result: DocParagraph[] = [];
  for (var i = 0; i < chapters.length; i++) {
    var ch = chapters[i];
    for (var j = ch.startIndex; j <= ch.endIndex && j < allParagraphs.length; j++) {
      result.push(allParagraphs[j]);
    }
  }
  return result;
}

/** Replace the currently selected text with new text. More robust than applyCorrection for longer passages. */
export async function replaceSelection(newText: string): Promise<boolean> {
  return Word.run(async function (ctx) {
    var sel = ctx.document.getSelection();
    sel.load("text");
    await ctx.sync();
    if (sel.text && sel.text.trim().length > 0) {
      sel.insertText(newText, Word.InsertLocation.replace);
      await ctx.sync();
      return true;
    }
    return false;
  });
}

/** Register a handler for document selection changes. */
export function onSelectionChanged(callback: () => void): void {
  try {
    Office.context.document.addHandlerAsync(
      Office.EventType.DocumentSelectionChanged,
      function () { callback(); }
    );
  } catch (_e) {
    // SelectionChanged event not supported on this platform
  }
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
