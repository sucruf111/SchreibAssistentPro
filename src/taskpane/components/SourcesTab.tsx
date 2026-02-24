import React, { useState } from "react";
import { Button, Spinner, Text, Badge } from "@fluentui/react-components";
import { useStore } from "../store";
import { checkLegitimacy } from "../modules/legitimacy";
import { getSelection, extractDocument, extractChapters } from "../services/wordApi";
import { chunkDocument } from "../services/chunker";
import { analyzeChunks } from "../modules/analyzeChunks";
import { ChunkProgress } from "./ChunkProgress";
import type { LegitimacyResult } from "../types";

var statusColor: Record<string, "success" | "warning" | "danger"> = {
  ok: "success",
  warning: "warning",
  error: "danger",
};

var statusLabel: Record<string, string> = {
  ok: "OK",
  warning: "Warnung",
  error: "Fehler",
};

var SOURCES_SYSTEM_PROMPT = "Du bist ein Experte für wissenschaftliche Quellenprüfung. Analysiere den folgenden Text auf Zitierprobleme.\n\nAntworte NUR mit JSON:\n{\n  \"overall\": { \"style_detected\": \"string\", \"consistency_score\": number },\n  \"citations\": [\n    {\n      \"text\": \"Zitat oder Verweis im Text\",\n      \"status\": \"ok|warning|error\",\n      \"issues\": [\n        { \"type\": \"string\", \"description\": \"string\", \"suggestion\": \"string\" }\n      ]\n    }\n  ]\n}";

export function SourcesTab() {
  var { loading, setLoading, citationStyle, setProgress, analysisScope, docInfo, selectedChapters } = useStore();
  var [result, setResult] = useState<LegitimacyResult | null>(null);
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

  var handleCheck = async function () {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      var scopeText = await getTextForAnalysis();

      if (scopeText && scopeText.trim().length > 0) {
        var words = scopeText.split(/\s+/).filter(function (w) { return w; });
        if (words.length < 4000) {
          var res = await checkLegitimacy(scopeText, citationStyle);
          setResult(res);
        } else {
          var fakeParagraphs = [{ index: 0, text: scopeText, headingLevel: 0, wordCount: words.length }];
          var chData = chunkDocument(fakeParagraphs);
          var chResults = await analyzeChunks(
            chData.chunks, chData.meta, "sources", SOURCES_SYSTEM_PROMPT,
            function (done, total, chapterName) { setProgress({ done: done, total: total, chapterName: chapterName }); }
          );
          setProgress(null);
          setResult(mergeSourcesResults(chResults));
        }
      } else {
        var paragraphs = await extractDocument();
        var totalWords = paragraphs.reduce(function (s, p) { return s + p.wordCount; }, 0);

        if (totalWords < 4000) {
          var fullText = paragraphs.map(function (p) { return p.text; }).join("\n\n");
          var res2 = await checkLegitimacy(fullText, citationStyle);
          setResult(res2);
        } else {
          var chunkData = chunkDocument(paragraphs);
          var chunkResults = await analyzeChunks(
            chunkData.chunks, chunkData.meta, "sources", SOURCES_SYSTEM_PROMPT,
            function (done, total, chapterName) { setProgress({ done: done, total: total, chapterName: chapterName }); }
          );
          setProgress(null);
          setResult(mergeSourcesResults(chunkResults));
        }
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  var okCount = result ? result.citations.filter(function (c) { return c.status === "ok"; }).length : 0;
  var issueCount = result ? result.citations.filter(function (c) { return c.status !== "ok"; }).length : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={cardStyle}>
        <Button appearance="primary" onClick={handleCheck} disabled={loading} style={{ width: "100%", borderRadius: 8, fontWeight: 600 }}>
          {loading ? <Spinner size="tiny" /> : "Quellen prüfen"}
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
          {/* Overview Card */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: "#888" }}>Erkannter Stil</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{result.overall.style_detected}</div>
              </div>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: result.overall.consistency_score >= 70 ? "#e8f5e9" : "#fff3e0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid " + (result.overall.consistency_score >= 70 ? "#4caf50" : "#ff9800"),
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 700, color: result.overall.consistency_score >= 70 ? "#2e7d32" : "#e65100" }}>
                  {result.overall.consistency_score}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
              <span style={{ color: "#2e7d32" }}>{okCount} korrekt</span>
              <span style={{ color: issueCount > 0 ? "#d32f2f" : "#888" }}>{issueCount} mit Problemen</span>
            </div>
          </div>

          {/* Citation Cards */}
          {result.citations.map(function (c, i) {
            return (
              <div
                key={i}
                style={{
                  ...cardStyle,
                  borderLeft: "4px solid " + (c.status === "ok" ? "#4caf50" : c.status === "warning" ? "#ff9800" : "#d32f2f"),
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <Badge color={statusColor[c.status]} size="small" style={{ fontSize: 10 }}>
                    {statusLabel[c.status]}
                  </Badge>
                </div>
                <div style={{ fontSize: 12, fontStyle: "italic", color: "#555", marginBottom: 6, lineHeight: 1.4 }}>
                  "{c.text}"
                </div>
                {c.issues.map(function (issue, j) {
                  return (
                    <div key={j} style={{ fontSize: 11, padding: "4px 0", borderTop: j > 0 ? "1px solid #f0f0f0" : "none" }}>
                      <span style={{ fontWeight: 600, color: "#555" }}>{issue.type}:</span>{" "}
                      <span style={{ color: "#666" }}>{issue.description}</span>
                      {issue.suggestion && (
                        <div style={{ color: "#2e7d32", marginTop: 2, fontSize: 11 }}>
                          Vorschlag: {issue.suggestion}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function mergeSourcesResults(chunkResults: Map<string, any>): LegitimacyResult {
  var allCitations: any[] = [];
  var totalScore = 0;
  var count = 0;
  var detectedStyle = "";

  chunkResults.forEach(function (r) {
    if (r.citations) {
      for (var i = 0; i < r.citations.length; i++) {
        allCitations.push(r.citations[i]);
      }
    }
    if (r.overall) {
      totalScore += r.overall.consistency_score || 0;
      count++;
      if (!detectedStyle && r.overall.style_detected) {
        detectedStyle = r.overall.style_detected;
      }
    }
  });

  return {
    overall: {
      style_detected: detectedStyle || "Unbekannt",
      consistency_score: count > 0 ? Math.round(totalScore / count) : 0,
    },
    citations: allCitations,
  };
}

var cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 10,
  padding: "10px 14px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};
