/* global Word */

import React, { useState } from "react";
import { Button, Spinner, Text, Badge } from "@fluentui/react-components";
import { useStore } from "../store";
import { getSuggestions } from "../modules/suggestions";
import { loadStyleProfile } from "../modules/style";
import { insertAtCursor } from "../services/wordApi";
import type { Suggestion } from "../types";

const typeLabels: Record<string, string> = {
  completion: "Vervollständigung",
  expansion: "Erweiterung",
  transition: "Überleitung",
  summary: "Zusammenfassung",
  counterargument: "Gegenargument",
};

const typeColors: Record<string, string> = {
  completion: "#1565c0",
  expansion: "#6a1b9a",
  transition: "#00695c",
  summary: "#e65100",
  counterargument: "#c62828",
};

export function SuggestionsTab() {
  const { loading, setLoading } = useStore();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [insertedIndex, setInsertedIndex] = useState<number | null>(null);

  const handleSuggest = async () => {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setInsertedIndex(null);
    try {
      const { before, after } = await Word.run(async (ctx) => {
        const body = ctx.document.body;
        const sel = ctx.document.getSelection();
        const beforeRange = body.getRange("Start").expandTo(sel.getRange("Start"));
        const afterRange = sel.getRange("End").expandTo(body.getRange("End"));
        beforeRange.load("text");
        afterRange.load("text");
        await ctx.sync();
        const bWords = beforeRange.text.split(/\s+/);
        const aWords = afterRange.text.split(/\s+/);
        return {
          before: bWords.slice(-1000).join(" "),
          after: aWords.slice(0, 1000).join(" "),
        };
      });

      const profile = loadStyleProfile();
      const profileStr = profile ? JSON.stringify(profile) : "Neutral-akademisch";
      const res = await getSuggestions(before, after, profileStr);
      setSuggestions(res.suggestions || []);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  const handleInsert = async (text: string, index: number) => {
    try {
      await insertAtCursor(text);
      setInsertedIndex(index);
    } catch (e) {
      setError("Einfügen fehlgeschlagen: " + (e as Error).message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={cardStyle}>
        <Button appearance="primary" onClick={handleSuggest} disabled={loading} style={{ width: "100%", borderRadius: 8, fontWeight: 600 }}>
          {loading ? <Spinner size="tiny" /> : "Vorschläge generieren"}
        </Button>
        <div style={{ fontSize: 11, color: "#888", textAlign: "center", marginTop: 6 }}>
          Setzen Sie den Cursor an die gewünschte Stelle
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, background: "#fde8e8", borderRadius: 8, border: "1px solid #f5c6c6" }}>
          <Text style={{ color: "#c62828", fontSize: 12 }}>{error}</Text>
        </div>
      )}

      {suggestions.map((s, i) => (
        <div
          key={i}
          style={{
            ...cardStyle,
            borderLeft: `4px solid ${typeColors[s.type] || "#0f6cbd"}`,
            opacity: insertedIndex !== null && insertedIndex !== i ? 0.5 : 1,
            transition: "opacity 0.2s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Badge color="brand" size="small" style={{ fontSize: 10 }}>
              {typeLabels[s.type] || s.type}
            </Badge>
            <span style={{ fontSize: 11, color: "#888" }}>{s.description}</span>
          </div>
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.5,
              color: "#333",
              padding: "8px 10px",
              background: "#f8f9fa",
              borderRadius: 6,
              whiteSpace: "pre-wrap",
            }}
          >
            {s.text}
          </div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
            <Button
              size="small"
              appearance={insertedIndex === i ? "subtle" : "primary"}
              onClick={() => handleInsert(s.text, i)}
              disabled={insertedIndex === i}
              style={{ borderRadius: 6, fontSize: 11 }}
            >
              {insertedIndex === i ? "Eingefügt ✓" : "Einfügen"}
            </Button>
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
