import React, { useState, useEffect } from "react";
import { Button, Select, Label } from "@fluentui/react-components";
import { loginWithOpenAI, logout, isLoggedIn } from "../services/openai";
import { useStore } from "../store";

export function SettingsTab() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mode, setMode, discipline, setDiscipline, citationStyle, setCitationStyle } = useStore();

  useEffect(function () {
    try {
      setConnected(isLoggedIn());
    } catch (e) {
      // Office not ready
    }
  }, []);

  const handleLogin = async function () {
    setLoading(true);
    setError(null);
    try {
      await loginWithOpenAI();
      setConnected(true);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  const handleLogout = function () {
    logout();
    setConnected(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Connection */}
      <div>
        <Label weight="semibold" style={{ fontSize: 13 }}>OpenAI-Verbindung</Label>
        <div
          style={{
            marginTop: 8,
            padding: 12,
            background: connected ? "#e8f5e9" : "#fafafa",
            borderRadius: 8,
            border: "1px solid " + (connected ? "#c8e6c9" : "#e0e0e0"),
          }}
        >
          {connected ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4caf50" }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: "#2e7d32" }}>Verbunden</span>
              </div>
              <Button size="small" appearance="subtle" onClick={handleLogout}>
                Abmelden
              </Button>
            </div>
          ) : (
            <div>
              <Button appearance="primary" onClick={handleLogin} disabled={loading} style={{ width: "100%" }}>
                {loading ? "Verbinde..." : "Mit OpenAI anmelden"}
              </Button>
              <p style={{ fontSize: 11, color: "#888", margin: "8px 0 0", textAlign: "center" }}>
                Öffnet ein Login-Fenster bei OpenAI
              </p>
            </div>
          )}
        </div>
        {error ? <p style={{ fontSize: 12, color: "#d32f2f", margin: "6px 0 0" }}>{error}</p> : null}
      </div>

      <div style={{ height: 1, background: "#e0e0e0" }} />

      {/* Correction Mode */}
      <div>
        <Label weight="semibold" style={{ fontSize: 13 }}>Korrekturmodus</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {(["soft", "standard", "strict"] as const).map(function (value) {
            const labels: Record<string, { label: string; desc: string }> = {
              soft: { label: "Sanft", desc: "Nur eindeutige Fehler" },
              standard: { label: "Standard", desc: "Fehler + Stilverbesserungen" },
              strict: { label: "Streng", desc: "Alles prüfen (Abschlussarbeiten)" },
            };
            const opt = labels[value];
            const isActive = mode === value;
            return (
              <button
                key={value}
                onClick={function () { setMode(value); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "2px solid " + (isActive ? "#0f6cbd" : "#e0e0e0"),
                  background: isActive ? "#e8f0fe" : "white",
                  cursor: "pointer",
                  textAlign: "left" as const,
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: "2px solid " + (isActive ? "#0f6cbd" : "#bbb"),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {isActive ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0f6cbd" }} /> : null}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{opt.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ height: 1, background: "#e0e0e0" }} />

      {/* Discipline & Citation Style */}
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Label weight="semibold" size="small">Fachgebiet</Label>
          <Select value={discipline} onChange={function (_, d) { setDiscipline(d.value); }} size="small" style={{ marginTop: 4 }}>
            <option value="allgemein">Allgemein</option>
            <option value="jura">Jura</option>
            <option value="medizin">Medizin</option>
            <option value="informatik">Informatik</option>
            <option value="wirtschaft">Wirtschaft</option>
            <option value="geisteswissenschaften">Geisteswiss.</option>
            <option value="naturwissenschaften">Naturwiss.</option>
          </Select>
        </div>
        <div style={{ flex: 1 }}>
          <Label weight="semibold" size="small">Zitierstil</Label>
          <Select value={citationStyle} onChange={function (_, d) { setCitationStyle(d.value); }} size="small" style={{ marginTop: 4 }}>
            <option value="APA">APA</option>
            <option value="Harvard">Harvard</option>
            <option value="Chicago">Chicago</option>
            <option value="IEEE">IEEE</option>
          </Select>
        </div>
      </div>

      <p style={{ fontSize: 10, color: "#bbb", textAlign: "center", margin: 0 }}>
        SchreibAssistent Pro v1.0.0
      </p>
    </div>
  );
}
