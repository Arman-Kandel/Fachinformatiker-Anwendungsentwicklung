# MVP-Technische Blueprint: modulare Lernplattform mit Quellenpflicht

## Status 2026-11-10

Statusmarker: `[x]` umgesetzt, `[~]` teilweise umgesetzt, `[ ]` offen.

Die statische MVP-Basis ist lauffähig. Sie enthält drei belegte AP1-Module, einen maschinenprüfbaren Quellenkatalog, State-Normalisierung, lokalen JSON-Export/Import, Kurzprüfung und Tagesagenda. Der Blueprint unten enthält Zielarchitektur und offene Anforderungen; er beschreibt nicht durchgehend den aktuellen Dateibaum.

### Erweiterter MVP-Stand

- [x] Content-Model als modulare Struktur im `content/`-Ordner
- [x] AP1-Module: Datenmodellierung, SQL-Grundlagen und Prüfungsrahmen
- [x] Versionierte Storage-Schicht mit Browser-/Node-Absicherung und Runtime-Normalisierung
- [x] Lernabschnitts-Flow mit persistierter Auswahl des aktuellen Abschnitts
- [x] Mastery-, Tagesagenda-, Retry- und Kurzprüfungslogik
- [x] Additive `examSession`- und `retryQuestionId`-Felder; Prüfungsantworten verändern nicht die separate Übungsstatistik
- [x] Modulbezogene Antwortschlüssel; alte unscoped Einträge bleiben erhalten
- [x] Versionierter JSON-Export/-Import
- [x] Letzter Check: TypeScript, 21 Tests und Vite Production Build erfolgreich

## 1. Ziel des MVP

Das erste produktionsfähige MVP soll die Lernplattform als robuste, modular aufgebaute Static-App validieren. Es muss nicht schön sein wie ein Produkt, sondern stabil, belastbar und AI-freundlich sein.

Die Kernanforderungen des MVP sind:

- [x] GitHub Pages Deployment-Workflow
- [x] Modulare Lerninhalte aus `content/`
- [~] Trennung von UI, Logik und Daten; Loader und Lernlogik sind getrennt, UI bleibt in einer großen `main.ts`
- [x] Lokale Speicherung im Browser ohne Backend
- [ ] Tests mit alternativen Fragenpools und Auswahllogik
- [x] `sourceRefs`-Verpflichtung mit exaktem Audit für aktuellen Content
- [~] Validierung vor Release: TypeScript, Vitest, Build und Quellenprüfung; JSON-Schema-/ID-Duplikat-Checks fehlen

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

**Status:** Zielstruktur. Tatsächlich vorhanden sind Content-Loader, Storage, Lernlogik, `main.ts`, CSS und Vitest-Tests. Separate Feature-Module, Router, IndexedDB, Service-Worker-Cache, Test-Engine und `public/vendor/` sind offen.

### Abhängigkeiten und Windows-Setup

- [x] Build-Werkzeuge sind in `package.json`/`package-lock.json` reproduzierbar fixiert.
- [x] `scripts/bootstrap-windows.ps1` richtet Node.js lokal ein und prüft das Archiv per SHA-256.
- [x] Der Bootstrap prüft npm-Registry-URLs und führt `npm ci` aus.
- [x] `.tools/`, `node_modules/` und `dist/` sind lokale oder generierte Dateien.
- [x] Keine externen Browser-Runtime-Scripts oder CDN-Abhängigkeiten; `public/vendor/` wird derzeit nicht benötigt.

---

## 3. Datenprinzip: Inhalte sind Daten, nicht UI

Die Lernplattform muss als datengetriebene App gebaut werden. UI und Logik werden auf die Inhalte angewendet, aber nicht darin verschachtelt.

Jedes Modul ist ein eigenes Paket mit:

- [x] Allgemeine Metadaten
- [x] Fachliche Inhalte und Lernziele
- [x] Quizfragen in separater `quiz.json`
- [ ] Karteikarten
- [x] Quellenbelege an Modul, Abschnitt und Frage

Das ist entscheidend, damit neue Inhalte leicht via PR hinzugefügt werden können.

Zusätzlich gilt eine zentrale UX-Prämisse: Die App arbeitet als Resume-First-Lernzustand. Das heißt, der Nutzer wird nicht in einer großen Navigation auf das Lernen geführt, sondern in einem klaren Zustandsfluss mit fortsetzbaren Lernsessions.

---

## 4. Pflicht-Schema für Lernmodule

Jedes Modul muss dieses Grundschema erfüllen.

**Status:** Das folgende JSON ist ein Ziel-/Beispielschema, kein aktueller Laufzeitvertrag. Aktuell fehlen `schemaVersion`, Flashcards und eingebettete Quizdaten; `module.json` und `quiz.json` sind getrennt. Quellen-IDs müssen aus `sources/catalog.json` stammen.

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
      "sourceId": "ORACLE-DB-CONCEPTS",
      "quote": "A table describes an entity such as employees.",
      "section": "Schema Objects > Tables",
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
        {
          "sourceId": "ORACLE-DB-CONCEPTS",
          "quote": "A table describes an entity such as employees.",
          "section": "Schema Objects > Tables"
        }
      ]
    }
  ],
  "flashcards": [
    {
      "id": "f1",
      "front": "Was ist eine Entität?",
      "back": "Eine Entität ist ...",
      "sourceRefs": [
        {
          "sourceId": "ORACLE-DB-CONCEPTS",
          "quote": "A table describes an entity such as employees.",
          "section": "Schema Objects > Tables"
        }
      ]
    }
  ]
}
```

### Validierungsregeln

Ein Modul gilt nur als valid, wenn:

- [x] `moduleId`, `exam` und `title` vorhanden
- [x] `learningObjectives` und Modul-`sourceRefs` nicht leer
- [~] Quizfragen haben Erklärungen und Quellen; Bereichsprüfung des `correctIndex` fehlt
- [x] Aktueller Modul-/Abschnitts-/Quizcontent ist gegen freigegebene Quellenbelege getestet
- [ ] Vollständige JSON-Schema-Validierung aller Dateien

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
        {
          "sourceId": "MICROSOFT-DB-NORMALIZATION",
          "quote": "Normalization is the process of organizing data in a database. It includes creating tables and establishing relationships between those tables according to rules designed both to protect the data and to make the database more flexible by eliminating redundancy and inconsistent dependency.",
          "section": "Description of normalization"
        }
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
    {
      "sourceId": "MICROSOFT-DB-NORMALIZATION",
      "quote": "Normalization is the process of organizing data in a database. It includes creating tables and establishing relationships between those tables according to rules designed both to protect the data and to make the database more flexible by eliminating redundancy and inconsistent dependency.",
      "section": "Description of normalization"
    }
  ]
}
```

### Warum das wichtig ist

Das ermöglicht im MVP bereits:

- [ ] Mehrere Sets mit alternativen Fragen
- [ ] Auswahl verschiedener Varianten
- [ ] Zufällige Wiederholungs-Tests
- [~] Gezielte Wiederholung nach Fehlversuchen
- [~] Neue feste Modul-/Quizdateien per PR; Varianten-Schema fehlt

---

## 6. Test- und Wiederholungslogik

Die App darf keinen harten, festen einseitigen Quiz-Block verwenden. Stattdessen braucht sie eine Auswahl-Engine.

### Grundlogik

1. [ ] `questionPool` des gewählten Themas nutzen
2. [ ] Auswahl anhand von `selectionRules` treffen
3. [ ] `testSet` laden oder eine neue Auswahl generieren
4. [x] Antworten in modulbezogenen Quizfragen prüfen
5. [~] Fortschritt lokal speichern; separate Ergebnisse je Testsitzung fehlen
6. [~] Fehlversuche zur nächsten Wiederholung nutzen; Fehlerstatistik ist nicht historisiert

### Auswahltypen

- [x] Standardtest / Schnelltest
- [x] Wiederholungsmodus für Fehlversuche
- [~] Schwächenfokus über offene Wiederholungs-Queue
- [ ] Zufälliger Alternativtest
- [~] Zeitbegrenzte Kurzprüfung je Modul; keine fachübergreifende Klausursimulation

---

## 7. Browser-Lokalspeicherung

Die Lernplattform darf keine sensiblen oder wichtigen Nutzerdaten außerhalb des Browsers speichern. Die lokale Speichermodellierung muss versioniert und sauber getrennt sein.

Für die UX ist die State Preservation hier besonders wichtig. Wenn der Nutzer kurz weg ist, muss die App nach dem Neustart exakt in den Lernzustand zurückkehren, den er zuletzt hatte.

**Status:** Der folgende State-Entwurf mit Profil, Notizen, Testhistorie und Spaced-Repetition-Feldern ist ein Zielbild. Der Ist-State enthält Modul-/Abschnittsauswahl, Antworten, Fortschritt, Wiederholungsqueue, aktive Prüfungsrunde und Retry-Cursor.

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

- [x] Versionskontrolle für Storage-Payload
- [~] Runtime-Normalisierung und Legacy-Kompatibilität; kein versionsübergreifendes Migrationsframework
- [~] Fortschritt, Antworten, Wiederholungen und Prüfungssession sind strukturiert; Notizen/Testhistorie fehlen
- [x] Strukturierter, versionierter App-State; Export verwendet ein eigenes bekanntes Format

---

## 8. Validierungs- und Release-Gates

Damit die App nicht schon bei frühen Versionsschritten „Live“ ist, müssen technische und fachliche Gates gelten.

### Technische Gates

- [ ] JSON-Schema validieren
- [x] `sourceRefs` für aktuelle Module, Abschnitte und Fragen vorhanden
- [x] Alle aktuellen Quellen-IDs und Zitate im Katalog gefunden
- [ ] Automatischer Check auf duplizierte `moduleId`, `questionId` oder `testId`
- [x] Aktueller Content liegt in der `content/`-Ordnerstruktur

### Fachliche Gates

- [x] Jede aktuelle Frage hat Erklärung
- [~] Beleg ist pro Aussage/Frage referenziert; semantische Deckung bleibt ein Review-Schritt
- [x] Aktuelle Lerninhalte haben registrierte Quellenbelege
- [x] Prüfungsbereich ist im Modul markiert

### Release-Gates

- [x] Build erfolgreich (`npm run check`)
- [~] TypeScript, Tests, Build und Quellen-Audit laufen; Schema-/Duplikatvalidierung fehlt
- [~] GitHub-Pages-Workflow ist eingerichtet; aktueller Live-Deploy nicht geprüft
- [ ] Changelog vorhanden
- [ ] Rollback dokumentiert

---

## 9. MVP-Entwicklungsreihenfolge

### Phase 1: Datenmodell und Struktur

- [x] `content/`-Layout einrichten
- [x] Schema-Beispiele angelegt; automatischer Schema-Check offen
- [~] Drei belegte AP1-Module; Testsets und AP2-Beispiele fehlen
- [~] Quellen-/Modulprüfung vorhanden; vollständige Strukturvalidierung offen

### Phase 2: App-Logik

- [x] Content Loader
- [x] Modul-Renderer
- [~] Fortschritt pro Modul; zeitlicher Verlauf/Statistiken fehlen
- [x] Local Storage Manager mit Fallback und Normalisierung
- [x] Session-State Recovery und JSON-Sicherung
- [x] Resume-First Startscreen

### Phase 3: Test- und Wiederholungslogik

- [ ] Fragepool-Engine
- [ ] Testset-Auswahl
- [x] Wiederholungslogik
- [~] Modulfortschritt gespeichert; getrennte Testergebnis-Historie fehlt
- [x] Aktive Kurzprüfung wird nach Reload fortgesetzt

### Phase 4: Caching und Performance

- [~] Memory-Fallback bei blockiertem Storage; kein separater Session-Cache
- [x] Abschnitts- und Prüfungszustand im App-State gespeichert
- [ ] IndexedDB für Lernhistorik und Wiederholung
- [ ] Service Worker für App Shell und Asset Caching

### Phase 5: Release-Readiness

- [x] SPA-Deployment konfigurieren
- [x] GitHub Actions einrichten
- [~] `npm run check` und Quellen-Audit; JSON-Schema-/Duplicate-ID-Checks offen
- [ ] Rollback-Strategie dokumentieren

---

## 10. Was das MVP zuverlässig macht

Das MVP wird erst dann als tragfähig gelten, wenn es wirklich diese Eigenschaften erfüllt:

- [x] Aktuelle Inhalte sind über Quellenkatalog und Original-URLs prüfbar
- [~] Quizfragen sind pro Modul wiederverwendbar; Pool-Engine fehlt
- [ ] Alternativfragen können zusätzlich vorhanden sein
- [x] Lernstatus bleibt lokal und kann exportiert/importiert werden
- [~] App ist modular strukturiert, aber Loader und UI brauchen weitere Aufteilung
- [~] Neue Inhalte sind vom UI getrennt, müssen aber noch im Content-Loader registriert werden
- [x] Der Nutzer kann nach kurzer Pause ohne Re-Login im gespeicherten Zustand fortsetzen
- [x] Resume und Tagesagenda sind direkt erreichbar; mehrere Hauptaktionen bleiben sichtbar

---

## 11. Entscheidende Designregel

Das Projekt muss als “Content-first, UI-second”-System gebaut werden. UIs können iteriert werden; Inhalte, Quellen und Logik müssen von Anfang an strukturiert und belastbar sein.

Zusätzlich gilt die UX-Regel: “State-first, interaction-light”. Der Nutzer soll nicht zwischen Screens und Entscheidungen gefangen sein, sondern einen stabilen Lernzustand mit minimaler Interaktionslast erleben.

Wenn diese Reihenfolge eingehalten wird, wird die Plattform nicht nur schön, sondern wirklich nutzbar und sicher.
