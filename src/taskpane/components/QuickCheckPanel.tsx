import React, { useState, useEffect, useRef } from "react";
import { Button, Spinner } from "@fluentui/react-components";
import { useStore } from "../store";
import { getSelection, applyCorrection, replaceSelection } from "../services/wordApi";
import { checkGrammar } from "../modules/grammar";
import { rephraseText } from "../modules/rephrase";
import type { GrammarCorrection, RephraseVariant } from "../types";

interface QuickResult {
  corrections: GrammarCorrection[];
}

var STYLE_LABELS: Record<string, string> = {
  formal: "Formal",
  precise: "Pr\u00e4zise",
  elaborate: "Ausf\u00fchrlich",
};

var STYLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  formal: { bg: "#f3e8fd", text: "#7b1fa2", border: "#ce93d8" },
  precise: { bg: "#e8f0fe", text: "#1565c0", border: "#90caf9" },
  elaborate: { bg: "#fce4ec", text: "#c62828", border: "#ef9a9a" },
};

export function QuickCheckPanel() {
  var { docInfo, mode, loading, setLoading } = useStore();
  var [result, setResult] = useState<QuickResult | null>(null);
  var [applied, setApplied] = useState<Record<number, boolean>>({});
  var [error, setError] = useState<string | null>(null);
  var [running, setRunning] = useState(false);

  // Rephrase state
  var [rephraseVariants, setRephraseVariants] = useState<RephraseVariant[] | null>(null);
  var [rephraseRunning, setRephraseRunning] = useState(false);
  var [rephraseError, setRephraseError] = useState<string | null>(null);
  var [appliedVariant, setAppliedVariant] = useState<number | null>(null);

  // Track previous selectedWords to detect selection change
  var prevSelectedRef = useRef<number>(0);

  // Reset all results when the selection changes
  useEffect(function () {
    if (!docInfo) return;
    var currentWords = docInfo.selectedWords || 0;
    if (prevSelectedRef.current !== currentWords) {
      // Selection changed — clear old results
      if (prevSelectedRef.current > 0) {
        setResult(null);
        setApplied({});
        setError(null);
        setRephraseVariants(null);
        setRephraseError(null);
        setAppliedVariant(null);
      }
      prevSelectedRef.current = currentWords;
    }
  }, [docInfo]);

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

      var corrections = await checkGrammar(selText, mode);
      setResult({ corrections: corrections });
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

  var handleRephrase = async function () {
    setRephraseRunning(true);
    setLoading(true);
    setRephraseError(null);
    setRephraseVariants(null);
    setAppliedVariant(null);
    try {
      var selText = await getSelection();
      if (!selText || selText.trim().length === 0) {
        setRephraseError("Kein Text markiert.");
        setRephraseRunning(false);
        setLoading(false);
        return;
      }

      var rephraseResult = await rephraseText(selText);
      setRephraseVariants(rephraseResult.variants);
    } catch (e) {
      setRephraseError((e as Error).message);
    }
    setRephraseRunning(false);
    setLoading(false);
  };

  var handleApplyVariant = async function (variant: RephraseVariant, index: number) {
    try {
      var success = await replaceSelection(variant.text);
      if (success) {
        setAppliedVariant(index);
      }
    } catch (_e) {
      setRephraseError("Text konnte nicht ersetzt werden. Bitte markieren Sie den Text erneut.");
    }
  };

  return (
    <div style={{ margin: "0 12px 8px", background: "#f0f7ff", borderRadius: 10, border: "1px solid #bbdefb", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#1565c0" }}>Schnell-Check</div>
          <div style={{ fontSize: 10, color: "#888" }}>{docInfo.selectedWords} W&ouml;rter markiert</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={handleRephrase}
            disabled={rephraseRunning || running || loading}
            style={{
              padding: "5px 10px",
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 8,
              border: "1px solid #ce93d8",
              background: rephraseRunning ? "#f3e8fd" : "#7b1fa2",
              color: rephraseRunning ? "#7b1fa2" : "white",
              cursor: (rephraseRunning || running || loading) ? "not-allowed" : "pointer",
              opacity: (rephraseRunning || running || loading) ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {rephraseRunning ? (
              <>
                <Spinner size="tiny" />
                <span>Formuliere...</span>
              </>
            ) : (
              "Umformulieren"
            )}
          </button>
          <Button
            appearance="primary"
            size="small"
            onClick={handleQuickCheck}
            disabled={running || rephraseRunning || loading}
            style={{ borderRadius: 8, fontWeight: 600 }}
          >
            {running ? <Spinner size="tiny" /> : "Grammatik-Check"}
          </Button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "6px 12px", background: "#fde8e8", fontSize: 11, color: "#c62828" }}>
          {error}
        </div>
      )}

      {rephraseError && (
        <div style={{ padding: "6px 12px", background: "#fde8e8", fontSize: 11, color: "#c62828" }}>
          {rephraseError}
        </div>
      )}

      {/* Rephrase Variants */}
      {rephraseVariants && rephraseVariants.length > 0 && (
        <div style={{ padding: "0 12px 10px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#7b1fa2", marginBottom: 6 }}>
            Varianten
          </div>
          {rephraseVariants.map(function (variant, i) {
            var isAppliedV = appliedVariant === i;
            var isOtherApplied = appliedVariant !== null && appliedVariant !== i;
            var colors = STYLE_COLORS[variant.style] || STYLE_COLORS.formal;
            var label = STYLE_LABELS[variant.style] || variant.style;
            var previewText = variant.text.length > 180
              ? variant.text.slice(0, 180) + "..."
              : variant.text;

            return (
              <div key={i} style={{
                padding: "8px 10px",
                marginBottom: 6,
                background: isAppliedV ? "#e8f5e9" : isOtherApplied ? "#fafafa" : "white",
                borderRadius: 8,
                border: "1px solid " + (isAppliedV ? "#a5d6a7" : isOtherApplied ? "#eee" : colors.border),
                opacity: isOtherApplied ? 0.5 : 1,
                transition: "opacity 0.2s",
              }}>
                {/* Badge + Apply Button Row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 10,
                    background: isAppliedV ? "#c8e6c9" : colors.bg,
                    color: isAppliedV ? "#2e7d32" : colors.text,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}>
                    {isAppliedV ? "\u2713 \u00dcbernommen" : label}
                  </span>
                  {!isAppliedV && !isOtherApplied && (
                    <button
                      onClick={function () { handleApplyVariant(variant, i); }}
                      style={{
                        background: "#7b1fa2",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        padding: "3px 10px",
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {"\u00dcbernehmen"}
                    </button>
                  )}
                </div>

                {/* Preview text */}
                <div style={{
                  fontSize: 11,
                  color: isOtherApplied ? "#bbb" : "#333",
                  lineHeight: 1.5,
                  marginBottom: 4,
                }}>
                  {previewText}
                </div>

                {/* Description of changes */}
                {variant.description && (
                  <div style={{
                    fontSize: 9,
                    color: isOtherApplied ? "#ccc" : "#888",
                    fontStyle: "italic",
                  }}>
                    {variant.description}
                  </div>
                )}
              </div>
            );
          })}

          {/* Reset button after applying */}
          {appliedVariant !== null && (
            <button
              onClick={function () {
                setRephraseVariants(null);
                setAppliedVariant(null);
              }}
              style={{
                background: "none",
                border: "none",
                color: "#7b1fa2",
                fontSize: 10,
                cursor: "pointer",
                padding: "4px 0",
                fontWeight: 500,
              }}
            >
              Erneut umformulieren
            </button>
          )}
        </div>
      )}

      {/* Grammar Results */}
      {result && (
        <div style={{ padding: "0 12px 10px" }}>
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
                      <span style={{ fontSize: 11, color: "#333" }}> &rarr; </span>
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
        </div>
      )}
    </div>
  );
}
