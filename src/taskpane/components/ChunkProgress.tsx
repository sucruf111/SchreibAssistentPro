import React from "react";
import { ProgressBar } from "@fluentui/react-components";
import { useStore } from "../store";

export function ChunkProgress() {
  var progress = useStore().progress;

  if (!progress) return null;

  var pct = progress.total > 0 ? progress.done / progress.total : 0;

  return (
    <div
      style={{
        padding: "10px 14px",
        background: "white",
        borderRadius: 10,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "#555" }}>Verarbeite Dokument...</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#0f6cbd" }}>
          {progress.done}/{progress.total}
        </span>
      </div>
      <ProgressBar value={pct} />
      {progress.chapterName && (
        <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>
          Abschnitt {progress.done + 1}/{progress.total}: {progress.chapterName}
        </div>
      )}
    </div>
  );
}
