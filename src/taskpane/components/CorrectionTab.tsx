import React, { useState, useEffect } from "react";
import { Button, Spinner, Text, Badge, Switch, Label } from "@fluentui/react-components";
import { useStore } from "../store";
import { checkGrammar } from "../modules/grammar";
import { getSelection, extractDocument, extractChapters, markErrors, clearAnnotations, applyCorrection } from "../services/wordApi";
import { chunkDocument } from "../services/chunker";
import { analyzeChunks } from "../modules/analyzeChunks";
import { GRAMMAR_PROMPT, GRAMMAR_MODE_EXTRA } from "../services/prompts";
import { ChunkProgress } from "./ChunkProgress";
import type { GrammarCorrection } from "../types";

var severityColor: Record<string, "danger" | "warning" | "informative"> = {
  error: "danger",
  warning: "warning",
  info: "informative",
};

var typeLabels: Record<string, string> = {
  kasus: "Kasus",
  genus: "Genus",
  komma: "Komma",
  rechtschreibung: "Rechtschreibung",
  konjunktiv: "Konjunktiv",
  dass_das: "dass/das",
  zusammenschreibung: "Zusammenschreibung",
  tempus: "Tempus",
};

export function CorrectionTab() {
  var { loading, setLoading, mode, setProgress, correctionsEnabled, setCorrectionsEnabled, analysisScope, docInfo, selectedChapters, autoCheck, setAutoCheck } = useStore();
  var [corrections, setCorrections] = useState<GrammarCorrection[]>([]);
  var [applied, setApplied] = useState<Record<number, boolean>>({});
  var [hasRun, setHasRun] = useState(false);
  var [error, setError] = useState<string | null>(null);
  var [batchApplying, setBatchApplying] = useState(false);
  var [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });

  // Auto-check support (triggered by context menu)
  useEffect(function () {
    if (autoCheck) {
      setAutoCheck(false);
      handleCheck();
    }
  }, [autoCheck]);

  var handleToggle = async function (checked: boolean) {
    setCorrectionsEnabled(checked);
    if (!checked) {
      await clearAnnotations(corrections);
    } else if (corrections.length > 0) {
      await markErrors(corrections, true);
    }
  };

  var handleApply = async function (c: GrammarCorrection, index: number) {
    try {
      var success = await applyCorrection(c.original, c.suggestion);
      if (success) {
        var newApplied: Record<number, boolean> = {};
        for (var k in applied) {
          newApplied[k] = applied[k];
        }
        newApplied[index] = true;
        setApplied(newApplied);
      } else {
        setError("Text \"" + c.original + "\" wurde nicht im Dokument gefunden.");
        setTimeout(function () { setError(null); }, 4000);
      }
    } catch (_e) {
      setError("Korrektur konnte nicht angewendet werden.");
      setTimeout(function () { setError(null); }, 4000);
    }
  };

  var handleApplyAll = async function () {
    var remaining = corrections.filter(function (_, i) { return !applied[i]; });
    setBatchApplying(true);
    setBatchProgress({ done: 0, total: remaining.length });
    var newApplied: Record<number, boolean> = {};
    for (var k in applied) {
      newApplied[k] = applied[k];
    }
    var doneCount = 0;
    for (var i = 0; i < corrections.length; i++) {
      if (newApplied[i]) continue;
      try {
        var success = await applyCorrection(corrections[i].original, corrections[i].suggestion);
        if (success) {
          newApplied[i] = true;
        }
      } catch (_e) {
        // Skip failed corrections
      }
      doneCount++;
      setBatchProgress({ done: doneCount, total: remaining.length });
      // Update applied state after each correction for real-time card updates
      var snapshot: Record<number, boolean> = {};
      for (var j in newApplied) { snapshot[j] = newApplied[j]; }
      setApplied(snapshot);
    }
    setBatchApplying(false);
  };

  var getTextForAnalysis = async function (): Promise<string> {
    if (analysisScope === "selection") {
      var selection = await getSelection();
      if (selection && selection.trim().length > 0) {
        return selection;
      }
    }

    if (analysisScope === "chapters" && docInfo && selectedChapters.length > 0) {
      var chapterInfos = [];
      for (var i = 0; i < selectedChapters.length; i++) {
        chapterInfos.push(docInfo.chapters[selectedChapters[i]]);
      }
      var chapterParagraphs = await extractChapters(chapterInfos);
      return chapterParagraphs.map(function (p) { return p.text; }).join("\n\n");
    }

    return "";
  };

  var handleCheck = async function () {
    setLoading(true);
    setError(null);
    setCorrections([]);
    setApplied({});
    try {
      await clearAnnotations(corrections);

      var scopeText = await getTextForAnalysis();

      if (scopeText && scopeText.trim().length > 0) {
        var words = scopeText.split(/\s+/).filter(function (w) { return w; });
        if (words.length < 4000) {
          var results = await checkGrammar(scopeText, mode);
          setCorrections(results);
          if (results.length > 0) await markErrors(results, correctionsEnabled);
        } else {
          var fakeParagraphs = [{ index: 0, text: scopeText, headingLevel: 0, wordCount: words.length }];
          var chunkData = chunkDocument(fakeParagraphs);
          var systemPrompt = GRAMMAR_PROMPT + (GRAMMAR_MODE_EXTRA[mode] || "");
          var chunkResults = await analyzeChunks(
            chunkData.chunks, chunkData.meta, "grammar", systemPrompt,
            function (done, total, chapterName) { setProgress({ done: done, total: total, chapterName: chapterName }); }
          );
          setProgress(null);
          var all: GrammarCorrection[] = [];
          chunkResults.forEach(function (r) {
            if (r.corrections) {
              for (var j = 0; j < r.corrections.length; j++) {
                all.push(r.corrections[j]);
              }
            }
          });
          setCorrections(all);
          if (all.length > 0) await markErrors(all, correctionsEnabled);
        }
      } else {
        var paragraphs = await extractDocument();
        var totalWords = paragraphs.reduce(function (s, p) { return s + p.wordCount; }, 0);

        if (totalWords < 4000) {
          var fullText = paragraphs.map(function (p) { return p.text; }).join("\n\n");
          var results2 = await checkGrammar(fullText, mode);
          setCorrections(results2);
          if (results2.length > 0) await markErrors(results2, correctionsEnabled);
        } else {
          var chunkData2 = chunkDocument(paragraphs);
          var systemPrompt2 = GRAMMAR_PROMPT + (GRAMMAR_MODE_EXTRA[mode] || "");
          var chunkResults2 = await analyzeChunks(
            chunkData2.chunks, chunkData2.meta, "grammar", systemPrompt2,
            function (done, total, chapterName) { setProgress({ done: done, total: total, chapterName: chapterName }); }
          );
          setProgress(null);

          var all2: GrammarCorrection[] = [];
          chunkResults2.forEach(function (r) {
            if (r.corrections) {
              for (var j = 0; j < r.corrections.length; j++) {
                all2.push(r.corrections[j]);
              }
            }
          });
          setCorrections(all2);
          if (all2.length > 0) await markErrors(all2, correctionsEnabled);
        }
      }
      setHasRun(true);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  var errorCount = corrections.filter(function (c) { return c.severity === "error"; }).length;
  var warnCount = corrections.filter(function (c) { return c.severity === "warning"; }).length;
  var infoCount = corrections.filter(function (c) { return c.severity === "info"; }).length;
  var appliedCount = Object.keys(applied).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Action Bar */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Button appearance="primary" onClick={handleCheck} disabled={loading} style={{ borderRadius: 8, fontWeight: 600 }}>
            {loading ? <Spinner size="tiny" /> : "Text prüfen"}
          </Button>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Label size="small" style={{ color: "#888" }}>Markierungen</Label>
            <Switch checked={correctionsEnabled} onChange={function (_, data) { handleToggle(data.checked); }} />
          </div>
        </div>
      </div>

      <ChunkProgress />

      {error && (
        <div style={{ padding: 12, background: "#fde8e8", borderRadius: 8, border: "1px solid #f5c6c6" }}>
          <Text style={{ color: "#c62828", fontSize: 12 }}>{error}</Text>
        </div>
      )}

      {/* Summary Stats + Apply All */}
      {hasRun && !error && corrections.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: "flex", gap: 0, marginBottom: corrections.length > 0 ? 10 : 0 }}>
            {[
              { count: errorCount, label: "Fehler", color: "#d32f2f" },
              { count: warnCount, label: "Warnungen", color: "#f57c00" },
              { count: infoCount, label: "Hinweise", color: "#1976d2" },
            ].map(function (s, i) {
              return (
                <React.Fragment key={s.label}>
                  {i > 0 && <div style={{ width: 1, background: "#eee" }} />}
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.count}</div>
                    <div style={{ fontSize: 10, color: "#888" }}>{s.label}</div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          {appliedCount < corrections.length ? (
            <Button
              appearance="primary"
              onClick={handleApplyAll}
              disabled={batchApplying}
              style={{ width: "100%", borderRadius: 8, fontWeight: 600, background: "#2e7d32" }}
            >
              {batchApplying ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Spinner size="tiny" />
                  <span>{batchProgress.done}/{batchProgress.total}...</span>
                </span>
              ) : (
                "Alle Korrekturen \u00fcbernehmen (" + (corrections.length - appliedCount) + " offen)"
              )}
            </Button>
          ) : (
            <div style={{ textAlign: "center", fontSize: 12, color: "#2e7d32", fontWeight: 600 }}>
              Alle Korrekturen übernommen!
            </div>
          )}
        </div>
      )}

      {hasRun && !error && corrections.length === 0 && (
        <div style={{ padding: 20, background: "#e8f5e9", borderRadius: 10, textAlign: "center", border: "1px solid #c8e6c9" }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>&#10003;</div>
          <Text style={{ color: "#2e7d32", fontWeight: 600 }}>Keine Fehler gefunden!</Text>
        </div>
      )}

      {/* Correction Cards */}
      {corrections.map(function (c, i) {
        var isApplied = applied[i] === true;
        return (
          <div
            key={i}
            style={{
              ...cardStyle,
              borderLeft: "4px solid " + (isApplied ? "#4caf50" : c.severity === "error" ? "#d32f2f" : c.severity === "warning" ? "#f57c00" : "#1976d2"),
              opacity: isApplied ? 0.6 : 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <Badge color={isApplied ? "success" : severityColor[c.severity]} size="small" style={{ fontSize: 10 }}>
                {isApplied ? "Übernommen" : typeLabels[c.type] || c.type}
              </Badge>
              {!isApplied && (
                <button
                  onClick={function () { handleApply(c, i); }}
                  style={{
                    background: "#2e7d32",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Übernehmen
                </button>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#999", textDecoration: "line-through", marginBottom: 2 }}>
              {c.original}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#2e7d32" }}>
              {c.suggestion}
            </div>
            <div style={{ fontSize: 11, color: "#666", marginTop: 6, lineHeight: 1.4 }}>
              {c.explanation}
            </div>
          </div>
        );
      })}
    </div>
  );
}

var cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 10,
  padding: "10px 14px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};
