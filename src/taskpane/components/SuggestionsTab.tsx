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

export function SuggestionsTab() {
  const { loading, setLoading } = useStore();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = async () => {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    try {
      // Get text before and after cursor position
      const { before, after } = await Word.run(async (ctx) => {
        const body = ctx.document.body;
        const sel = ctx.document.getSelection();
        // Range from body start to selection start
        const beforeRange = body.getRange("Start").expandTo(sel.getRange("Start"));
        // Range from selection end to body end
        const afterRange = sel.getRange("End").expandTo(body.getRange("End"));
        beforeRange.load("text");
        afterRange.load("text");
        await ctx.sync();
        // Limit context to ~1000 words each side
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

  const handleInsert = async (text: string) => {
    try {
      await insertAtCursor(text);
    } catch (e) {
      setError("Einfügen fehlgeschlagen: " + (e as Error).message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Button appearance="primary" onClick={handleSuggest} disabled={loading}>
        {loading ? <Spinner size="tiny" /> : "Vorschläge generieren"}
      </Button>

      <Text size={200} style={{ color: "#666" }}>
        Setzen Sie den Cursor an die Stelle, an der ein Vorschlag eingefügt werden soll.
      </Text>

      {error && <Text style={{ color: "#d32f2f" }}>{error}</Text>}

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
