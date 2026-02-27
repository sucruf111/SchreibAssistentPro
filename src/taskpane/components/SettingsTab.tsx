import React, { useState, useEffect } from "react";
import { Button, Label, Spinner } from "@fluentui/react-components";
import { saveApiKey, clearApiKey, isConnected } from "../services/gemini";
import { useStore } from "../store";
import { loadStyleProfile, clearStyleProfile, analyzeStyle, saveStyleProfile } from "../modules/style";
import { getSelection, extractDocument } from "../services/wordApi";

export function SettingsTab() {
  var [connected, setConnected] = useState(false);
  var [keyInput, setKeyInput] = useState("");
  var [saving, setSaving] = useState(false);
  var [error, setError] = useState<string | null>(null);
  var [success, setSuccess] = useState(false);
  var { mode, setMode, discipline, setDiscipline, citationStyle, setCitationStyle, loading, setLoading } = useStore();

  // Style profile state
  var [profileExists, setProfileExists] = useState(false);
  var [profileDate, setProfileDate] = useState<string | null>(null);
  var [styleAnalyzing, setStyleAnalyzing] = useState(false);
  var [styleError, setStyleError] = useState<string | null>(null);

  useEffect(function () {
    try {
      setConnected(isConnected());
    } catch (e) {
      // Office not ready
    }
    // Check for saved style profile
    refreshProfileStatus();
  }, []);

  var refreshProfileStatus = function () {
    var stored = loadStyleProfile();
    if (stored && stored.profile) {
      setProfileExists(true);
      setProfileDate(stored.date);
    } else {
      setProfileExists(false);
      setProfileDate(null);
    }
  };

  var handleSaveKey = function () {
    var trimmed = keyInput.trim();
    if (!trimmed) {
      setError("Bitte einen API-Key eingeben.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      saveApiKey(trimmed);
      setConnected(true);
      setKeyInput("");
      setSuccess(true);
      setTimeout(function () { setSuccess(false); }, 3000);
    } catch (e) {
      setError((e as Error).message);
    }
    setSaving(false);
  };

  var handleDisconnect = function () {
    clearApiKey();
    setConnected(false);
    setSuccess(false);
  };

  var handleAnalyzeStyle = async function () {
    setStyleAnalyzing(true);
    setLoading(true);
    setStyleError(null);
    try {
      // Try selection first, fallback to full document
      var text = "";
      try {
        var selText = await getSelection();
        if (selText && selText.trim().length > 0) {
          text = selText;
        }
      } catch (_e) {
        // no selection
      }

      if (!text) {
        var paragraphs = await extractDocument();
        text = paragraphs.map(function (p) { return p.text; }).join("\n\n");
      }

      // Limit text
      var words = text.split(/\s+/);
      if (words.length > 3000) {
        text = words.slice(0, 3000).join(" ");
      }

      if (words.length < 50) {
        setStyleError("Zu wenig Text f\u00fcr eine Stilanalyse (mindestens 50 W\u00f6rter).");
        setStyleAnalyzing(false);
        setLoading(false);
        return;
      }

      var res = await analyzeStyle(text);
      saveStyleProfile(res.style_profile);
      refreshProfileStatus();
    } catch (e) {
      setStyleError((e as Error).message);
    }
    setStyleAnalyzing(false);
    setLoading(false);
  };

  var handleClearProfile = function () {
    clearStyleProfile();
    setProfileExists(false);
    setProfileDate(null);
  };

  var formatDate = function (iso: string): string {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch (_e) {
      return iso;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Gemini Connection */}
      <div>
        <Label weight="semibold" style={{ fontSize: 13 }}>Google Gemini API</Label>
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
              <Button size="small" appearance="subtle" onClick={handleDisconnect}>
                Trennen
              </Button>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="password"
                  placeholder="Gemini API-Key eingeben..."
                  value={keyInput}
                  onChange={function (e) { setKeyInput(e.target.value); }}
                  onKeyDown={function (e) { if (e.key === "Enter") handleSaveKey(); }}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    fontSize: 12,
                    outline: "none",
                  }}
                />
                <Button appearance="primary" size="small" onClick={handleSaveKey} disabled={saving}>
                  {saving ? "..." : "Speichern"}
                </Button>
              </div>
              <p style={{ fontSize: 11, color: "#888", margin: "8px 0 0", textAlign: "center" }}>
                Kostenlos auf{" "}
                <span style={{ color: "#0f6cbd", fontWeight: 500 }}>aistudio.google.com</span>
                {" "}erstellen
              </p>
            </div>
          )}
        </div>
        {error ? <p style={{ fontSize: 12, color: "#d32f2f", margin: "6px 0 0" }}>{error}</p> : null}
        {success ? <p style={{ fontSize: 12, color: "#2e7d32", margin: "6px 0 0" }}>API-Key gespeichert!</p> : null}
      </div>

      <div style={{ height: 1, background: "#e0e0e0" }} />

      {/* Correction Mode */}
      <div>
        <Label weight="semibold" style={{ fontSize: 13 }}>Korrekturmodus</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {(["soft", "standard", "strict"] as const).map(function (value) {
            var labels: Record<string, { label: string; desc: string }> = {
              soft: { label: "Sanft", desc: "Nur eindeutige Fehler" },
              standard: { label: "Standard", desc: "Fehler + Stilverbesserungen" },
              strict: { label: "Streng", desc: "Alles pr\u00fcfen (Abschlussarbeiten)" },
            };
            var opt = labels[value];
            var isActive = mode === value;
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
          <select
            value={discipline}
            onChange={function (e) { setDiscipline(e.target.value); }}
            style={{ width: "100%", marginTop: 4, padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc", fontSize: 12 }}
          >
            <option value="allgemein">Allgemein</option>
            <option value="jura">Jura</option>
            <option value="medizin">Medizin</option>
            <option value="informatik">Informatik</option>
            <option value="wirtschaft">Wirtschaft</option>
            <option value="geisteswissenschaften">Geisteswiss.</option>
            <option value="naturwissenschaften">Naturwiss.</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <Label weight="semibold" size="small">Zitierstil</Label>
          <select
            value={citationStyle}
            onChange={function (e) { setCitationStyle(e.target.value); }}
            style={{ width: "100%", marginTop: 4, padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc", fontSize: 12 }}
          >
            <option value="APA">APA</option>
            <option value="Harvard">Harvard</option>
            <option value="Chicago">Chicago</option>
            <option value="IEEE">IEEE</option>
          </select>
        </div>
      </div>

      <div style={{ height: 1, background: "#e0e0e0" }} />

      {/* Style Profile Section */}
      <div>
        <Label weight="semibold" style={{ fontSize: 13 }}>Stilprofil</Label>
        <div
          style={{
            marginTop: 8,
            padding: 12,
            background: profileExists ? "#f3e8fd" : "#fafafa",
            borderRadius: 8,
            border: "1px solid " + (profileExists ? "#e1bee7" : "#e0e0e0"),
          }}
        >
          {profileExists ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#7b1fa2" }}>
                    Stilprofil vorhanden
                  </div>
                  {profileDate && (
                    <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
                      Erstellt: {formatDate(profileDate)}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button
                  onClick={handleAnalyzeStyle}
                  disabled={styleAnalyzing || loading}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: "1px solid #ce93d8",
                    background: "white",
                    color: "#7b1fa2",
                    cursor: (styleAnalyzing || loading) ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  {styleAnalyzing ? <Spinner size="tiny" /> : null}
                  {styleAnalyzing ? "Analysiere..." : "Neu analysieren"}
                </button>
                <button
                  onClick={handleClearProfile}
                  disabled={styleAnalyzing || loading}
                  style={{
                    padding: "6px 10px",
                    fontSize: 11,
                    borderRadius: 6,
                    border: "1px solid #e0e0e0",
                    background: "white",
                    color: "#888",
                    cursor: (styleAnalyzing || loading) ? "not-allowed" : "pointer",
                  }}
                >
                  L{"\u00f6"}schen
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
                Kein Stilprofil — wird beim ersten Umschreiben automatisch erstellt
              </div>
              <button
                onClick={handleAnalyzeStyle}
                disabled={styleAnalyzing || loading}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "1px solid #ce93d8",
                  background: "#7b1fa2",
                  color: "white",
                  cursor: (styleAnalyzing || loading) ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                {styleAnalyzing ? <Spinner size="tiny" /> : null}
                {styleAnalyzing ? "Analysiere..." : "Jetzt analysieren"}
              </button>
            </div>
          )}
        </div>
        {styleError && (
          <p style={{ fontSize: 11, color: "#d32f2f", margin: "6px 0 0" }}>{styleError}</p>
        )}
      </div>

      <p style={{ fontSize: 10, color: "#bbb", textAlign: "center", margin: 0 }}>
        SchreibAssistent Pro v1.0.0 — powered by Gemini
      </p>
    </div>
  );
}
