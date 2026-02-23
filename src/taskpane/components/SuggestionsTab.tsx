import React, { useState } from "react";
import { Button, Spinner, Text, Badge } from "@fluentui/react-components";
import { useStore } from "../store";
import type { Suggestion } from "../types";

const typeLabels: Record<string, string> = {
  completion: "Vervollständigung",
  expansion: "Erweiterung",
  transition: "Überleitung",
  summary: "Zusammenfassung",
  counterargument: "Gegenargument",
};

export function SuggestionsTab() {
  const { loading } = useStore();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const handleSuggest = async () => {
    // Will be wired up in Phase 8
  };

  const handleInsert = async (text: string) => {
    // Will insert at cursor via wordApi in Phase 10
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Button appearance="primary" onClick={handleSuggest} disabled={loading}>
        {loading ? <Spinner size="tiny" /> : "Vorschläge generieren"}
      </Button>

      <Text size={200} style={{ color: "#666" }}>
        Markieren Sie eine Stelle im Text, an der ein Vorschlag eingefügt werden soll.
      </Text>

      {suggestions.map((s, i) => (
        <div
          key={i}
          style={{
            padding: 8,
            background: "#fafafa",
            borderRadius: 4,
            border: "1px solid #e0e0e0",
          }}
        >
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
            <Badge color="brand" size="small">
              {typeLabels[s.type] || s.type}
            </Badge>
            <Text size={100} style={{ color: "#666" }}>
              {s.description}
            </Text>
          </div>
          <Text size={200} style={{ whiteSpace: "pre-wrap" }}>
            {s.text}
          </Text>
          <div style={{ marginTop: 6 }}>
            <Button size="small" appearance="subtle" onClick={() => handleInsert(s.text)}>
              Einfügen
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
