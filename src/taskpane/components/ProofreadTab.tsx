import React, { useState } from "react";
import { Button, Spinner, Text } from "@fluentui/react-components";
import { useStore } from "../store";
import { proofread } from "../modules/proofread";
import { getSelection, extractDocument } from "../services/wordApi";
import { chunkDocument } from "../services/chunker";
import { analyzeChunks } from "../modules/analyzeChunks";
import { PROOFREADING_PROMPT } from "../services/prompts";
import { ChunkProgress } from "./ChunkProgress";
import type { ProofreadResult } from "../types";

const categoryLabels: Record<string, string> = {
  structure: "Struktur",
  argumentation: "Argumentation",
  precision: "Präzision",
  conventions: "Konventionen",
  formal: "Formales",
};

const categoryIcons: Record<string, string> = {
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
  const { loading, setLoading, discipline, setProgress } = useStore();
  const [result, setResult] = useState<ProofreadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProofread = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const selection = await getSelection();
      if (selection && selection.trim().length > 0) {
        const res = await proofread(selection, discipline);
        setResult(res);
      } else {
        const paragraphs = await extractDocument();
        const totalWords = paragraphs.reduce((s, p) => s + p.wordCount, 0);

        if (totalWords < 4000) {
          const fullText = paragraphs.map((p) => p.text).join("\n\n");
          const res = await proofread(fullText, discipline);
          setResult(res);
        } else {
          const { chunks, meta } = chunkDocument(paragraphs);
          const systemPrompt = PROOFREADING_PROMPT(discipline, "wissenschaftliche Arbeit");
          const chunkResults = await analyzeChunks(
            chunks, meta, "proofread", systemPrompt,
            (done, total) => setProgress({ done, total })
          );
          setProgress(null);

          const scoreKeys = ["structure", "argumentation", "precision", "conventions", "formal"] as const;
          const merged: ProofreadResult = {
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
          let count = 0;
          for (const r of chunkResults.values()) {
            if (!r.scores) continue;
            count++;
            for (const key of scoreKeys) {
              if (r.scores[key]) {
                merged.scores[key].score += r.scores[key].score;
                merged.scores[key].issues.push(...(r.scores[key].issues || []));
              }
            }
            merged.overall_score += r.overall_score || 0;
          }
          if (count > 0) {
            for (const key of scoreKeys) merged.scores[key].score = Math.round(merged.scores[key].score / count);
            merged.overall_score = Math.round(merged.overall_score / count);
          }
          merged.summary = `Bewertung über ${count} Abschnitte gemittelt.`;
          setResult(merged);
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
                border: `3px solid ${scoreColor(result.overall_score)}`,
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
          {Object.entries(result.scores).map(([key, val]) => (
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
                    width: `${val.score}%`,
                    background: scoreColor(val.score),
                    borderRadius: 3,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
              {val.issues.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {val.issues.map((issue, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#666", padding: "3px 0", borderTop: i > 0 ? "1px solid #f0f0f0" : "none" }}>
                      {issue}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 10,
  padding: "10px 14px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};
