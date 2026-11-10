# Lernplattform-Plan: IHK AP1/AP2 2026/27

## 1. Ziel und Grundidee

Eine modulare Lernplattform für die IHK-Klausurvorbereitung AP1 und AP2, die über GitHub Pages läuft und vollständig clientseitig arbeitet. Die Lerninhalte werden strukturiert und lokal im Browser gespeichert. Der Fokus liegt auf:

- klarer, modulare Lernstruktur für AP1 und AP2
- einfacher Erweiterbarkeit per Commit/PR
- lokalem Fortschritt im Browser ohne Backend
- AI-freundlicher Content-Struktur
- wiederholbaren Tests mit alternativen Fragen

Die Plattform soll als statische Web-App laufen, also ohne Server, ohne Datenbank und ohne Authentifizierung. Das reduziert Komplexität und macht sie ideal für GitHub Pages.

---

## 2. Kernprinzip

Die App besteht aus drei Schichten:

1. Content Layer
   - Lernmodule
   - Fragen, Aufgaben, Lösungen, Erklärungen
   - Meta-Daten wie Bereich, Schwierigkeit, Tags, Prüfungsbezug

2. App Layer
   - Navigation
   - Lernpfad
   - Quiz-/Test-Logik
   - Wiederholungslogik
   - lokale Speicherung

3. User Data Layer
   - Fortschritt
   - Notizen
   - Quiz-Statistiken
   - Wiederholungsdaten
   - gespeicherte Tests

Diese Trennung macht das Projekt modular und leicht erweiterbar.

---

## 3. Technische Richtung

Empfohlene Stack:

- Vite + TypeScript
- GitHub Pages Deployment
- CSS mit Design-Tokens und Glassmorphism
- lokale Speicherung über localStorage oder IndexedDB
- JSON/Markdown als strukturiertes Content-Format
- Session- und State-Persistence für Resume-First UX

Warum diese Richtung?

- GitHub Pages kann statische Dateien problemlos hosten
- keine Backend-Komplexität
- stark modular und gut für PR-basierte Erweiterungen
- leicht für AI-Agenten zu analysieren und zu erweitern
- Inhalte bleiben separat vom UI und sind damit robust dokumentiert
- die App ist als Lernzustand aufgebaut, nicht als reine Inhaltsseite

---

## 4. Repository-Struktur

```text
/
├─ public/
│  ├─ assets/
│  │  ├─ illustrations/
│  │  └─ icons/
│  └─ favicon/
├─ src/
│  ├─ app/
│  │  ├─ router/
│  │  ├─ state/
│  │  ├─ storage/
│  │  ├─ content/
│  │  ├─ utils/
│  │  └─ bootstrap/
│  ├─ features/
│  │  ├─ dashboard/
│  │  ├─ learning-path/
│  │  ├─ module-view/
│  │  ├─ quiz/
│  │  ├─ repetition/
│  │  ├─ exam-sim/
│  │  └─ notes/
│  ├─ ui/
│  │  ├─ components/
│  │  ├─ layouts/
│  │  └─ theme/
│  ├─ styles/
│  │  ├─ tokens.css
│  │  ├─ glass.css
│  │  ├─ animations.css
│  │  └─ app.css
│  └─ main.ts
├─ content/
│  ├─ ap1/
│  │  ├─ 01-datenmodellierung/
│  │  │  ├─ module.json
│  │  │  ├─ quiz.json
│  │  │  └─ flashcards.json
│  │  ├─ 02-sql/
│  │  └─ index.json
│  ├─ ap2/
│  │  ├─ 01-architektur/
│  │  └─ index.json
│  ├─ shared/
│  │  ├─ tags.json
│  │  ├─ difficulty.json
│  │  └─ exam-map.json
│  └─ metadata/
│     └─ navigation.json
├─ docs/
│  ├─ contribution-guide.md
│  └─ content-schema.md
├─ package.json
├─ vite.config.ts
├─ README.md
├─ .github/
│  └─ workflows/
│     └─ deploy-pages.yml
├─ LICENSE
└─ .gitignore
```

Dieses Layout ist modular, gut lesbar und AI-freundlich.

---

## 5. Content-Model

Lerninhalte sollten nicht frei im UI liegen, sondern als strukturierte Dateien mit klaren Typen. Beispiel:

```json
{
  "id": "ap1-01-datenmodellierung",
  "exam": "AP1",
  "title": "Datenmodellierung",
  "difficulty": "mittel",
  "tags": ["DB", "ERM", "Normalformen"],
  "learningObjectives": [
    "Entitätstypen erkennen",
    "Beziehungen modellieren",
    "ER-Diagramme interpretieren"
  ],
  "sections": [
    {
      "type": "theory",
      "title": "Grundlagen",
      "content": "..."
    },
    {
      "type": "example",
      "title": "Beispiel",
      "content": "..."
    }
  ],
  "quiz": [
    {
      "id": "q-01",
      "question": "Welche Beziehung beschreibt ...?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 1,
      "explanation": "..."
    }
  ],
  "flashcards": [
    {
      "front": "Was ist eine Entität?",
      "back": "..."
    }
  ],
  "sourceRefs": [
    { "sourceId": "IHK-AP1-Rahmen-2026", "quote": "..." },
    { "sourceId": "BMBF-DSD-2026", "quote": "..." }
  ]
}
```

Das ist die zentrale Erkenntnis: Das Thema selbst ist kein UI-Block, sondern ein Datenpaket.

---

## 5.1. Quellenpflicht und Anti-Halluzinations-Policy

Diese Plattform arbeitet nach einem klaren Prinzip: Jede fachliche Aussage muss durch eine verifizierbare Quelle gestützt werden. Ohne Quelle gilt die Information als nicht tragfähig und darf nicht in den Lernpfad aufgenommen werden.

### Verbindliche Regeln

1. Jeder Satz, Paragraph oder fachliche Aussage braucht einen nachvollziehbaren Quellenhinweis.
2. Jede Quelle muss im Repository dokumentiert und referenziert sein.
3. Inhaltliche Aussagen dürfen nur dann in Lernmodulen, Erklärungen, Quizfragen oder Tests auftauchen, wenn sie mit einer `sourceRefs`-Liste hinterlegt sind.
4. LLM-generierte oder manuell formulierte Inhalte ohne Referenz zählen als unzulässig.
5. Die Quelle muss entweder lokal im Repository hinterlegt sein oder als offizielle Verweisquelle mit URL, Titel und Beschreibung im Quellenregister dokumentiert sein.
6. Wenn eine Aussage nicht belegt ist, muss sie entfernt, überarbeitet oder ersetzt werden.

### Verpflichtende Metadaten

Jedes Lernmodul und jede Testfrage sollte zusätzlich zu Inhalt und Lösung die folgenden Felder enthalten:

```json
{
  "sourceRefs": [
    {
      "sourceId": "IHK-AP1-Rahmen-2026",
      "quote": "...",
      "page": "...",
      "section": "...",
      "type": "official"
    }
  ]
}
```

### Repository-Anforderung

Das Repository muss ein zentrales Quellenregister enthalten, z. B. unter `sources/reference-index.md`. Dort werden Quellen mit eindeutiger ID, Titel, Typ, URL oder lokaler Referenz und Relevanz geführt. Einzelne Lerninhalte verweisen per `sourceId` auf dieses Register.

### Zweck

Diese Maßnahme verhindert:

- Halluzinationen durch LLMs
- ungesicherte Inhalte
- “Wissen” ohne fachlichen Nachweis
- unklaren Prüfungsbezug

Das Projekt wird dadurch strikt evidenzbasiert und sehr robust für spätere Erweiterungen, Reviews und AI-Unterstützung.

---

## 6. Wie neue Inhalte ergänzt werden

Ein neues Lernmodul oder ein neuer Prüfungsbereich soll einfach per PR hinzugefügt werden können.

Empfohlener Workflow:

1. Neuer Ordner unter `content/ap1/` oder `content/ap2/`
2. `module.json` anlegen
3. optional `quiz.json` und `flashcards.json` ergänzen
4. `index.json` aktualisieren
5. PR erstellen
6. Review und Merge

Dadurch ist das Repo sauber, nachvollziehbar und für Agenten gut automatisierbar.

---

## 7. Browser-Lokalspeicherung

Da kein Backend verwendet wird, müssen Daten lokal im Browser verwaltet werden.

### Speicherarten

- localStorage
  - Lernpfad
  - Status pro Modul
  - Notizen
  - Favoriten
  - Einstellungen

- IndexedDB
  - größere Datensätze
  - Quiz-Verlauf
  - Wiederholungsdaten
  - Lernhistorik

### Beispielstruktur

```json
{
  "progress": {
    "ap1": {
      "ap1-01-datenmodellierung": "done",
      "ap1-02-sql": "in-progress"
    }
  },
  "notes": {
    "ap1-01-datenmodellierung": "Wichtige Stichworte ..."
  },
  "quizResults": [
    {
      "moduleId": "ap1-01-datenmodellierung",
      "score": 80,
      "date": "2026-11-10"
    }
  ],
  "repetition": {
    "card-001": {
      "nextReview": "2026-11-12",
      "ease": 2.3
    }
  }
}
```

Damit bleiben alle persönlichen Daten auf dem Gerät des Nutzers.

---

## 8. Alternative Fragen und Tests

Das ist ein wichtiges Feature für die spätere Nutzung und entspricht genau dem Wunsch, verschiedene Tests mit neuen oder alternativen Fragen durchspielen zu können.

Zusätzlich ist die Test- und Lernspirale so zu planen, dass ein Nutzer nach kurzer Pause genau dort weiterkommt, wo er aufgehört hat. Das ist ein zentrales Produktkriterium: Lernen als persistenter Zustandsfluss, nicht als separate Seite.

### Ziel

Ein Test kann nicht nur aus einer festen Fragenliste bestehen, sondern aus verschiedenen Sets an alternativen Fragen.

### Grundmodell

```json
{
  "testId": "ap1-uebung-01",
  "title": "Wiederholung: Datenmodellierung",
  "questionPool": [
    { "id": "q-01", "topic": "ERM", "difficulty": "mittel" },
    { "id": "q-02", "topic": "ERM", "difficulty": "schwer" },
    { "id": "q-03", "topic": "ERM", "difficulty": "leicht" }
  ],
  "alternatives": [
    {
      "setId": "set-a",
      "questionIds": ["q-01", "q-02", "q-03"]
    },
    {
      "setId": "set-b",
      "questionIds": ["q-02", "q-04", "q-05"]
    }
  ]
}
```

### Funktionalität

- Nutzer kann Testvarianten wählen
- mehrere Prüfungs-Sets pro Thema
- alternative Fragen nach Themenbereich, Schwierigkeit und Lernziel
- “neuen Test erzeugen” aus einem Pool
- Auswahl verschiedener Varianten statt eines statischen Frageblocks

### Sinnvoller Ablauf

1. Thema wird ausgewählt
2. Fragenpool wird geladen
3. Nutzer wählt Aufgabenmodus:
   - klassische Wiederholung
   - Lernmodus
   - zufällige Alternative
   - gezielter Fokus auf Schwachstellen
4. Test wird zusammengebaut
5. Ergebnisse werden lokal gespeichert

Damit kann der Nutzer denselben Themenbereich mehrfach mit unterschiedlichen Fragen durchgehen, ohne neue Inhalte manuell anzulegen.

---

## 9. Lern- und Prüfungsfunktionen

Die App sollte folgende Kernfunktionen haben:

### Dashboard
- AP1 / AP2 Übersicht
- Lernfortschritt
- nächste Aufgaben
- Favoriten
- Wiederholungs-Hinweise

### Modullernpfad
- Reihenfolge nach Themenlogik
- Abhängigkeiten zwischen Themen
- Prüfungsrelevanz

### Quiz und Testmodi
- Single Choice
- Multiple Choice
- offene Kurzantworten
- Lückentexte
- Musterklausur

### Wiederholung
- Karteikarten
- Spaced Repetition
- Fokus auf bisher schwache Bereiche

### Exam Simulator
- Zeitlimit
- zufälliger Fragenmix
- Bewertung nach Punkten
- Analyse der Fehlerquellen

---

## 10. Design-Ansatz

Thema: lila, modern, leicht futuristisch, aber nicht unübersichtlich.

### Stilprinzipien

- violett/lila als Grundfarbe
- dunkler Hintergrund mit leichten Farbverläufen
- glasartige Karten mit Transparenz
- starke, weiche Drop Shadows
- Hover-Effekte und subtile Bewegungen
- Animationen nur als Unterstützung der Orientierung

### Designziele

- nicht überladen
- klare Lernhierarchie
- Fokus auf Inhalt statt auf “Showcase-UI”
- modulare Panels mit Wiederverwendbarkeit

---

## 11. AI-Agenten-freundlicher Aufbau

Damit die Projektentwicklung auch mit KI-Tools sauber funktioniert, müssen Inhalte und Struktur konsistent bleiben.

### Regeln

- jede Inhaltsdatei hat ein eindeutiges Schema
- Inhalte leben in separates `content/`-Verzeichnis
- UI keine harte Logik für Inhalte enthalten
- jeder Modulordner ist eigenständig
- Metadaten immer enthalten: `id`, `exam`, `title`, `difficulty`, `tags`

### Vorteile

- neue Lernmodule lassen sich leicht ergänzen
- Agenten können automatisch Inhalte strukturieren
- PRs bleiben kleiner und verständlicher
- Content-Updates sind weniger fehleranfällig

---

## 12. Mögliche nächste Entwicklungsschritte

### Phase 1
- Grundprojekt strukturieren
- erste AP1-/AP2-Module als Beispiel
- Dashboard und Lernpfad bauen
- lokale Speicherung einrichten

### Phase 2
- Quiz-Engine mit alternativen Fragen aufnehmen
- Wiederholungslogik ergänzen
- Notizen-Feature einbauen

### Phase 3
- Exam Simulator
- Lernfortschrittsstatistiken
- Darstellung von Schwachstellen

### Phase 4
- mehr Inhalte für AP1/AP2
- Testvarianten und Zufallsgenerator
- AI-gestützte Erstellung von neuen Fragesets

---

## 13. Fazit

Die Plattform soll nicht einfach nur eine Lernseite sein, sondern ein modular aufgebautes, erweiterbares Prüfungssystem für AP1 und AP2. Die Stärke liegt in der Trennung von:

- Lerninhalten
- Logik
- UI
- Benutzerstatus

Dadurch wird sie:

- leicht erweiterbar
- gut für GitHub Pages geeignet
- sauber für PRs und Commits
- robust für AI-Agenten
- ideal für wiederholte Tests mit alternativen Fragen

Das baut die Basis für eine professionelle, skalierbare Lernlösung, ohne Backend-Overhead.
