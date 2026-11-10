# Copilot instructions

## Grundsatz

- Behandle das Projekt als statische, lokale Lernplattform ohne Backend.
- Keine geheimen Tokens, API-Keys oder personenbezogenen Daten in Code oder Logs.
- Keine externen Runtime-Abhängigkeiten per CDN oder Remote-Script-Lader im Browser.
- Verwende für alle fachlichen Aussagen immer `sourceRefs` mit einer validierten Quelle.

## Sicherheit und Qualität

- TypeScript muss strikt aktiv sein: keine `any`, keine unsicheren Casting-Operationen, keine unbehandelten `catch`-Blöcke.
- Keine `console.log`-Ausgaben in produktivem Code, außer gezielt für Debugging und mit explizitem Review.
- Neue Funktionen müssen kleine, testbare Einheiten bleiben.
- Änderungen an Zustand, Storage oder Persistenz müssen browser-lokal und reproduzierbar bleiben.
- Verwende nur bekannte, im Repo dokumentierte Quellen und keine frei erfundenen fachlichen Behauptungen.

## Projektregeln

- Code-Änderungen müssen mit `npm run check` verifizierbar sein.
- Wenn Zustand oder Datenmodelle geändert werden, dokumentiere die Auswirkungen in den betroffenen Markdown-Dateien.
- Vor dem Commit muss geprüft werden, dass der Build und die Tests sauber durchlaufen.
