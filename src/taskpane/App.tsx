import React, { useState, useEffect } from "react";
import {
  FluentProvider,
  webLightTheme,
  Tab,
  TabList,
  Tooltip,
} from "@fluentui/react-components";
import { CorrectionTab } from "./components/CorrectionTab";
import { ProofreadTab } from "./components/ProofreadTab";
import { SourcesTab } from "./components/SourcesTab";
import { StyleTab } from "./components/StyleTab";
import { SuggestionsTab } from "./components/SuggestionsTab";
import { SettingsTab } from "./components/SettingsTab";
import { isLoggedIn } from "./services/openai";

export default function App() {
  const [tab, setTab] = useState("correction");
  const [showSettings, setShowSettings] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setConnected(isLoggedIn());
    const interval = setInterval(() => setConnected(isLoggedIn()), 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <FluentProvider theme={webLightTheme}>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f5f6fa" }}>
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #0f6cbd 0%, #0e4f8b 100%)",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: "white",
              }}
            >
              S
            </div>
            <span style={{ color: "white", fontWeight: 600, fontSize: 14 }}>
              SchreibAssistent Pro
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Tooltip content={connected ? "Verbunden mit OpenAI" : "Nicht verbunden"} relationship="label">
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: connected ? "#4caf50" : "#ff5722",
                  boxShadow: connected ? "0 0 6px #4caf50" : "0 0 6px #ff5722",
                }}
              />
            </Tooltip>
            <Tooltip content="Einstellungen" relationship="label">
              <button
                onClick={() => setShowSettings(!showSettings)}
                style={{
                  background: showSettings ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: 6,
                  width: 28,
                  height: 28,
                  cursor: "pointer",
                  color: "white",
                  fontSize: 15,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.2s",
                }}
              >
                &#9881;
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div style={{ padding: 16, background: "white", borderBottom: "1px solid #e8e8e8", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
            <SettingsTab onConnectionChange={setConnected} />
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ background: "white", borderBottom: "1px solid #e0e0e0", padding: "0 4px" }}>
          <TabList
            size="small"
            selectedValue={tab}
            onTabSelect={(_, d) => setTab(d.value as string)}
          >
            <Tab value="correction" style={{ fontSize: 12, padding: "8px 8px" }}>
              Korrektur
            </Tab>
            <Tab value="proofread" style={{ fontSize: 12, padding: "8px 8px" }}>
              Lektorat
            </Tab>
            <Tab value="sources" style={{ fontSize: 12, padding: "8px 8px" }}>
              Quellen
            </Tab>
            <Tab value="style" style={{ fontSize: 12, padding: "8px 8px" }}>
              Stil
            </Tab>
            <Tab value="suggestions" style={{ fontSize: 12, padding: "8px 8px" }}>
              Vorschläge
            </Tab>
          </TabList>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {!connected && !showSettings && (
            <div
              style={{
                background: "linear-gradient(135deg, #fff3e0, #fff8e1)",
                border: "1px solid #ffe0b2",
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#ff9800",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                !
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, color: "#e65100", fontWeight: 600 }}>
                  Nicht mit OpenAI verbunden
                </span>
                <br />
                <button
                  onClick={() => setShowSettings(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0f6cbd",
                    fontSize: 12,
                    cursor: "pointer",
                    padding: 0,
                    marginTop: 2,
                    fontWeight: 500,
                  }}
                >
                  Einstellungen öffnen →
                </button>
              </div>
            </div>
          )}
          {tab === "correction" && <CorrectionTab />}
          {tab === "proofread" && <ProofreadTab />}
          {tab === "sources" && <SourcesTab />}
          {tab === "style" && <StyleTab />}
          {tab === "suggestions" && <SuggestionsTab />}
        </div>
      </div>
    </FluentProvider>
  );
}
