import React, { useState } from "react";
import { Button, Spinner, Text } from "@fluentui/react-components";
import { useStore } from "../store";
import type { ProofreadResult } from "../types";

const categoryLabels: Record<string, string> = {
  structure: "Struktur",
  argumentation: "Argumentation",
  precision: "Präzision",
  conventions: "Konventionen",
  formal: "Formales",
};

export function ProofreadTab() {
  const { loading } = useStore();
  const [result, setResult] = useState<ProofreadResult | null>(null);

  const handleProofread = async () => {
    // Will be wired up in Phase 5
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Button appearance="primary" onClick={handleProofread} disabled={loading}>
        {loading ? <Spinner size="tiny" /> : "Wissenschaftliches Lektorat"}
      </Button>

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
