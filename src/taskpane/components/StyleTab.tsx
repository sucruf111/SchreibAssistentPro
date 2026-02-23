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

const profileIcons: Record<string, string> = {
  formality: "\uD83C\uDFF3",
  voice: "\uD83D\uDDE3",
  sentence_length: "\uD83D\uDCCF",
  complexity: "\uD83E\uDDE9",
  passive_tendency: "\uD83D\uDD04",
  vocabulary_level: "\uD83D\uDCDA",
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
      saveStyleProfile(res.style_profile);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={cardStyle}>
        <Button appearance="primary" onClick={handleAnalyze} disabled={loading} style={{ width: "100%", borderRadius: 8, fontWeight: 600 }}>
          {loading ? <Spinner size="tiny" /> : "Stil analysieren"}
        </Button>
      </div>

      {error && (
        <div style={{ padding: 12, background: "#fde8e8", borderRadius: 8, border: "1px solid #f5c6c6" }}>
          <Text style={{ color: "#c62828", fontSize: 12 }}>{error}</Text>
        </div>
      )}

      {saved && (
        <div style={{ padding: 10, background: "#e8f5e9", borderRadius: 8, border: "1px solid #c8e6c9", fontSize: 12, color: "#2e7d32", textAlign: "center" }}>
          Stilprofil gespeichert — wird für Vorschläge verwendet
        </div>
      )}

      {result && (
        <>
          {/* Style Profile */}
          <div style={cardStyle}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Stilprofil</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(result.style_profile)
                .filter(([key]) => key !== "preferred_connectors")
                .map(([key, val]) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 10px",
                      background: "#f8f9fa",
                      borderRadius: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12 }}>{profileIcons[key] || ""}</span>
                      <span style={{ fontSize: 12, color: "#555" }}>{profileLabels[key] || key}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#333" }}>{String(val)}</span>
                  </div>
                ))}
            </div>
            {result.style_profile.preferred_connectors?.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Bevorzugte Konnektoren</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {result.style_profile.preferred_connectors.map((c, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        background: "#e3f2fd",
                        color: "#1565c0",
                        borderRadius: 12,
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Consistency Score */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Konsistenz</div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: result.consistency.score >= 70 ? "#e8f5e9" : "#fff3e0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `2px solid ${result.consistency.score >= 70 ? "#4caf50" : "#ff9800"}`,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: result.consistency.score >= 70 ? "#2e7d32" : "#e65100" }}>
                  {result.consistency.score}
                </span>
              </div>
            </div>
            {result.consistency.deviations.map((d, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 10px",
                  background: "#fffde7",
                  borderRadius: 6,
                  marginTop: 6,
                  borderLeft: "3px solid #ff9800",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 500 }}>{d.location}</div>
                <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{d.issue}</div>
                <div style={{ fontSize: 11, color: "#2e7d32", marginTop: 2 }}>Vorschlag: {d.suggestion}</div>
              </div>
            ))}
          </div>
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
