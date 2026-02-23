import React, { useState } from "react";
import { Button, Spinner, Text, Badge } from "@fluentui/react-components";
import { useStore } from "../store";
import { checkLegitimacy } from "../modules/legitimacy";
import { getSelection, extractDocument } from "../services/wordApi";
import type { LegitimacyResult } from "../types";

const statusColor: Record<string, "success" | "warning" | "danger"> = {
  ok: "success",
  warning: "warning",
  error: "danger",
};

const statusLabel: Record<string, string> = {
  ok: "OK",
  warning: "Warnung",
  error: "Fehler",
};

export function SourcesTab() {
  const { loading, setLoading, citationStyle } = useStore();
  const [result, setResult] = useState<LegitimacyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const selection = await getSelection();
      let text: string;
      if (selection && selection.trim().length > 0) {
        text = selection;
      } else {
        const paragraphs = await extractDocument();
        text = paragraphs.map((p) => p.text).join("\n\n");
      }
      const res = await checkLegitimacy(text, citationStyle);
      setResult(res);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  const okCount = result?.citations.filter((c) => c.status === "ok").length || 0;
  const issueCount = result?.citations.filter((c) => c.status !== "ok").length || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={cardStyle}>
        <Button appearance="primary" onClick={handleCheck} disabled={loading} style={{ width: "100%", borderRadius: 8, fontWeight: 600 }}>
          {loading ? <Spinner size="tiny" /> : "Quellen prüfen"}
        </Button>
      </div>

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
                  border: `2px solid ${result.overall.consistency_score >= 70 ? "#4caf50" : "#ff9800"}`,
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
          {result.citations.map((c, i) => (
            <div
              key={i}
              style={{
                ...cardStyle,
                borderLeft: `4px solid ${c.status === "ok" ? "#4caf50" : c.status === "warning" ? "#ff9800" : "#d32f2f"}`,
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
              {c.issues.map((issue, j) => (
                <div key={j} style={{ fontSize: 11, padding: "4px 0", borderTop: j > 0 ? "1px solid #f0f0f0" : "none" }}>
                  <span style={{ fontWeight: 600, color: "#555" }}>{issue.type}:</span>{" "}
                  <span style={{ color: "#666" }}>{issue.description}</span>
                  {issue.suggestion && (
                    <div style={{ color: "#2e7d32", marginTop: 2, fontSize: 11 }}>
                      Vorschlag: {issue.suggestion}
                    </div>
                  )}
                </div>
              ))}
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
