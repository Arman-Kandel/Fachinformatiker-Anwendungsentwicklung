# IHK Lernplattform

Eine statische Lernplattform für IHK-relevante Inhalte mit lokalem Browser-State, modularem Aufbau und GitHub Pages-Hosting.

## Funktionen

- modulare Lernpfade mit mehreren Inhalten
- lokale, browser-basierte Persistenz ohne Backend
- Quellenbelege je Lernmodul und Frage
- Wiederholungs-Queue für falsch beantwortete Fragen
- Mastery-Status und Prüfungsmodus für gezielte Wiederholung
- statische Auslieferung über GitHub Pages

## Lokale Entwicklung

```bash
npm install
npm run dev
```

## Build und Qualitätscheck

```bash
npm run check
```

## GitHub Pages

1. Repository in GitHub öffnen.
2. In den Einstellungen auf "Pages" gehen.
3. Als Quelle "GitHub Actions" auswählen.
4. Der Workflow in `.github/workflows/deploy-pages.yml` baut das Projekt automatisch nach jedem Push auf `main`.
5. Die Live-URL folgt dem Muster:
   `https://<github-username>.github.io/<repository-name>/`

> Die App ist bewusst statisch gehalten und speichert alle Lernzustände lokal im Browser.
