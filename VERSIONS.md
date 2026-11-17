# Versionsliste & Changelog

> **Wichtig für Agents:** Bei jeder Anpassung am Codebase muss diese Datei um die vorgenommenen Änderungen ergänzt werden.

## [0.2.1] - 2026-11-17
### Behoben
- Fehlerhafte Modul-Auswahl durch unvollständige State-Initialisierung und fehlende gemeinsame Auswahl-Logik behoben.
- `data-action`-Handler wurden gegen undefinierte Variablen abgesichert; Schnelltest, Prüfung, Wiederholungs-Queue und Module-Buttons funktionieren wieder konsistent.
- Lokale Toolchain validiert: Abhängigkeiten werden über das lokale Projekt-Setup installiert und via `npm run check` verifiziert.

## [0.2.0] - 2026-11-17
### Hinzugefügt
- **100vh Single-Page UI:** Vollständig überarbeitetes Layout ohne horizontales oder vertikales Scrollen auf Seitenebene; adaptive Split-Ansicht (Sidebar + Stage).
- **Dopamine Engine (`src/lib/juice.ts`):**
  - Synthetischer Web Audio Synthesizer (Harmonische Erfolgs-Akkorde, Combo-Tonleiter, Fehler-Chimes, Siegesfanfaren).
  - Leichtgewichtiges Canvas-Partikelsystem für Konfetti-Explosionen bei richtigen Antworten und bestandener Prüfung.
  - Dynamisches XP-System ($+50 \times \text{Streak}$) und schwebende Belohnungs-Pills (`+100 XP! 🔥`).
  - Haptische visuelle Effekte: Button-Pops, Fehler-Wobble (`shake`), Glowing Border und Success-Pulsieren.
- **Portables Startskript (`start.bat`):** Ein-Klick-Starter für Windows, nutzt bevorzugt das gebündelte Node.js aus `.tools/node-v26.13.0` ohne Systeminstallation.
- **Settings-Page mit Scroll-Freigabe:** Dedizierte Einstellungsseite als einziger Bereich der Anwendung mit Scroll-Funktionalität (`overflow-y: auto`), inklusive Sound-Konfiguration, Lernstand-Reset und Einbindung der Markdown-Dateien `FEATURES.md` und `VERSIONS.md` am Seitenende.
- **Agenten-Richtlinien (`AGENTS.md`):** Standardisierte Handlungsanweisungen für autonome Coding-Agents.

### Verbessert
- Navigationsfluss durch Question-Stepper-Dots und Schnellweiterschaltung ("Nächste Frage →").
- Sound-Stummschaltung (`🔊 / 🔇`) mit lokaler Speicherung.

---

## [0.1.0] - 2026-11-10
### Hinzugefügt
- Grundlegende modulare Lernplattform für Fachinformatiker Anwendungsentwicklung (AP1).
- Lokaler Speicherstatus mit Validierung und Schutz gegen fehlerhafte Importe.
- JSON-Export- und Importfunktion für den Lernfortschritt.
- Quellenregister (`sources/catalog.json`) mit Quellennachweisen für alle Fachfragen.
- Wiederholungs-Queue für falsche Antworten und Spaced-Repetition-Priorisierung.
- 5-Minuten Kurzprüfung (Exam-Session) mit Zeitmessung und Ergebnisbewertung.
- Tagesagenda für priorisiertes Lernen ("Heute üben").
- GitHub Actions Workflow für automatisches Deployment auf GitHub Pages.
