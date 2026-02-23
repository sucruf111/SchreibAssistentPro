import React, { useState } from "react";
import { Button, Spinner, Text } from "@fluentui/react-components";
import { useStore } from "../store";
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
  const { loading } = useStore();
  const [result, setResult] = useState<StyleResult | null>(null);

  const handleAnalyze = async () => {
    // Will be wired up in Phase 7
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Button appearance="primary" onClick={handleAnalyze} disabled={loading}>
        {loading ? <Spinner size="tiny" /> : "Stil analysieren"}
      </Button>

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
