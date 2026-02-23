import React, { useState } from "react";
import { Button, Spinner, Text, Badge, Switch, Label } from "@fluentui/react-components";
import { useStore } from "../store";
import { checkGrammar } from "../modules/grammar";
import { getSelection, extractDocument, markErrors, clearAnnotations } from "../services/wordApi";
import { chunkDocument } from "../services/chunker";
import { analyzeChunks } from "../modules/analyzeChunks";
import { GRAMMAR_PROMPT, GRAMMAR_MODE_EXTRA } from "../services/prompts";
import { ChunkProgress } from "./ChunkProgress";
import type { GrammarCorrection } from "../types";

const severityColor: Record<string, "danger" | "warning" | "informative"> = {
  error: "danger",
  warning: "warning",
  info: "informative",
};

const typeLabels: Record<string, string> = {
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
  const { loading, setLoading, mode, setProgress, correctionsEnabled, setCorrectionsEnabled } = useStore();
  const [corrections, setCorrections] = useState<GrammarCorrection[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (checked: boolean) => {
    setCorrectionsEnabled(checked);
    if (!checked) {
      await clearAnnotations();
    } else if (corrections.length > 0) {
      await markErrors(corrections);
    }
  };

  const handleCheck = async () => {
    setLoading(true);
    setError(null);
    setCorrections([]);
    try {
      await clearAnnotations();

      const selection = await getSelection();
      if (selection && selection.trim().length > 0) {
        const results = await checkGrammar(selection, mode);
        setCorrections(results);
        if (results.length > 0) await markErrors(results, correctionsEnabled);
      } else {
        const paragraphs = await extractDocument();
        const totalWords = paragraphs.reduce((s, p) => s + p.wordCount, 0);

        if (totalWords < 4000) {
          const fullText = paragraphs.map((p) => p.text).join("\n\n");
          const results = await checkGrammar(fullText, mode);
          setCorrections(results);
          if (results.length > 0) await markErrors(results, correctionsEnabled);
        } else {
          const { chunks, meta } = chunkDocument(paragraphs);
          const systemPrompt = GRAMMAR_PROMPT + (GRAMMAR_MODE_EXTRA[mode] || "");
          const chunkResults = await analyzeChunks(
            chunks, meta, "grammar", systemPrompt,
            (done, total) => setProgress({ done, total })
          );
          setProgress(null);

          const all: GrammarCorrection[] = [];
          for (const r of chunkResults.values()) {
            if (r.corrections) all.push(...r.corrections);
          }
          setCorrections(all);
          if (all.length > 0) await markErrors(all, correctionsEnabled);
        }
      }
      setHasRun(true);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  const errorCount = corrections.filter((c) => c.severity === "error").length;
  const warnCount = corrections.filter((c) => c.severity === "warning").length;
  const infoCount = corrections.filter((c) => c.severity === "info").length;

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
            <Switch checked={correctionsEnabled} onChange={(_, data) => handleToggle(data.checked)} />
          </div>
        </div>
      </div>

      <ChunkProgress />

      {error && (
        <div style={{ padding: 12, background: "#fde8e8", borderRadius: 8, border: "1px solid #f5c6c6" }}>
          <Text style={{ color: "#c62828", fontSize: 12 }}>{error}</Text>
        </div>
      )}

      {/* Summary Stats */}
      {hasRun && !error && corrections.length > 0 && (
        <div style={{ ...cardStyle, display: "flex", gap: 0 }}>
          {[
            { count: errorCount, label: "Fehler", color: "#d32f2f" },
            { count: warnCount, label: "Warnungen", color: "#f57c00" },
            { count: infoCount, label: "Hinweise", color: "#1976d2" },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <div style={{ width: 1, background: "#eee" }} />}
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.count}</div>
                <div style={{ fontSize: 10, color: "#888" }}>{s.label}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      {hasRun && !error && corrections.length === 0 && (
        <div style={{ padding: 20, background: "#e8f5e9", borderRadius: 10, textAlign: "center", border: "1px solid #c8e6c9" }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>&#10003;</div>
          <Text style={{ color: "#2e7d32", fontWeight: 600 }}>Keine Fehler gefunden!</Text>
        </div>
      )}

      {/* Correction Cards */}
      {corrections.map((c, i) => (
        <div
          key={i}
          style={{
            ...cardStyle,
            borderLeft: `4px solid ${c.severity === "error" ? "#d32f2f" : c.severity === "warning" ? "#f57c00" : "#1976d2"}`,
          }}
        >
          <Badge color={severityColor[c.severity]} size="small" style={{ fontSize: 10, marginBottom: 8 }}>
            {typeLabels[c.type] || c.type}
          </Badge>
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
      ))}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 10,
  padding: "10px 14px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};
