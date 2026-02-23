import React, { useState, useEffect } from "react";
import { Button, Badge, Select, Label } from "@fluentui/react-components";
import { loginWithOpenAI, logout, isLoggedIn } from "../services/openai";
import { useStore } from "../store";

export function SettingsTab() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const { mode, setMode } = useStore();

  useEffect(() => {
    setConnected(isLoggedIn());
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await loginWithOpenAI();
      setConnected(true);
    } catch (e) {
      alert("Login fehlgeschlagen: " + (e as Error).message);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    logout();
    setConnected(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <Label weight="semibold">OpenAI-Verbindung</Label>
        {connected ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <Badge appearance="filled" color="success">
              Verbunden
            </Badge>
            <Button size="small" appearance="subtle" onClick={handleLogout}>
              Abmelden
            </Button>
          </div>
        ) : (
          <Button
            appearance="primary"
            onClick={handleLogin}
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {loading ? "Verbinde..." : "Mit OpenAI anmelden"}
          </Button>
        )}
      </div>

      <div>
        <Label weight="semibold">Korrekturmodus</Label>
        <Select
          value={mode}
          onChange={(_, d) => setMode(d.value as "soft" | "standard" | "strict")}
          style={{ marginTop: 4 }}
        >
          <option value="soft">Sanft — nur eindeutige Fehler</option>
          <option value="standard">Standard — Fehler + Stilverbesserungen</option>
          <option value="strict">Streng — alles prüfen (für Abschlussarbeiten)</option>
        </Select>
      </div>
    </div>
  );
}
