import React, { useState, useEffect, useRef } from "react";
import {
  FluentProvider,
  webLightTheme,
  Tab,
  TabList,
} from "@fluentui/react-components";
import { useStore } from "./store";
import { loadDocumentInfo, onSelectionChanged } from "./services/wordApi";
import { CorrectionTab } from "./components/CorrectionTab";
import { StyleTab } from "./components/StyleTab";
import { SettingsTab } from "./components/SettingsTab";
import { DocumentInfo } from "./components/DocumentInfo";
import { QuickCheckPanel } from "./components/QuickCheckPanel";

export default function App() {
  var [tab, setTab] = useState("correction");
  var [showSettings, setShowSettings] = useState(false);
  var [hasSelection, setHasSelection] = useState(false);
  var { docInfo, setDocInfo, setAnalysisScope, setAutoCheck, loading } = useStore();
  var selectionTimerRef = useRef<any>(null);

  var connected = false;
  try {
    var key = localStorage.getItem("gemini_api_key");
    connected = !!key;
  } catch (e) {
    // localStorage not available
  }

  var refreshDocInfo = function () {
    loadDocumentInfo().then(function (info) {
      setDocInfo(info);
      setHasSelection(info.hasSelection);
      if (info.hasSelection) {
        setAnalysisScope("selection");
      }
    }).catch(function () {
      // Ignore
    });
  };

  // On mount: load doc info + register selection change handler
  useEffect(function () {
    refreshDocInfo();

    // Register Office.js selection changed event
    onSelectionChanged(function () {
      // Debounce: wait 500ms after last selection change before refreshing
      if (selectionTimerRef.current) {
        clearTimeout(selectionTimerRef.current);
      }
      selectionTimerRef.current = setTimeout(function () {
        refreshDocInfo();
      }, 500);
    });
  }, []);

  var handleCheckSelection = function () {
    setAnalysisScope("selection");
    setTab("correction");
    setAutoCheck(true);
  };

  return (
    <FluentProvider theme={webLightTheme}>
      <div style={{ background: "#f5f6fa", minHeight: "100%" }}>
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #0f6cbd 0%, #0e4f8b 100%)",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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
            {/* Selection Check Button */}
            {hasSelection && connected && !loading && (
              <button
                onClick={handleCheckSelection}
                title="Markierten Text prüfen"
                style={{
                  background: "#4caf50",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 10px",
                  cursor: "pointer",
                  color: "white",
                  fontSize: 11,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 13 }}>&#10003;</span>
                Selektion prüfen
              </button>
            )}
            <div
              title={connected ? "Verbunden" : "Nicht verbunden"}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: connected ? "#4caf50" : "#ff5722",
              }}
            />
            <button
              title="Einstellungen"
              onClick={function () { setShowSettings(!showSettings); }}
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
              }}
            >
              &#9881;
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings ? (
          <div style={{ padding: 16, background: "white", borderBottom: "1px solid #e8e8e8" }}>
            <SettingsTab />
          </div>
        ) : null}

        {/* Warning Banner */}
        {!connected && !showSettings ? (
          <div
            style={{
              margin: "12px 16px 0",
              background: "#fff3e0",
              border: "1px solid #ffe0b2",
              borderRadius: 8,
              padding: 12,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#ff9800",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              !
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#e65100", fontWeight: 600 }}>
                Kein Gemini API-Key hinterlegt
              </div>
              <button
                onClick={function () { setShowSettings(true); }}
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
                Einstellungen öffnen
              </button>
            </div>
          </div>
        ) : null}

        {/* Document Info Bar */}
        <DocumentInfo />

        {/* Quick Check Panel (visible when text is selected) */}
        <QuickCheckPanel />

        {/* Tab Navigation */}
        <div style={{ background: "white", borderBottom: "1px solid #e0e0e0", padding: "0 4px" }}>
          <TabList
            size="small"
            selectedValue={tab}
            onTabSelect={function (_, d) { setTab(d.value as string); }}
          >
            <Tab value="correction">Korrektur</Tab>
            <Tab value="style">Stil</Tab>
          </TabList>
        </div>

        {/* Content */}
        <div style={{ padding: 16 }}>
          {tab === "correction" ? <CorrectionTab /> : null}
          {tab === "style" ? <StyleTab /> : null}
        </div>
      </div>
    </FluentProvider>
  );
}
