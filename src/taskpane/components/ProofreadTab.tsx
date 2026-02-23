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

          // Average scores across chunks
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
      <Button appearance="primary" onClick={handleProofread} disabled={loading}>
        {loading ? <Spinner size="tiny" /> : "Wissenschaftliches Lektorat"}
      </Button>

      <ChunkProgress />

      {error && <Text style={{ color: "#d32f2f" }}>{error}</Text>}

      {result && (
        <>
          <div style={{ textAlign: "center", margin: "8px 0" }}>
            <Text size={600} weight="bold">
              {result.overall_score}/100
            </Text>
            <br />
            <Text size={200}>{result.summary}</Text>
          </div>

          {Object.entries(result.scores).map(([key, val]) => (
            <div key={key} style={{ padding: 8, background: "#fafafa", borderRadius: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text weight="semibold">{categoryLabels[key] || key}</Text>
                <Text>{val.score}/100</Text>
              </div>
              <div
                style={{
                  height: 4,
                  background: "#e0e0e0",
                  borderRadius: 2,
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    height: 4,
                    width: `${val.score}%`,
                    background: val.score >= 70 ? "#4caf50" : val.score >= 40 ? "#ffc107" : "#d32f2f",
                    borderRadius: 2,
                  }}
                />
              </div>
              {val.issues.length > 0 && (
                <ul style={{ margin: "4px 0 0 16px", padding: 0, fontSize: 12 }}>
                  {val.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
