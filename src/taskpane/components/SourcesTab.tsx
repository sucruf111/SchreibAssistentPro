import React, { useState } from "react";
import { Button, Spinner, Text, Badge } from "@fluentui/react-components";
import { useStore } from "../store";
import type { LegitimacyResult } from "../types";

const statusColor: Record<string, "success" | "warning" | "danger"> = {
  ok: "success",
  warning: "warning",
  error: "danger",
};

export function SourcesTab() {
  const { loading } = useStore();
  const [result, setResult] = useState<LegitimacyResult | null>(null);

  const handleCheck = async () => {
    // Will be wired up in Phase 6
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Button appearance="primary" onClick={handleCheck} disabled={loading}>
        {loading ? <Spinner size="tiny" /> : "Quellen prüfen"}
      </Button>

      {result && (
        <>
          <div style={{ padding: 8, background: "#fafafa", borderRadius: 4 }}>
            <Text size={200}>
              Erkannter Stil: <strong>{result.overall.style_detected}</strong>
            </Text>
            <br />
            <Text size={200}>
              Konsistenz: <strong>{result.overall.consistency_score}/100</strong>
            </Text>
          </div>

          {result.citations.map((c, i) => (
            <div
              key={i}
              style={{
                padding: 8,
                borderLeft: `3px solid ${c.status === "ok" ? "#4caf50" : c.status === "warning" ? "#ffc107" : "#d32f2f"}`,
                background: "#fafafa",
                borderRadius: 4,
              }}
            >
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                <Badge color={statusColor[c.status]} size="small">
                  {c.status === "ok" ? "OK" : c.status === "warning" ? "Warnung" : "Fehler"}
                </Badge>
              </div>
              <Text size={200} style={{ fontStyle: "italic" }}>
                {c.text}
              </Text>
              {c.issues.map((issue, j) => (
                <div key={j} style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                  <strong>{issue.type}:</strong> {issue.description}
                  {issue.suggestion && (
                    <>
                      <br />
                      Vorschlag: {issue.suggestion}
                    </>
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
