import React, { useState } from "react";
import { Button, Spinner, Text } from "@fluentui/react-components";
import { useStore } from "../store";
import { analyzeStyle, saveStyleProfile, loadStyleProfile } from "../modules/style";
import { getSelection, extractDocument } from "../services/wordApi";
import type { StyleResult } from "../types";

const profileLabels: Record<string, string> = {
  formality: "Formalität",
  voice: "Stimme",
  sentence_length: "Satzlänge",
  complexity: "Komplexität",
  passive_tendency: "Passivtendenz",
  vocabulary_level: "Wortschatzniveau",
};

export function StyleTab() {
  const { loading, setLoading } = useStore();
  const [result, setResult] = useState<StyleResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);
    try {
      const selection = await getSelection();
      let text: string;
      if (selection && selection.trim().length > 0) {
        text = selection;
      } else {
        const paragraphs = await extractDocument();
        text = paragraphs.map((p) => p.text).join("\n\n");
      }
      const res = await analyzeStyle(text);
      setResult(res);
      // Persist the style profile for use by suggestions module
      saveStyleProfile(res.style_profile);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Button appearance="primary" onClick={handleAnalyze} disabled={loading}>
        {loading ? <Spinner size="tiny" /> : "Stil analysieren"}
      </Button>

      {error && <Text style={{ color: "#d32f2f" }}>{error}</Text>}

      {saved && (
        <Text size={200} style={{ color: "#4caf50" }}>
          Stilprofil gespeichert — wird für Vorschläge verwendet.
        </Text>
      )}

      {result && (
        <>
          <div style={{ padding: 8, background: "#fafafa", borderRadius: 4 }}>
            <Text weight="semibold" size={300}>
              Stilprofil
            </Text>
            <div style={{ marginTop: 8 }}>
              {Object.entries(result.style_profile)
                .filter(([key]) => key !== "preferred_connectors")
                .map(([key, val]) => (
                  <div
                    key={key}
                    style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}
                  >
                    <Text size={200}>{profileLabels[key] || key}</Text>
                    <Text size={200} weight="semibold">
                      {String(val)}
                    </Text>
                  </div>
                ))}
              <div style={{ marginTop: 4 }}>
                <Text size={200}>Bevorzugte Konnektoren: </Text>
                <Text size={200} weight="semibold">
                  {result.style_profile.preferred_connectors.join(", ")}
                </Text>
              </div>
            </div>
          </div>

          <div style={{ padding: 8, background: "#fafafa", borderRadius: 4 }}>
            <Text weight="semibold" size={300}>
              Konsistenz: {result.consistency.score}/100
            </Text>
            {result.consistency.deviations.map((d, i) => (
              <div key={i} style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                <strong>{d.location}:</strong> {d.issue}
                <br />
                Vorschlag: {d.suggestion}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
