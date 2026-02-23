import React from "react";
import { Text, ProgressBar } from "@fluentui/react-components";
import { useStore } from "../store";

export function ChunkProgress() {
  const { progress } = useStore();

  if (!progress) return null;

  const pct = progress.total > 0 ? progress.done / progress.total : 0;

  return (
    <div style={{ padding: 8, background: "#f5f5f5", borderRadius: 4 }}>
      <Text size={200}>
        Verarbeite Abschnitt {progress.done} von {progress.total}...
      </Text>
      <ProgressBar value={pct} style={{ marginTop: 4 }} />
    </div>
  );
}
