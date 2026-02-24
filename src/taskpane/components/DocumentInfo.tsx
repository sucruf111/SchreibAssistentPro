import React, { useEffect, useState } from "react";
import { Button, Spinner } from "@fluentui/react-components";
import { useStore } from "../store";
import { loadDocumentInfo } from "../services/wordApi";

export function DocumentInfo() {
  var {
    docInfo, setDocInfo,
    analysisScope, setAnalysisScope,
    selectedChapters, setSelectedChapters,
    loading,
  } = useStore();
  var [showChapters, setShowChapters] = useState(false);
  var [refreshing, setRefreshing] = useState(false);

  var refresh = function () {
    setRefreshing(true);
    loadDocumentInfo().then(function (info) {
      setDocInfo(info);
      // Auto-select scope
      if (info.hasSelection) {
        setAnalysisScope("selection");
      } else {
        setAnalysisScope("full");
      }
      setRefreshing(false);
    }).catch(function () {
      setRefreshing(false);
    });
  };

  useEffect(function () {
    refresh();
  }, []);

  if (!docInfo) {
    return (
      <div style={{ padding: "8px 14px", textAlign: "center" }}>
        <Spinner size="tiny" />
      </div>
    );
  }

  var toggleChapter = function (index: number) {
    var current = selectedChapters.slice();
    var pos = current.indexOf(index);
    if (pos >= 0) {
      current.splice(pos, 1);
    } else {
      current.push(index);
    }
    setSelectedChapters(current);
    if (current.length > 0) {
      setAnalysisScope("chapters");
    } else {
      setAnalysisScope("full");
    }
  };

  var selectAllChapters = function () {
    if (!docInfo) return;
    var all: number[] = [];
    for (var i = 0; i < docInfo.chapters.length; i++) {
      all.push(i);
    }
    setSelectedChapters(all);
    setAnalysisScope("chapters");
  };

  var isLargeDoc = docInfo.totalWords > 4000;

  return (
    <div style={{ padding: "8px 12px", background: "white", borderBottom: "1px solid #eee" }}>
      {/* Top row: Doc info + refresh */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#888" }}>
            {docInfo.totalWords.toLocaleString()} Wörter
          </span>
          {docInfo.hasSelection && (
            <span style={{
              fontSize: 10,
              padding: "2px 6px",
              background: "#e3f2fd",
              color: "#1565c0",
              borderRadius: 10,
              fontWeight: 600,
            }}>
              {docInfo.selectedWords} Wörter markiert
            </span>
          )}
          {isLargeDoc && (
            <span style={{
              fontSize: 10,
              padding: "2px 6px",
              background: "#fff3e0",
              color: "#e65100",
              borderRadius: 10,
            }}>
              Großes Dokument
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={refreshing || loading}
          style={{
            background: "none",
            border: "none",
            color: "#0f6cbd",
            fontSize: 11,
            cursor: "pointer",
            padding: "2px 6px",
          }}
        >
          {refreshing ? "..." : "Aktualisieren"}
        </button>
      </div>

      {/* Scope selector */}
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        {docInfo.hasSelection && (
          <ScopeButton
            active={analysisScope === "selection"}
            onClick={function () { setAnalysisScope("selection"); setSelectedChapters([]); }}
            label="Selektion"
          />
        )}
        <ScopeButton
          active={analysisScope === "full" && selectedChapters.length === 0}
          onClick={function () { setAnalysisScope("full"); setSelectedChapters([]); setShowChapters(false); }}
          label="Gesamtes Dokument"
        />
        {isLargeDoc && docInfo.chapters.length > 1 && (
          <ScopeButton
            active={analysisScope === "chapters"}
            onClick={function () { setShowChapters(!showChapters); }}
            label={"Abschnitte" + (selectedChapters.length > 0 ? " (" + selectedChapters.length + ")" : "")}
          />
        )}
      </div>

      {/* Chapter picker */}
      {showChapters && isLargeDoc && docInfo.chapters.length > 1 && (
        <div style={{ marginTop: 8, maxHeight: 180, overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: "#888" }}>Abschnitte auswählen:</span>
            <button
              onClick={selectAllChapters}
              style={{ background: "none", border: "none", color: "#0f6cbd", fontSize: 10, cursor: "pointer", padding: 0 }}
            >
              Alle auswählen
            </button>
          </div>
          {docInfo.chapters.map(function (ch, idx) {
            var isSelected = selectedChapters.indexOf(idx) >= 0;
            return (
              <div
                key={idx}
                onClick={function () { toggleChapter(idx); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 8px",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: isSelected ? "#e8f0fe" : "#fafafa",
                  border: "1px solid " + (isSelected ? "#0f6cbd" : "#eee"),
                  marginBottom: 3,
                }}
              >
                <div style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  border: "2px solid " + (isSelected ? "#0f6cbd" : "#bbb"),
                  background: isSelected ? "#0f6cbd" : "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {isSelected && <span style={{ color: "white", fontSize: 9, fontWeight: 700 }}>&#10003;</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ch.title}
                  </div>
                  <div style={{ fontSize: 9, color: "#999" }}>{ch.wordCount} Wörter</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScopeButton(props: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={props.onClick}
      style={{
        padding: "3px 8px",
        fontSize: 10,
        fontWeight: props.active ? 600 : 400,
        borderRadius: 12,
        border: "1px solid " + (props.active ? "#0f6cbd" : "#ddd"),
        background: props.active ? "#e8f0fe" : "white",
        color: props.active ? "#0f6cbd" : "#666",
        cursor: "pointer",
      }}
    >
      {props.label}
    </button>
  );
}
