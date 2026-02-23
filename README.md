# SchreibAssistent Pro

KI-gestützter Schreibassistent für deutsche Texte in Microsoft Word.

<p align="center">
  <img src="assets/icon-80.png" alt="SchreibAssistent Pro" width="80" />
</p>

## Funktionen

| Feature | Beschreibung |
|---------|-------------|
| **Grammatikkorrektur** | Kasus, Genus, Komma, Konjunktiv, dass/das, Komposita. Drei Modi: Sanft, Standard, Streng |
| **Wissenschaftliches Lektorat** | Kohärenz, Argumentation, Fachsprache, Präzision mit detailliertem Scoring |
| **Quellenprüfung** | Zitierkonsistenz nach APA, Harvard, Chicago oder IEEE |
| **Stilanalyse** | Stilprofil-Erstellung und Konsistenzprüfung mit Profil-Speicherung |
| **KI-Vorschläge** | Kontextbezogene Vervollständigungen, Erweiterungen, Überleitungen |
| **Große Dokumente** | 100+ Seiten durch intelligentes Chunking mit paralleler Verarbeitung |

## Architektur

- **Frontend:** React 18 + TypeScript + FluentUI React Components
- **State:** Zustand
- **API:** OpenAI ChatGPT (gpt-4o) – direkte Aufrufe, kein Backend
- **Auth:** OpenAI OAuth via Office Dialog API
- **Hosting:** GitHub Pages
- **Build:** Webpack 5

## Schnellstart (Entwicklung)

```bash
# Abhängigkeiten installieren
npm install

# Dev-Zertifikate generieren (einmalig)
npx office-addin-dev-certs install

# Dev-Server starten
npm run serve

# Add-in in Word laden
npm start
```

Der Dev-Server läuft auf `https://localhost:3000`.

## Projektstruktur

```
src/taskpane/
  ├── index.tsx              # Einstiegspunkt
  ├── App.tsx                # Haupt-App mit Tab-Navigation
  ├── store.ts               # Zustand Store
  ├── types.ts               # TypeScript Interfaces
  ├── components/
  │   ├── CorrectionTab.tsx   # Grammatikkorrektur
  │   ├── ProofreadTab.tsx    # Wissenschaftliches Lektorat
  │   ├── SourcesTab.tsx      # Quellenprüfung
  │   ├── StyleTab.tsx        # Stilanalyse
  │   ├── SuggestionsTab.tsx  # KI-Vorschläge
  │   ├── SettingsTab.tsx     # Einstellungen & Login
  │   └── ChunkProgress.tsx   # Fortschrittsanzeige
  ├── modules/
  │   ├── grammar.ts          # Grammatik-Analyse
  │   ├── proofread.ts        # Lektorat-Analyse
  │   ├── legitimacy.ts       # Quellen-Prüfung
  │   ├── style.ts            # Stil-Analyse
  │   ├── suggestions.ts      # Vorschlags-Generierung
  │   └── analyzeChunks.ts    # Batch-Chunk-Verarbeitung
  └── services/
      ├── openai.ts           # OpenAI OAuth + API
      ├── wordApi.ts          # Word Dokument Lesen/Schreiben
      ├── chunker.ts          # Dokument-Chunking
      └── prompts.ts          # Prompt-Templates
```

## Deployment

Pushes auf `main` deployen automatisch via GitHub Actions auf GitHub Pages.

**Live:** https://sucruf111.github.io/SchreibAssistentPro/

## Konfiguration

Vor der Nutzung muss eine OpenAI Client-ID in `src/taskpane/services/openai.ts` eingetragen werden:

```typescript
const OPENAI_CLIENT_ID = "your_client_id";
```

## Lizenz

MIT

## Links

- [Live Demo](https://sucruf111.github.io/SchreibAssistentPro/)
- [Datenschutz](https://sucruf111.github.io/SchreibAssistentPro/privacy.html)
- [Manifest (Production)](https://sucruf111.github.io/SchreibAssistentPro/manifest.xml)
