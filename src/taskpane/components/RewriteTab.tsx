import React, { useState, useEffect, useRef } from "react";
import { Button, Spinner, Text } from "@fluentui/react-components";
import { useStore } from "../store";
import { getSelection, replaceTextInDocument } from "../services/wordApi";
import { rewriteText } from "../modules/rewrite";
import { analyzeStyle, saveStyleProfile, loadStyleProfile } from "../modules/style";
import type { RewriteResult } from "../types";

type ViewState = "idle" | "loading" | "result" | "applied";

export function RewriteTab() {
  var { docInfo, loading, setLoading } = useStore();
  var [viewState, setViewState] = useState<ViewState>("idle");
  var [result, setResult] = useState<RewriteResult | null>(null);
  var [originalText, setOriginalText] = useState("");
  var [error, setError] = useState<string | null>(null);
  var [loadingStep, setLoadingStep] = useState("");
  var [selectionChanged, setSelectionChanged] = useState(false);

  // Track selection changes without resetting results
  var prevSelectedRef = useRef<number>(0);

  useEffect(function () {
    if (!docInfo) return;
    var currentWords = docInfo.selectedWords || 0;
    if (prevSelectedRef.current !== currentWords && prevSelectedRef.current > 0) {
      // Selection changed — show banner instead of resetting
      if (viewState === "result" || viewState === "applied") {
        setSelectionChanged(true);
      }
    }
    prevSelectedRef.current = currentWords;
  }, [docInfo]);

  var hasSelection = docInfo && docInfo.hasSelection;
  var wordCount = docInfo ? docInfo.selectedWords : 0;

  var handleRewrite = async function () {
    setLoading(true);
    setError(null);
    setResult(null);
    setViewState("loading");
    setSelectionChanged(false);

    try {
      var selText = await getSelection();
      if (!selText || selText.trim().length === 0) {
        setError("Kein Text markiert.");
        setViewState("idle");
        setLoading(false);
        return;
      }

      setOriginalText(selText);

      // Check if style profile exists; if not, run analysis first
      var stored = loadStyleProfile();
      if (!stored || !stored.profile) {
        setLoadingStep("Analysiere Schreibstil...");
        try {
          var styleResult = await analyzeStyle(selText);
          saveStyleProfile(styleResult.style_profile);
        } catch (_e) {
          // Style analysis failed — proceed without profile
        }
      }

      setLoadingStep("Schreibe um...");
      var rewriteResult = await rewriteText(selText);
      setResult(rewriteResult);
      setViewState("result");
    } catch (e) {
      setError((e as Error).message);
      setViewState("idle");
    }
    setLoading(false);
    setLoadingStep("");
  };

  var handleApply = async function () {
    if (!result) return;
    setLoading(true);
    try {
      var success = await replaceTextInDocument(originalText, result.rewritten_text);
      if (success) {
        setViewState("applied");
      } else {
        setError("Text konnte nicht ersetzt werden. Bitte markieren Sie den Text erneut.");
      }
    } catch (_e) {
      setError("Text konnte nicht ersetzt werden.");
    }
    setLoading(false);
  };

  var handleUndo = async function () {
    if (!result) return;
    setLoading(true);
    try {
      var success = await replaceTextInDocument(result.rewritten_text, originalText);
      if (success) {
        setViewState("result");
      }
    } catch (_e) {
      setError("R\u00fcckgangig konnte nicht ausgef\u00fchrt werden.");
    }
    setLoading(false);
  };

  var handleRegenerate = async function () {
    setLoading(true);
    setError(null);
    setViewState("loading");
    setLoadingStep("Schreibe um...");
    try {
      var rewriteResult = await rewriteText(originalText);
      setResult(rewriteResult);
      setViewState("result");
    } catch (e) {
      setError((e as Error).message);
      setViewState("idle");
    }
    setLoading(false);
    setLoadingStep("");
  };

  var handleRewriteNew = async function () {
    setSelectionChanged(false);
    handleRewrite();
  };

  // No profile indicator
  var hasProfile = false;
  try {
    var stored2 = loadStyleProfile();
    hasProfile = !!(stored2 && stored2.profile);
  } catch (_e) {
    // ignore
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Selection Changed Banner */}
      {selectionChanged && (
        <div style={{
          padding: "8px 12px",
          background: "#fff8e1",
          borderRadius: 8,
          border: "1px solid #ffe082",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 11, color: "#f57f17" }}>Auswahl ge\u00e4ndert</span>
          <button
            onClick={handleRewriteNew}
            disabled={loading}
            style={{
              background: "#f57f17",
              color: "white",
              border: "none",
              borderRadius: 6,
              padding: "3px 10px",
              fontSize: 10,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Neuen Text umschreiben
          </button>
        </div>
      )}

      {/* Idle: No selection */}
      {viewState === "idle" && !hasSelection && (
        <div style={{
          padding: 24,
          background: "white",
          borderRadius: 10,
          textAlign: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}>
          <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>&#9998;</div>
          <Text style={{ color: "#888", fontSize: 12 }}>
            Markieren Sie Text im Dokument, um ihn umzuschreiben
          </Text>
        </div>
      )}

      {/* Idle: Has selection */}
      {viewState === "idle" && hasSelection && (
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{
              fontSize: 11,
              padding: "2px 8px",
              background: "#e3f2fd",
              color: "#1565c0",
              borderRadius: 12,
              fontWeight: 600,
            }}>
              {wordCount} W\u00f6rter
            </span>
            {!hasProfile && (
              <span style={{
                fontSize: 10,
                padding: "2px 8px",
                background: "#fff3e0",
                color: "#e65100",
                borderRadius: 12,
              }}>
                Kein Stilprofil — wird automatisch erstellt
              </span>
            )}
          </div>
          <Button
            appearance="primary"
            onClick={handleRewrite}
            disabled={loading}
            style={{
              width: "100%",
              borderRadius: 8,
              fontWeight: 600,
              padding: "10px 0",
              fontSize: 14,
            }}
          >
            Umschreiben
          </Button>
        </div>
      )}

      {/* Loading */}
      {viewState === "loading" && (
        <div style={{
          ...cardStyle,
          textAlign: "center",
          padding: 24,
        }}>
          <Spinner size="small" />
          <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
            {loadingStep || "Verarbeite..."}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: 12, background: "#fde8e8", borderRadius: 8, border: "1px solid #f5c6c6" }}>
          <Text style={{ color: "#c62828", fontSize: 12 }}>{error}</Text>
        </div>
      )}

      {/* Result */}
      {(viewState === "result" || viewState === "applied") && result && (
        <>
          {/* Style Note (no profile warning) */}
          {result.style_note && (
            <div style={{
              padding: "8px 12px",
              background: "#fff3e0",
              borderRadius: 8,
              border: "1px solid #ffe0b2",
              fontSize: 11,
              color: "#e65100",
            }}>
              {result.style_note}
            </div>
          )}

          {/* Changes Summary */}
          <div style={{
            ...cardStyle,
            borderLeft: "4px solid #1976d2",
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#1976d2", marginBottom: 4 }}>
              \u00c4nderungen
            </div>
            <div style={{ fontSize: 12, color: "#333", lineHeight: 1.5 }}>
              {result.changes_summary}
            </div>
          </div>

          {/* Original Text */}
          <div style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 6 }}>Original</div>
            <div style={{
              fontSize: 12,
              color: "#666",
              lineHeight: 1.6,
              maxHeight: 200,
              overflowY: "auto",
              padding: "8px 10px",
              background: "#f5f5f5",
              borderRadius: 6,
              whiteSpace: "pre-wrap",
            }}>
              {originalText}
            </div>
          </div>

          {/* Rewritten Text */}
          <div style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#1565c0", marginBottom: 6 }}>Umgeschrieben</div>
            <div style={{
              fontSize: 12,
              color: "#333",
              lineHeight: 1.6,
              maxHeight: 300,
              overflowY: "auto",
              padding: "8px 10px",
              background: "#e3f2fd",
              borderRadius: 6,
              whiteSpace: "pre-wrap",
            }}>
              {result.rewritten_text}
            </div>
          </div>

          {/* Action Buttons */}
          {viewState === "result" && (
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                appearance="primary"
                onClick={handleApply}
                disabled={loading}
                style={{
                  flex: 2,
                  borderRadius: 8,
                  fontWeight: 600,
                  background: "#2e7d32",
                }}
              >
                {loading ? <Spinner size="tiny" /> : "\u00dcbernehmen"}
              </Button>
              <Button
                appearance="outline"
                onClick={handleRegenerate}
                disabled={loading}
                style={{
                  flex: 1,
                  borderRadius: 8,
                  fontWeight: 600,
                }}
              >
                Neu generieren
              </Button>
            </div>
          )}

          {/* Applied State */}
          {viewState === "applied" && (
            <div style={{
              ...cardStyle,
              background: "#e8f5e9",
              border: "1px solid #c8e6c9",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#2e7d32", marginBottom: 6 }}>
                &#10003; \u00dcbernommen
              </div>
              <button
                onClick={handleUndo}
                disabled={loading}
                style={{
                  background: "none",
                  border: "1px solid #a5d6a7",
                  borderRadius: 6,
                  padding: "4px 14px",
                  fontSize: 11,
                  color: "#2e7d32",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: 500,
                }}
              >
                {loading ? "..." : "R\u00fcckg\u00e4ngig"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

var cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 10,
  padding: "10px 14px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};
