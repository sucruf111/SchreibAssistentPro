import React, { useState } from "react";
import { Button, Spinner, Badge } from "@fluentui/react-components";
import { useStore } from "../store";
import { getSelection, applyCorrection } from "../services/wordApi";
import { checkGrammar } from "../modules/grammar";
import { proofread } from "../modules/proofread";
import type { GrammarCorrection, ProofreadResult } from "../types";

interface QuickResult {
  corrections: GrammarCorrection[];
  proofreadResult: ProofreadResult | null;
}

export function QuickCheckPanel() {
  var { docInfo, mode, discipline, loading, setLoading } = useStore();
  var [result, setResult] = useState<QuickResult | null>(null);
  var [applied, setApplied] = useState<Record<number, boolean>>({});
  var [error, setError] = useState<string | null>(null);
  var [running, setRunning] = useState(false);

  if (!docInfo || !docInfo.hasSelection) return null;

  var handleQuickCheck = async function () {
    setRunning(true);
    setLoading(true);
    setError(null);
    setResult(null);
    setApplied({});
    try {
      var selText = await getSelection();
      if (!selText || selText.trim().length === 0) {
        setError("Kein Text markiert.");
        setRunning(false);
        setLoading(false);
        return;
      }

      // Run Grammar + Proofread in sequence (avoid 429)
      var corrections = await checkGrammar(selText, mode);

      // Small delay to avoid rate limit
      await new Promise(function (resolve) { setTimeout(resolve, 1500); });

      var proofResult: ProofreadResult | null = null;
      try {
        proofResult = await proofread(selText, discipline);
      } catch (_e) {
        // Proofread optional, grammar is the priority
      }

      setResult({ corrections: corrections, proofreadResult: proofResult });
    } catch (e) {
      setError((e as Error).message);
    }
    setRunning(false);
    setLoading(false);
  };

  var handleApply = async function (c: GrammarCorrection, index: number) {
    try {
      var success = await applyCorrection(c.original, c.suggestion);
      if (success) {
        var newApplied: Record<number, boolean> = {};
        for (var k in applied) { newApplied[k] = applied[k]; }
        newApplied[index] = true;
        setApplied(newApplied);
      }
    } catch (_e) { /* ignore */ }
  };

  return (
    <div style={{ margin: "0 12px 8px", background: "#f0f7ff", borderRadius: 10, border: "1px solid #bbdefb", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#1565c0" }}>Schnell-Check</div>
          <div style={{ fontSize: 10, color: "#888" }}>{docInfo.selectedWords} Wörter markiert</div>
        </div>
        <Button
          appearance="primary"
          size="small"
          onClick={handleQuickCheck}
          disabled={running || loading}
          style={{ borderRadius: 8, fontWeight: 600 }}
        >
          {running ? <Spinner size="tiny" /> : "Komplett-Check"}
        </Button>
      </div>

      {error && (
        <div style={{ padding: "6px 12px", background: "#fde8e8", fontSize: 11, color: "#c62828" }}>
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{ padding: "0 12px 10px" }}>
          {/* Grammar Summary */}
          {result.corrections.length > 0 ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#333", marginBottom: 4 }}>
                Grammatik: {result.corrections.length} Korrektur{result.corrections.length > 1 ? "en" : ""}
              </div>
              {result.corrections.map(function (c, i) {
                var isApplied = applied[i] === true;
                return (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 8px",
                    marginBottom: 3,
                    background: isApplied ? "#e8f5e9" : "white",
                    borderRadius: 6,
                    border: "1px solid " + (isApplied ? "#c8e6c9" : "#eee"),
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 11, color: "#999", textDecoration: "line-through" }}>{c.original}</span>
                      <span style={{ fontSize: 11, color: "#333" }}> → </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#2e7d32" }}>{c.suggestion}</span>
                    </div>
                    {!isApplied && (
                      <button
                        onClick={function () { handleApply(c, i); }}
                        style={{
                          background: "#2e7d32",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          padding: "2px 6px",
                          fontSize: 9,
                          fontWeight: 600,
                          cursor: "pointer",
                          marginLeft: 6,
                          flexShrink: 0,
                        }}
                      >
                        Fix
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "#2e7d32", fontWeight: 500, marginBottom: 6 }}>
              &#10003; Keine Grammatikfehler
            </div>
          )}

          {/* Proofread Summary */}
          {result.proofreadResult && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#333", marginBottom: 4 }}>
                Lektorat: {result.proofreadResult.overall_score}/100
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["structure", "argumentation", "precision", "conventions", "formal"].map(function (key) {
                  var scores = result && result.proofreadResult && result.proofreadResult.scores;
                  if (!scores) return null;
                  var s = (scores as any)[key];
                  if (!s) return null;
                  var color = s.score >= 80 ? "#2e7d32" : s.score >= 60 ? "#f57c00" : "#d32f2f";
                  return (
                    <div key={key} style={{ textAlign: "center", flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: color }}>{s.score}</div>
                      <div style={{ fontSize: 8, color: "#888" }}>{key.slice(0, 4)}.</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
