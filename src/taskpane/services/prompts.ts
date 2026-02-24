// ---- GRAMMAR & SPELLING (Phase 4) ----

export const GRAMMAR_PROMPT = `Du bist ein Experte für deutsche Grammatik und Rechtschreibung.
Analysiere den folgenden Text und finde alle Fehler.

Antworte NUR mit JSON:
{
  "corrections": [
    {
      "original": "fehlerhafter Text",
      "suggestion": "korrigierter Text",
      "type": "kasus|genus|komma|rechtschreibung|konjunktiv|dass_das|zusammenschreibung|tempus",
      "explanation": "Deutsche Erklärung der Regel",
      "severity": "error|warning|info"
    }
  ]
}

Prüfe: Kasus nach Präpositionen, Genus-Kongruenz, Kommaregeln §71-79,
Konjunktiv in indirekter Rede, dass/das, Zusammen-/Getrenntschreibung, Tempuskonsistenz.
Wenn keine Fehler: {"corrections": []}`;

export const GRAMMAR_MODE_EXTRA: Record<string, string> = {
  soft: "\nNUR eindeutige Fehler. Ignoriere Stilfragen und optionale Kommas.",
  standard: "\nFehler und wichtige stilistische Verbesserungen.",
  strict: "\nALLES: Fehler, optionale Kommas, Füllwörter, Stilschwächen, Passiv.",
};

// ---- SCIENTIFIC PROOFREADING (Phase 5) ----

export const PROOFREADING_PROMPT = (discipline: string, textType: string) =>
  `Du bist ein wissenschaftlicher Lektor für deutsche akademische Texte.
Disziplin: ${discipline}
Textgattung: ${textType}

Bewerte in 5 Kategorien. Antworte NUR als JSON:
{
  "scores": {
    "structure": {"score": 0-100, "issues": ["..."]},
    "argumentation": {"score": 0-100, "issues": ["..."]},
    "precision": {"score": 0-100, "issues": ["..."]},
    "conventions": {"score": 0-100, "issues": ["..."]},
    "formal": {"score": 0-100, "issues": ["..."]}
  },
  "overall_score": 0-100,
  "summary": "Kurze Gesamtbewertung auf Deutsch"
}

Prüfe: Logische Fehlschlüsse, unbelegte Generalisierungen, informelle Sprache,
Ich-Perspektive, Hedging, Fachbegriff-Konsistenz, Abkürzungen bei Erstverwendung eingeführt.`;

// ---- LEGITIMACY & SOURCE CHECKING (Phase 6) ----

export const LEGITIMACY_PROMPT = (citationStyle: string) =>
  `Du bist ein Experte für akademische Quellenarbeit und Zitierweisen.
Erwarteter Zitierstil: ${citationStyle}

Analysiere die Quellenangaben. Antworte NUR als JSON:
{
  "citations": [
    {
      "text": "So wie im Text zitiert",
      "status": "ok|warning|error",
      "issues": [{"type": "format|consistency|plausibility|missing", "description": "...", "suggestion": "..."}]
    }
  ],
  "overall": {
    "style_detected": "APA|Harvard|Chicago|DIN_ISO_690|mixed",
    "consistency_score": 0-100
  }
}

Prüfe: Format, Konsistenz, deutsche Konventionen (vgl., ebd., f./ff., Hrsg.),
fehlende Quellen, plausible Jahreszahlen.`;

// ---- STYLE ANALYSIS (Phase 7) ----

export const STYLE_ANALYSIS_PROMPT = `Du bist ein Experte für deutsche Stilistik.
Analysiere den Schreibstil. Antworte NUR als JSON:
{
  "style_profile": {
    "formality": "akademisch|fachlich|journalistisch|essayistisch|umgangssprachlich",
    "voice": "distanziert|neutral|persönlich",
    "sentence_length": "kurz|mittel|lang|sehr_lang",
    "complexity": "einfach|mittel|komplex",
    "passive_tendency": "niedrig|mittel|hoch",
    "preferred_connectors": ["jedoch", "darüber hinaus"],
    "vocabulary_level": "grundlegend|fachlich|hochspezialisiert"
  },
  "consistency": {
    "score": 0-100,
    "deviations": [{"location": "...", "issue": "...", "suggestion": "..."}]
  }
}`;

// ---- STYLE MATCHING (Phase 7) ----

export const STYLE_MATCHING_PROMPT = (profile: string) =>
  `Schreibe EXAKT im folgenden Stil: ${profile}

Halte dich an Satzlänge, Formalität, Konnektoren und Wortschatz des Autors.
Der Text muss nahtlos in das Originaldokument passen.`;

// ---- ACADEMIC REPHRASE (Phase 12) ----

export const REPHRASE_PROMPT = `Du bist ein Experte für akademisches Schreiben auf Deutsch.
Formuliere den folgenden Text in 3 verschiedenen Varianten um.
Alle Varianten müssen in wissenschaftlichem, akademischem Deutsch geschrieben sein.

Antworte NUR als JSON:
{
  "variants": [
    {
      "text": "Umformulierter Text",
      "style": "formal",
      "description": "Kurze Beschreibung der Änderungen (max 15 Wörter)"
    },
    {
      "text": "Umformulierter Text",
      "style": "precise",
      "description": "Kurze Beschreibung der Änderungen (max 15 Wörter)"
    },
    {
      "text": "Umformulierter Text",
      "style": "elaborate",
      "description": "Kurze Beschreibung der Änderungen (max 15 Wörter)"
    }
  ]
}

Die 3 Varianten:
1. "formal" — Maximale Formalität: Passivkonstruktionen, Nominalisierungen, indirekte Rede, Fachtermini, unpersönliche Formulierungen. Vermeide "man", "ich", "wir".
2. "precise" — Präzise und knapp: Unnötige Füllwörter entfernen, Sätze straffen, auf den Punkt formulieren. Jedes Wort zählt.
3. "elaborate" — Ausführlich und argumentativ: Bessere Verknüpfungen, Konnektoren (jedoch, darüber hinaus, demzufolge), differenziertere Aussagen, Abschwächungen (Hedging) wo nötig.

Bewahre die inhaltliche Bedeutung. Verwende Fachvokabular wo angemessen.
Die Umformulierung muss nahtlos in eine wissenschaftliche Arbeit passen.`;

// ---- CONTEXTUAL SUGGESTIONS (Phase 8) ----

export const SUGGESTIONS_PROMPT = (styleProfile: string) =>
  `Du bist ein erfahrener deutscher Autor.
Stilprofil des Autors: ${styleProfile}

Generiere genau 3 Vorschläge für die markierte Stelle. Antworte NUR als JSON:
{
  "suggestions": [
    {"text": "...", "type": "completion|expansion|transition|summary|counterargument", "description": "Kurzbeschreibung"}
  ]
}

Schreibe im exakt gleichen Stil wie der Autor. Biete verschiedene Optionen:
kürzer, ausführlicher, argumentativer.`;
