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

      // Try selection first, fall back to full document
      const selection = await getSelection();
      if (selection && selection.trim().length > 0) {
        const results = await checkGrammar(selection, mode);
        setCorrections(results);
        if (results.length > 0) await markErrors(results, correctionsEnabled);
      } else {
        // Full document — may need chunking
        const paragraphs = await extractDocument();
        const totalWords = paragraphs.reduce((s, p) => s + p.wordCount, 0);

        if (totalWords < 4000) {
          const fullText = paragraphs.map((p) => p.text).join("\n\n");
          const results = await checkGrammar(fullText, mode);
          setCorrections(results);
          if (results.length > 0) await markErrors(results, correctionsEnabled);
        } else {
          // Large doc: chunk + parallel
          const { chunks, meta } = chunkDocument(paragraphs);
          const systemPrompt = GRAMMAR_PROMPT + (GRAMMAR_MODE_EXTRA[mode] || "");
          const chunkResults = await analyzeChunks(
            chunks,
            meta,
            "grammar",
            systemPrompt,
            (done, total) => setProgress({ done, total })
          );
          setProgress(null);

          // Merge all corrections
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Button appearance="primary" onClick={handleCheck} disabled={loading}>
          {loading ? <Spinner size="tiny" /> : "Text prüfen"}
        </Button>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Label size="small">Korrekturen</Label>
          <Switch
            checked={correctionsEnabled}
            onChange={(_, data) => handleToggle(data.checked)}
          />
        </div>
      </div>

      <ChunkProgress />

      {error && (
        <Text style={{ color: "#d32f2f" }}>{error}</Text>
      )}

      {hasRun && !error && corrections.length === 0 && (
        <Text style={{ color: "green" }}>Keine Fehler gefunden.</Text>
      )}

      {corrections.map((c, i) => (
        <div
          key={i}
          style={{
            padding: 8,
            borderLeft: `3px solid ${c.severity === "error" ? "#d32f2f" : c.severity === "warning" ? "#ffc107" : "#2196f3"}`,
            background: "#fafafa",
            borderRadius: 4,
          }}
        >
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
            <Badge color={severityColor[c.severity]} size="small">
              {typeLabels[c.type] || c.type}
            </Badge>
          </div>
          <Text size={200} style={{ textDecoration: "line-through", color: "#999" }}>
            {c.original}
          </Text>
          <br />
          <Text size={200} weight="semibold">
            {c.suggestion}
          </Text>
          <br />
          <Text size={100} style={{ color: "#666", marginTop: 4 }}>
            {c.explanation}
          </Text>
        </div>
      ))}
    </div>
  );
}
