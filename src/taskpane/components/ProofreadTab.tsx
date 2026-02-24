import React, { useState } from "react";
import { Button, Spinner, Text } from "@fluentui/react-components";
import { useStore } from "../store";
import { proofread } from "../modules/proofread";
import { getSelection, extractDocument, extractChapters } from "../services/wordApi";
import { chunkDocument } from "../services/chunker";
import { analyzeChunks } from "../modules/analyzeChunks";
import { PROOFREADING_PROMPT } from "../services/prompts";
import { ChunkProgress } from "./ChunkProgress";
import type { ProofreadResult } from "../types";

var categoryLabels: Record<string, string> = {
  structure: "Struktur",
  argumentation: "Argumentation",
  precision: "Präzision",
  conventions: "Konventionen",
  formal: "Formales",
};

var categoryIcons: Record<string, string> = {
  structure: "\uD83C\uDFD7",
  argumentation: "\uD83D\uDCAC",
  precision: "\uD83C\uDFAF",
  conventions: "\uD83D\uDCCB",
  formal: "\uD83D\uDCC4",
};

function scoreColor(score: number): string {
  if (score >= 80) return "#2e7d32";
  if (score >= 60) return "#f57c00";
  return "#d32f2f";
}

function scoreBg(score: number): string {
  if (score >= 80) return "#e8f5e9";
  if (score >= 60) return "#fff3e0";
  return "#fde8e8";
}

export function ProofreadTab() {
  var { loading, setLoading, discipline, setProgress, analysisScope, docInfo, selectedChapters } = useStore();
  var [result, setResult] = useState<ProofreadResult | null>(null);
  var [error, setError] = useState<string | null>(null);

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

  var handleProofread = async function () {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      var scopeText = await getTextForAnalysis();

      if (scopeText && scopeText.trim().length > 0) {
        var words = scopeText.split(/\s+/).filter(function (w) { return w; });
        if (words.length < 4000) {
          var res = await proofread(scopeText, discipline);
          setResult(res);
        } else {
          var fakeParagraphs = [{ index: 0, text: scopeText, headingLevel: 0, wordCount: words.length }];
          var chData = chunkDocument(fakeParagraphs);
          var sysPrompt = PROOFREADING_PROMPT(discipline, "wissenschaftliche Arbeit");
          var chResults = await analyzeChunks(
            chData.chunks, chData.meta, "proofread", sysPrompt,
            function (done, total, chapterName) { setProgress({ done: done, total: total, chapterName: chapterName }); }
          );
          setProgress(null);
          setResult(mergeProofreadResults(chResults));
        }
      } else {
        var paragraphs = await extractDocument();
        var totalWords = paragraphs.reduce(function (s, p) { return s + p.wordCount; }, 0);

        if (totalWords < 4000) {
          var fullText = paragraphs.map(function (p) { return p.text; }).join("\n\n");
          var res2 = await proofread(fullText, discipline);
          setResult(res2);
        } else {
          var chunkData = chunkDocument(paragraphs);
          var systemPrompt = PROOFREADING_PROMPT(discipline, "wissenschaftliche Arbeit");
          var chunkResults = await analyzeChunks(
            chunkData.chunks, chunkData.meta, "proofread", systemPrompt,
            function (done, total, chapterName) { setProgress({ done: done, total: total, chapterName: chapterName }); }
          );
          setProgress(null);
          setResult(mergeProofreadResults(chunkResults));
        }
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={cardStyle}>
        <Button appearance="primary" onClick={handleProofread} disabled={loading} style={{ width: "100%", borderRadius: 8, fontWeight: 600 }}>
          {loading ? <Spinner size="tiny" /> : "Wissenschaftliches Lektorat starten"}
        </Button>
      </div>

      <ChunkProgress />

      {error && (
        <div style={{ padding: 12, background: "#fde8e8", borderRadius: 8, border: "1px solid #f5c6c6" }}>
          <Text style={{ color: "#c62828", fontSize: 12 }}>{error}</Text>
        </div>
      )}

      {result && (
        <>
          {/* Overall Score Circle */}
          <div style={{ ...cardStyle, textAlign: "center", padding: "20px 14px" }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: scoreBg(result.overall_score),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 8px",
                border: "3px solid " + scoreColor(result.overall_score),
              }}
            >
              <span style={{ fontSize: 24, fontWeight: 700, color: scoreColor(result.overall_score) }}>
                {result.overall_score}
              </span>
            </div>
            <Text size={200} style={{ color: "#888" }}>Gesamtbewertung</Text>
            {result.summary && (
              <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{result.summary}</div>
            )}
          </div>

          {/* Category Scores */}
          {Object.entries(result.scores).map(function (entry) {
            var key = entry[0];
            var val = entry[1];
            return (
              <div key={key} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{categoryIcons[key] || ""}</span>
                    <Text weight="semibold" style={{ fontSize: 13 }}>{categoryLabels[key] || key}</Text>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor(val.score) }}>
                    {val.score}
                  </span>
                </div>
                {/* Progress Bar */}
                <div style={{ height: 6, background: "#eee", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      height: 6,
                      width: val.score + "%",
                      background: scoreColor(val.score),
                      borderRadius: 3,
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
                {val.issues.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {val.issues.map(function (issue, i) {
                      return (
                        <div key={i} style={{ fontSize: 11, color: "#666", padding: "3px 0", borderTop: i > 0 ? "1px solid #f0f0f0" : "none" }}>
                          {issue}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function mergeProofreadResults(chunkResults: Map<string, any>): ProofreadResult {
  var scoreKeys = ["structure", "argumentation", "precision", "conventions", "formal"];
  var merged: ProofreadResult = {
    scores: {
      structure: { score: 0, issues: [] },
      argumentation: { score: 0, issues: [] },
      precision: { score: 0, issues: [] },
      conventions: { score: 0, issues: [] },
      formal: { score: 0, issues: [] },
    },
    overall_score: 0,
    summary: "",
  };
  var count = 0;
  chunkResults.forEach(function (r) {
    if (!r.scores) return;
    count++;
    for (var k = 0; k < scoreKeys.length; k++) {
      var key = scoreKeys[k];
      if (r.scores[key]) {
        (merged.scores as any)[key].score += r.scores[key].score;
        var issues = r.scores[key].issues || [];
        for (var j = 0; j < issues.length; j++) {
          (merged.scores as any)[key].issues.push(issues[j]);
        }
      }
    }
    merged.overall_score += r.overall_score || 0;
  });
  if (count > 0) {
    for (var k = 0; k < scoreKeys.length; k++) {
      (merged.scores as any)[scoreKeys[k]].score = Math.round((merged.scores as any)[scoreKeys[k]].score / count);
    }
    merged.overall_score = Math.round(merged.overall_score / count);
  }
  merged.summary = "Bewertung über " + count + " Abschnitte gemittelt.";
  return merged;
}

var cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 10,
  padding: "10px 14px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};
