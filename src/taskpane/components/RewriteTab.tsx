import React, { useState, useEffect, useRef } from "react";
import { Button, Spinner, Text } from "@fluentui/react-components";
import { useStore } from "../store";
import { getSelection, replaceTextInDocument } from "../services/wordApi";
import { rewriteText } from "../modules/rewrite";
import { analyzeStyle, saveStyleProfile, loadStyleProfile } from "../modules/style";
import type { RewriteResult } from "../types";

type ViewState = "idle" | "loading" | "result" | "applied";

// ---- Simple word-level diff ----

interface DiffSegment {
  type: "equal" | "added" | "removed";
  text: string;
}

function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
  var oldWords = oldText.split(/(\s+)/);
  var newWords = newText.split(/(\s+)/);

  // Build LCS table
  var m = oldWords.length;
  var n = newWords.length;

  // For very long texts, fall back to simple display
  if (m * n > 500000) {
    return [
      { type: "removed", text: oldText },
      { type: "added", text: newText },
    ];
  }

  var dp: number[][] = [];
  for (var i = 0; i <= m; i++) {
    dp[i] = [];
    for (var j = 0; j <= n; j++) {
      dp[i][j] = 0;
    }
  }
  for (var i2 = 1; i2 <= m; i2++) {
    for (var j2 = 1; j2 <= n; j2++) {
      if (oldWords[i2 - 1] === newWords[j2 - 1]) {
        dp[i2][j2] = dp[i2 - 1][j2 - 1] + 1;
      } else {
        dp[i2][j2] = dp[i2 - 1][j2] > dp[i2][j2 - 1] ? dp[i2 - 1][j2] : dp[i2][j2 - 1];
      }
    }
  }

  // Backtrack to build diff
  var segments: DiffSegment[] = [];
  var oi = m;
  var ni = n;
  var raw: Array<{ type: "equal" | "added" | "removed"; word: string }> = [];

  while (oi > 0 || ni > 0) {
    if (oi > 0 && ni > 0 && oldWords[oi - 1] === newWords[ni - 1]) {
      raw.push({ type: "equal", word: oldWords[oi - 1] });
      oi--;
      ni--;
    } else if (ni > 0 && (oi === 0 || dp[oi][ni - 1] >= dp[oi - 1][ni])) {
      raw.push({ type: "added", word: newWords[ni - 1] });
      ni--;
    } else {
      raw.push({ type: "removed", word: oldWords[oi - 1] });
      oi--;
    }
  }

  raw.reverse();

  // Merge consecutive segments of the same type
  for (var k = 0; k < raw.length; k++) {
    var item = raw[k];
    if (segments.length > 0 && segments[segments.length - 1].type === item.type) {
      segments[segments.length - 1].text += item.word;
    } else {
      segments.push({ type: item.type, text: item.word });
    }
  }

  return segments;
}

function countChanges(segments: DiffSegment[]): number {
  var count = 0;
  for (var i = 0; i < segments.length; i++) {
    if (segments[i].type !== "equal") count++;
  }
  // Each removed+added pair counts as 1 change
  return Math.ceil(count / 2);
}

// ---- Component ----

export function RewriteTab() {
  var { docInfo, loading, setLoading } = useStore();
  var [viewState, setViewState] = useState<ViewState>("idle");
  var [result, setResult] = useState<RewriteResult | null>(null);
  var [originalText, setOriginalText] = useState("");
  var [error, setError] = useState<string | null>(null);
  var [loadingStep, setLoadingStep] = useState("");
  var [selectionChanged, setSelectionChanged] = useState(false);
  var [showFullOriginal, setShowFullOriginal] = useState(false);

  // Track selection changes without resetting results
  var prevSelectedRef = useRef<number>(0);

  useEffect(function () {
    if (!docInfo) return;
    var currentWords = docInfo.selectedWords || 0;
    if (prevSelectedRef.current !== currentWords && prevSelectedRef.current > 0) {
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
    setShowFullOriginal(false);

    try {
      var selText = await getSelection();
      if (!selText || selText.trim().length === 0) {
        setError("Kein Text markiert.");
        setViewState("idle");
        setLoading(false);
        return;
      }

      setOriginalText(selText);

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
    setShowFullOriginal(false);
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

  var hasProfile = false;
  try {
    var stored2 = loadStyleProfile();
    hasProfile = !!(stored2 && stored2.profile);
  } catch (_e) {
    // ignore
  }

  // Compute diff when result is available
  var diffSegments: DiffSegment[] = [];
  var changeCount = 0;
  if (result && originalText) {
    diffSegments = computeWordDiff(originalText, result.rewritten_text);
    changeCount = countChanges(diffSegments);
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#1976d2" }}>
                \u00c4nderungen
              </div>
              <span style={{
                fontSize: 10,
                padding: "1px 8px",
                background: "#e3f2fd",
                color: "#1565c0",
                borderRadius: 10,
                fontWeight: 600,
              }}>
                {changeCount} {changeCount === 1 ? "Stelle" : "Stellen"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#333", lineHeight: 1.5 }}>
              {result.changes_summary}
            </div>
          </div>

          {/* Inline Diff View */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#333" }}>Vorschau</div>
              <div style={{ display: "flex", gap: 8, fontSize: 9, color: "#888" }}>
                <span><span style={{ background: "#ffcdd2", padding: "0 3px", borderRadius: 2, textDecoration: "line-through" }}>entfernt</span></span>
                <span><span style={{ background: "#c8e6c9", padding: "0 3px", borderRadius: 2 }}>neu</span></span>
              </div>
            </div>
            <div style={{
              fontSize: 12,
              color: "#333",
              lineHeight: 1.8,
              maxHeight: 400,
              overflowY: "auto",
              padding: "8px 10px",
              background: "#fafafa",
              borderRadius: 6,
              whiteSpace: "pre-wrap",
            }}>
              {diffSegments.map(function (seg, i) {
                if (seg.type === "equal") {
                  return <span key={i}>{seg.text}</span>;
                }
                if (seg.type === "removed") {
                  return (
                    <span
                      key={i}
                      style={{
                        background: "#ffcdd2",
                        color: "#b71c1c",
                        textDecoration: "line-through",
                        borderRadius: 2,
                        padding: "0 1px",
                      }}
                    >
                      {seg.text}
                    </span>
                  );
                }
                // added
                return (
                  <span
                    key={i}
                    style={{
                      background: "#c8e6c9",
                      color: "#1b5e20",
                      borderRadius: 2,
                      padding: "0 1px",
                    }}
                  >
                    {seg.text}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Collapsible Full Original */}
          <div style={cardStyle}>
            <button
              onClick={function () { setShowFullOriginal(!showFullOriginal); }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                fontSize: 11,
                color: "#888",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 4,
                width: "100%",
              }}
            >
              <span style={{ fontSize: 10 }}>{showFullOriginal ? "\u25BC" : "\u25B6"}</span>
              Originaltext {showFullOriginal ? "ausblenden" : "anzeigen"}
            </button>
            {showFullOriginal && (
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
                marginTop: 8,
              }}>
                {originalText}
              </div>
            )}
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
