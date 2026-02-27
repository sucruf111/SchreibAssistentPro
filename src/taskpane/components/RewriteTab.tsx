import React, { useState, useEffect, useRef } from "react";
import { Button, Spinner, Text } from "@fluentui/react-components";
import { useStore } from "../store";
import { getSelection, applyCorrection } from "../services/wordApi";
import { rewriteText } from "../modules/rewrite";
import { analyzeStyle, saveStyleProfile, loadStyleProfile } from "../modules/style";
import type { RewriteResult, RewriteChange } from "../types";
import { useHoverHighlight } from "../hooks/useHoverHighlight";

type ViewState = "idle" | "loading" | "result" | "applied";

export function RewriteTab() {
  var { docInfo, loading, setLoading } = useStore();
  var [viewState, setViewState] = useState<ViewState>("idle");
  var [result, setResult] = useState<RewriteResult | null>(null);
  var [originalText, setOriginalText] = useState("");
  var [error, setError] = useState<string | null>(null);
  var [loadingStep, setLoadingStep] = useState("");
  var [selectionChanged, setSelectionChanged] = useState(false);
  var [appliedChanges, setAppliedChanges] = useState<Record<number, boolean>>({});
  var [applyingAll, setApplyingAll] = useState(false);
  var [applyProgress, setApplyProgress] = useState({ done: 0, total: 0 });
  var hover = useHoverHighlight();

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
    setAppliedChanges({});

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
          // proceed without profile
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

  var handleApplySingle = async function (change: RewriteChange, index: number) {
    try {
      var ok = await applyCorrection(change.original, change.replacement);
      if (ok) {
        var next: Record<number, boolean> = {};
        for (var k in appliedChanges) { next[k] = appliedChanges[k]; }
        next[index] = true;
        setAppliedChanges(next);
      } else {
        setError("\"" + change.original.slice(0, 40) + "...\" wurde nicht im Dokument gefunden.");
        setTimeout(function () { setError(null); }, 4000);
      }
    } catch (_e) {
      setError("Änderung konnte nicht angewendet werden.");
      setTimeout(function () { setError(null); }, 4000);
    }
  };

  var handleApplyAll = async function () {
    if (!result || !result.changes) return;
    setApplyingAll(true);
    setError(null);
    var total = result.changes.filter(function (_, i) { return !appliedChanges[i]; }).length;
    setApplyProgress({ done: 0, total: total });

    var next: Record<number, boolean> = {};
    for (var k in appliedChanges) { next[k] = appliedChanges[k]; }
    var doneCount = 0;

    for (var i = 0; i < result.changes.length; i++) {
      if (next[i]) continue;
      var ch = result.changes[i];
      try {
        var ok = await applyCorrection(ch.original, ch.replacement);
        if (ok) {
          next[i] = true;
        }
      } catch (_e) {
        // skip
      }
      doneCount++;
      setApplyProgress({ done: doneCount, total: total });
      // Real-time update
      var snapshot: Record<number, boolean> = {};
      for (var j in next) { snapshot[j] = next[j]; }
      setAppliedChanges(snapshot);
    }

    var allApplied = true;
    for (var ci = 0; ci < result.changes.length; ci++) {
      if (!next[ci]) { allApplied = false; break; }
    }
    if (allApplied) {
      setViewState("applied");
    }
    setApplyingAll(false);
  };

  var handleUndoAll = async function () {
    if (!result || !result.changes) return;
    setLoading(true);
    setError(null);
    var undone = 0;
    // Undo in reverse order
    for (var i = result.changes.length - 1; i >= 0; i--) {
      if (!appliedChanges[i]) continue;
      var ch = result.changes[i];
      try {
        var ok = await applyCorrection(ch.replacement, ch.original);
        if (ok) undone++;
      } catch (_e) {
        // skip
      }
    }
    if (undone > 0) {
      setAppliedChanges({});
      setViewState("result");
    } else {
      setError("R\u00fcckg\u00e4ngig konnte nicht ausgef\u00fchrt werden.");
    }
    setLoading(false);
  };

  var handleRegenerate = async function () {
    setLoading(true);
    setError(null);
    setViewState("loading");
    setLoadingStep("Schreibe um...");
    setAppliedChanges({});
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

  var appliedCount = Object.keys(appliedChanges).filter(function (k) { return appliedChanges[Number(k)]; }).length;
  var totalChanges = result && result.changes ? result.changes.length : 0;

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
          {/* Style Note */}
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

          {/* Changes Summary + Apply All */}
          <div style={{
            ...cardStyle,
            borderLeft: "4px solid #1976d2",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#1976d2" }}>
                {totalChanges} {totalChanges === 1 ? "\u00c4nderung" : "\u00c4nderungen"}
              </div>
              {appliedCount > 0 && (
                <span style={{
                  fontSize: 10,
                  padding: "1px 8px",
                  background: "#e8f5e9",
                  color: "#2e7d32",
                  borderRadius: 10,
                  fontWeight: 600,
                }}>
                  {appliedCount}/{totalChanges} \u00fcbernommen
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#333", lineHeight: 1.5, marginBottom: 8 }}>
              {result.changes_summary}
            </div>
            {viewState === "result" && totalChanges > 0 && appliedCount < totalChanges && (
              <Button
                appearance="primary"
                onClick={handleApplyAll}
                disabled={loading || applyingAll}
                style={{ width: "100%", borderRadius: 8, fontWeight: 600, background: "#2e7d32" }}
              >
                {applyingAll ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Spinner size="tiny" />
                    <span>{applyProgress.done}/{applyProgress.total}...</span>
                  </span>
                ) : (
                  "Alle \u00fcbernehmen (" + (totalChanges - appliedCount) + " offen)"
                )}
              </Button>
            )}
            {viewState === "result" && appliedCount === totalChanges && totalChanges > 0 && (
              <div style={{ textAlign: "center", fontSize: 12, color: "#2e7d32", fontWeight: 600 }}>
                Alle \u00c4nderungen \u00fcbernommen!
              </div>
            )}
          </div>

          {/* Individual Change Cards */}
          {result.changes && result.changes.map(function (ch, i) {
            var isApplied = appliedChanges[i] === true;
            return (
              <div
                key={i}
                onMouseEnter={isApplied ? undefined : function () { hover.onMouseEnter(ch.original); }}
                onMouseLeave={isApplied ? undefined : hover.onMouseLeave}
                style={{
                  ...cardStyle,
                  borderLeft: "4px solid " + (isApplied ? "#4caf50" : "#1976d2"),
                  opacity: isApplied ? 0.6 : 1,
                  cursor: isApplied ? undefined : "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 10,
                    background: isApplied ? "#c8e6c9" : "#e3f2fd",
                    color: isApplied ? "#2e7d32" : "#1565c0",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}>
                    {isApplied ? "\u2713 \u00dcbernommen" : "\u00c4nderung " + (i + 1)}
                  </span>
                  {!isApplied && viewState === "result" && (
                    <button
                      onClick={function () { handleApplySingle(ch, i); }}
                      disabled={loading || applyingAll}
                      style={{
                        background: "#2e7d32",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        padding: "3px 10px",
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: (loading || applyingAll) ? "not-allowed" : "pointer",
                      }}
                    >
                      \u00dcbernehmen
                    </button>
                  )}
                </div>
                {/* Original */}
                <div style={{ fontSize: 12, color: "#999", textDecoration: "line-through", marginBottom: 2 }}>
                  {ch.original}
                </div>
                {/* Replacement */}
                <div style={{ fontSize: 12, fontWeight: 600, color: "#2e7d32" }}>
                  {ch.replacement}
                </div>
                {/* Reason */}
                {ch.reason && (
                  <div style={{ fontSize: 11, color: "#666", marginTop: 4, lineHeight: 1.4 }}>
                    {ch.reason}
                  </div>
                )}
              </div>
            );
          })}

          {/* No changes returned (fallback) */}
          {totalChanges === 0 && (
            <div style={{ ...cardStyle, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>
                Keine einzelnen \u00c4nderungen verf\u00fcgbar.
              </div>
              <Button
                appearance="outline"
                onClick={handleRegenerate}
                disabled={loading}
                style={{ borderRadius: 8, fontWeight: 600 }}
              >
                Neu generieren
              </Button>
            </div>
          )}

          {/* Regenerate button (when changes exist) */}
          {viewState === "result" && totalChanges > 0 && (
            <div style={{ textAlign: "center" }}>
              <button
                onClick={handleRegenerate}
                disabled={loading}
                style={{
                  background: "none",
                  border: "1px solid #ccc",
                  borderRadius: 8,
                  padding: "6px 16px",
                  fontSize: 11,
                  color: "#666",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: 500,
                }}
              >
                Neu generieren
              </button>
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
                &#10003; Alle \u00c4nderungen \u00fcbernommen
              </div>
              <button
                onClick={handleUndoAll}
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
                {loading ? "..." : "Alles r\u00fcckg\u00e4ngig"}
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
