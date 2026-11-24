# Agent Guidelines - IHK Lernplattform

Leitfaden für KI-Coding-Agents (Copilot, Gemini, Claude, Cursor etc.).

## 1. Architektur im Überblick
- **Stack:** TypeScript, Vite, Vanilla DOM (kein React/Vue Framework-Overhead), Vitest.
- **Persistenz:** Ausschließlich browser-lokales `localStorage` via normalisierter Serialisierung (`src/app/storage/local-store.ts`).
- **Laufzeit:** 100% statisch, offline-fähig, keine externen CDN-Skripte oder Backend-Dienste.
- **Tools:** Lokales portables Node.js in `.tools/node-v26.13.0`, Ausführung via `start.bat` oder `cmd /c npm <cmd>`.

## 2. Pflichten für Agents bei Code-Änderungen
1. **VERSIONS.md pflegen:** Jede Änderung muss in `VERSIONS.md` mit Datum und Stichpunkten protokolliert werden.
2. **Tests & Build ausführen:** Vor Abschluss immer sicherstellen, dass Tests und Build fehlerfrei sind:
   ```cmd
   cmd /c npm test
   cmd /c npm run build
   ```
3. **Quellen-Integrität:** Fachliche Lerninhalte oder Prüfungsfragen müssen mit `sourceRefs` auf validierte Quellen in `sources/catalog.json` verweisen.
4. **Single-Page Constraint:** Das Layout ist als 100vh Single-Page Cockpit konzipiert. Vermeide globale Seiten-Scrollbalken; nutze stattdessen interne Panels mit `min-height: 0; overflow-y: auto`.
5. **Dopamine & Feedback:** Behalte Audio- und Visuelles Feedback (Confetti, XP, Streak, Sounds aus `src/lib/juice.ts`) bei Interaktionen bei.
6. **Rückwärtskompatibilität & Progress-Erhalt:** Alle Daten- und Schema-Änderungen müssen strikt abwärtskompatibel sein. Schema-Updates oder neue Module dürfen unter keinen Umständen vorhandenen Fortschritt (gespeicherte Antworten, Quoten, XP, Queues) der Nutzer löschen oder invalidieren.
