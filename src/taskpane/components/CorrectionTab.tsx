import React, { useState } from "react";
import { Button, Spinner, Text, Badge } from "@fluentui/react-components";
import { useStore } from "../store";
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
  const { loading } = useStore();
  const [corrections, setCorrections] = useState<GrammarCorrection[]>([]);
  const [hasRun, setHasRun] = useState(false);

  const handleCheck = async () => {
    // Will be wired up in Phase 4
    setHasRun(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Button appearance="primary" onClick={handleCheck} disabled={loading}>
        {loading ? <Spinner size="tiny" /> : "Text prüfen"}
      </Button>

      {hasRun && corrections.length === 0 && (
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
