# MVP-Technische Blueprint: modulare Lernplattform mit Quellenpflicht

## Status 2026-11-10

Die Basiskomponenten des MVP sind implementiert: zentrale App-Struktur, Module/Quiz-Daten, lokale State-Persistenz, UI-Shell mit Resume-First-Flow und erste Testabdeckung für die Lernlogik. Der Build- und Type-Check läuft erfolgreich, sodass der Code als produktionsnahe Baseline für weitere Module und Features dient.

## 1. Ziel des MVP

Das erste produktionsfähige MVP soll die Lernplattform als robuste, modular aufgebaute Static-App validieren. Es muss nicht schön sein wie ein Produkt, sondern stabil, belastbar und AI-freundlich sein.

Die Kernanforderungen des MVP sind:

- GitHub Pages Deployment
- modulare Lerninhalte aus `content/`
- klare Trennung von UI, Logik und Daten
- lokale Speicherung im Browser ohne Backend
- Tests mit alternativen Fragen und Auswahllogik
- strenge `sourceRefs`-Verpflichtung
- Validierung vor jedem Release

---

## 2. Basisarchitektur

```text
src/
├─ app/
│  ├─ bootstrap/
│  ├─ content-loader/
│  ├─ state/
│  │  ├─ app-state.ts
│  │  ├─ session-state.ts
│  │  ├─ progress-state.ts
│  │  └─ cache-state.ts
│  ├─ storage/
│  │  ├─ local-store.ts
│  │  ├─ indexeddb-store.ts
│  │  └─ migration.ts
│  ├─ routing/
│  ├─ validators/
│  ├─ cache/
│  │  ├─ memory-cache.ts
│  │  ├─ session-cache.ts
│  │  └─ asset-cache.ts
│  └─ test-engine/
├─ features/
│  ├─ resume/
│  ├─ dashboard/
│  ├─ module-view/
│  ├─ quiz/
│  ├─ repetition/
│  ├─ exam-sim/
│  └─ notes/
├─ ui/
│  ├─ components/
│  ├─ layout/
│  └─ theme/
├─ styles/
│  ├─ tokens.css
│  ├─ glass.css
│  ├─ animations.css
│  └─ app.css
└─ main.ts

public/
└─ vendor/            # checked-in browser dependencies served locally; no CDN runtime code

scripts/
├─ bootstrap-windows.ps1
└─ validate-lock.mjs

content/
├─ README.md
├─ schema/
│  ├─ module.schema.json
│  └─ test.schema.json
├─ ap1/
│  ├─ index.json
│  ├─ 01-datenmodellierung/
│  │  ├─ module.json
│  │  ├─ quiz.json
│  │  └─ flashcards.json
│  └─ 02-sql/
│     ├─ module.json
│     ├─ quiz.json
│     └─ flashcards.json
├─ ap2/
│  ├─ index.json
│  └─ 01-architektur/
│     ├─ module.json
│     ├─ quiz.json
│     └─ flashcards.json
└─ examples/
   ├─ module-example.json
   └─ test-example.json
```

### Abhängigkeiten und Windows-Setup

- Build-Werkzeuge werden in `package.json` exakt versioniert und über `package-lock.json` reproduzierbar aufgelöst.
- `scripts/bootstrap-windows.ps1` richtet Node.js lokal unter `.tools/` ein, falls keine kompatible Installation vorhanden ist. Das Windows-Archiv stammt von `nodejs.org` und wird gegen dessen SHA-256-Manifest geprüft.
- npm-Pakete werden ausschließlich über `https://registry.npmjs.org/` bezogen. Der Bootstrap prüft die Lockfile-URLs und führt anschließend `npm ci` aus.
- `.tools/`, `node_modules/` und `dist/` sind lokale oder generierte Dateien und werden nicht eingecheckt.
- `public/vendor/` ist ausschließlich für tatsächlich benötigte Browser-Laufzeitdateien vorgesehen; Build-Werkzeuge gehören nicht dorthin.

---

## 3. Datenprinzip: Inhalte sind Daten, nicht UI

Die Lernplattform muss als datengetriebene App gebaut werden. UI und Logik werden auf die Inhalte angewendet, aber nicht darin verschachtelt.

Jedes Modul ist ein eigenes Paket mit:

- allgemeine Metadaten
- fachliche Inhalte
- Lernziele
- Quizfragen
- Karten
- Quellenbelege

Das ist entscheidend, damit neue Inhalte leicht via PR hinzugefügt werden können.

Zusätzlich gilt eine zentrale UX-Prämisse: Die App arbeitet als Resume-First-Lernzustand. Das heißt, der Nutzer wird nicht in einer großen Navigation auf das Lernen geführt, sondern in einem klaren Zustandsfluss mit fortsetzbaren Lernsessions.

---

## 4. Pflicht-Schema für Lernmodule

Jedes Modul muss dieses Grundschema erfüllen:

```json
{
  "schemaVersion": "1.0.0",
  "moduleId": "ap1-01-datenmodellierung",
  "exam": "AP1",
  "title": "Datenmodellierung",
  "difficulty": "mittel",
  "status": "draft",
  "tags": ["DB", "ERM", "Normalformen"],
  "learningObjectives": [
    "Entitätstypen erkennen",
    "Beziehungen modellieren",
    "ER-Diagramme interpretieren"
  ],
  "dependencies": ["ap1-00-klausurrahmen"],
  "sourceRefs": [
    {
      "sourceId": "IHK-AP1-Rahmen-2026",
      "quote": "...",
      "section": "Rahmenkonzept",
      "type": "official"
    }
  ],
  "sections": [
    {
      "id": "s1",
      "type": "theory",
      "title": "Grundlagen",
      "content": "..."
    }
  ],
  "quiz": [
    {
      "id": "q1",
      "question": "Welche Aussage beschreibt eine Entität?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 1,
      "explanation": "...",
      "sourceRefs": [
        { "sourceId": "IHK-AP1-Rahmen-2026", "quote": "..." }
      ]
    }
  ],
  "flashcards": [
    {
      "id": "f1",
      "front": "Was ist eine Entität?",
      "back": "Eine Entität ist ...",
      "sourceRefs": [
        { "sourceId": "IHK-AP1-Rahmen-2026", "quote": "..." }
      ]
    }
  ]
}
```

### Validierungsregeln

Ein Modul gilt nur als valid, wenn:

- `moduleId` vorhanden
- `exam` vorhanden
- `title` vorhanden
- `learningObjectives` nicht leer
- `sourceRefs` vorhanden
- `quiz` nicht leer
- jeder `quiz`-Eintrag hat `correctIndex`
- jede Frage hat eine Erklärung
- jede fachliche Aussage hat Quellenverweis

---

## 5. Pflicht-Schema für Tests mit alternativen Fragen

Ein Test ist kein hartcodierter UI-Block, sondern ein eigener Datentyp mit Fragepool und Auswahllogik.

```json
{
  "schemaVersion": "1.0.0",
  "testId": "ap1-repeat-erm-01",
  "title": "Wiederholung: ERM",
  "exam": "AP1",
  "mode": "mixed",
  "questionPool": [
    {
      "id": "q-01",
      "topic": "ERM",
      "difficulty": "mittel",
      "question": "Welche Beziehung beschreibt ...?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 2,
      "explanation": "...",
      "sourceRefs": [
        { "sourceId": "IHK-AP1-Rahmen-2026", "quote": "..." }
      ]
    }
  ],
  "testSets": [
    {
      "setId": "set-a",
      "questionIds": ["q-01", "q-02", "q-03"]
    },
    {
      "setId": "set-b",
      "questionIds": ["q-01", "q-04", "q-05"]
    }
  ],
  "selectionRules": {
    "minQuestions": 3,
    "maxQuestions": 5,
    "mustIncludeTopics": ["ERM"],
    "difficultyMix": ["leicht", "mittel", "schwer"]
  },
  "sourceRefs": [
    { "sourceId": "IHK-AP1-Rahmen-2026", "quote": "..." }
  ]
}
```

### Warum das wichtig ist

Das ermöglicht im MVP bereits:

- mehrere Sets mit alternativen Fragen
- Auswahl verschiedener Varianten
- zufällige Wiederholungs-Tests
- gezielte Wiederholung nach Schwachstellen
- leichtes Hinzufügen neuer Varianten per PR

---

## 6. Test- und Wiederholungslogik

Die App darf keinen harten, festen einseitigen Quiz-Block verwenden. Stattdessen braucht sie eine Auswahl-Engine.

### Grundlogik

1. Nutze `questionPool` des gewählten Themas
2. wähle basierend auf `selectionRules`
3. lade `testSet` oder generiere eine neue Auswahl
4. prüfe Antworten
5. speichere Ergebnisse lokal
6. nutze Fehlerstatistiken für nächste Wiederholung

### Auswahltypen

- Standardtest
- Wiederholungsmodus
- Schwache-Themen-Modus
- Zufälliger Alternativtest
- Klausur-Simulationsmodus

---

## 7. Browser-Lokalspeicherung

Die Lernplattform darf keine sensiblen oder wichtigen Nutzerdaten außerhalb des Browsers speichern. Die lokale Speichermodellierung muss versioniert und sauber getrennt sein.

Für die UX ist die State Preservation hier besonders wichtig. Wenn der Nutzer kurz weg ist, muss die App nach dem Neustart exakt in den Lernzustand zurückkehren, den er zuletzt hatte.

```json
{
  "schemaVersion": "1.0.0",
  "userProfile": {
    "name": "",
    "examFocus": "AP1"
  },
  "progress": {
    "ap1-01-datenmodellierung": "done",
    "ap1-02-sql": "in-progress"
  },
  "notes": {
    "ap1-01-datenmodellierung": "Wichtige Hinweise ..."
  },
  "quizResults": [
    {
      "testId": "ap1-repeat-erm-01",
      "score": 80,
      "date": "2026-11-10"
    }
  ],
  "repetition": {
    "f1": {
      "nextReview": "2026-11-12",
      "ease": 2.3
    }
  }
}
```

### Anforderungen

- Versionskontrolle für Storage-Schema
- Migration bei Schema-Änderungen
- Trennung von Fortschritt, Notizen, Testdaten und Wiederholungsdaten
- keine unstrukturierten JSON-Blobs

---

## 8. Validierungs- und Release-Gates

Damit die App nicht schon bei frühen Versionsschritten „Live“ ist, müssen technische und fachliche Gates gelten.

### Technische Gates

- JSON-Schema validieren
- `sourceRefs` vorhanden
- alle `sourceId` im Register gefunden
- keine duplizierten `moduleId` oder `testId`
- Inhalte sind in der richtigen `content/`-Ordnerstruktur

### Fachliche Gates

- jede Frage hat Erklärung
- jede Antwort hat Beleg
- kein Lerninhalt ohne Quelle
- Prüfungsbereich klar markiert

### Release-Gates

- Build erfolgreich
- Validierungen erfolgreich
- GitHub Pages Deployment verifiziert
- Changelog vorhanden
- Rollback dokumentiert

---

## 9. MVP-Entwicklungsreihenfolge

### Phase 1: Datenmodell und Struktur

- `content/`-Layout einrichten
- `schema/` hinzufügen
- erste Beispielmodule und Testsets anlegen
- Validierungen definieren

### Phase 2: App-Logik

- Content Loader
- Modul-Renderer
- Statistik- und Fortschrittslogik
- Local Storage Manager
- Session-State Recovery
- Resume-First Startscreen

### Phase 3: Test- und Wiederholungslogik

- Fragepool-Engine
- Testset-Auswahl
- Wiederholungslogik
- Ergebnis-Speicherung
- Test-Resume nach Abbruch

### Phase 4: Caching und Performance

- Memory Cache für aktuelle Session
- Session Cache für Abschnitts- und Testzustand
- IndexedDB für Lernhistorik und Wiederholung
- Service Worker für App Shell und Asset Caching

### Phase 5: Release-Readiness

- SPA-Deployment konfigurieren
- GitHub Actions einrichten
- Validierung vor Merge definieren
- Rollback-Strategie dokumentieren

---

## 10. Was das MVP zuverlässig macht

Das MVP wird erst dann als tragfähig gelten, wenn es wirklich diese Eigenschaften erfüllt:

- Inhalte sind verifizierbar
- Testfragen sind wiederverwendbar
- Alternativfragen können zusätzlich vorhanden sein
- Lernstatus bleibt lokal und stabil
- App ist sauber modular und einfach erweiterbar
- AI-Agenten können neue Inhalte ohne manuelle UI-Umstellung hinzufügen
- der Nutzer kann nach kurzer Pause ohne Re-Login und ohne Neu-Starten weiterlernen
- die App hält den aktuellen Lernzustand mit möglichst wenig Klicks und sofort zugänglichem Resume

---

## 11. Entscheidende Designregel

Das Projekt muss als “Content-first, UI-second”-System gebaut werden. UIs können iteriert werden; Inhalte, Quellen und Logik müssen von Anfang an strukturiert und belastbar sein.

Zusätzlich gilt die UX-Regel: “State-first, interaction-light”. Der Nutzer soll nicht zwischen Screens und Entscheidungen gefangen sein, sondern einen stabilen Lernzustand mit minimaler Interaktionslast erleben.

Wenn diese Reihenfolge eingehalten wird, wird die Plattform nicht nur schön, sondern wirklich nutzbar und sicher.
