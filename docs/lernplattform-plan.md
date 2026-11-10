# Lernplattform-Plan: IHK AP1/AP2 2026/27

## Status 2026-11-10

Statusmarker: `[x]` umgesetzt, `[~]` teilweise umgesetzt, `[ ]` offen.

Der Projektstand enthält eine lauffähige Vite/TypeScript-Basis, drei belegte AP1-Module, Browser-Persistenz, Quellenregister und GitHub-Pages-Workflow. AP2, alternatives Testset-Management, Karteikarten, Notizen und Spaced Repetition sind noch nicht implementiert.

### Fortschritt der zweiten Implementierungsstufe

- [x] Modulare Content-Loader und zentraler Module-Index
- [x] AP1-Modul `SQL-Grundlagen` inkl. Quiz
- [x] AP1-Modul `Prüfungsrahmen`, belegt durch §§ 7 und 8 FIAusbV
- [x] Robuster localStorage-/Memory-Fallback
- [x] Persistierte Lernabschnitt-Auswahl mit Wiederaufnahme im UI
- [x] Erneut beantwortbare Fehlversuche ohne doppelte Fortschrittszählung
- [x] Mastery-, Tagesagenda- und Wiederholungslogik
- [x] Zeitbegrenzte Kurzprüfung mit lokalem Sitzungsfortschritt und Ergebnisreview
- [x] Quellenkatalog mit geprüftem Zitat-Audit und klickbaren Originalquellen
- [x] Versionierter JSON-Export/Import und Runtime-Normalisierung des Lernstands
- [x] Qualitätslauf (`npm run check`): 21 Tests, TypeScript und Build erfolgreich

### Offene Produktarbeit

- [~] AP1-Content ausbauen: derzeit drei Module; ein vierter Themenbereich ist noch nicht registriert
- [ ] AP2-Inhalte ergänzen
- [ ] Alternativ-Fragenpools und zufällige Testvarianten
- [ ] Karteikarten und Spaced Repetition
- [ ] Notizen, Favoriten und Lernhistorie
- [~] Prüfungsmodus ausbauen: aktuell drei Fragen pro ausgewähltem Modul, noch keine fachübergreifende Musterklausur

## 1. Ziel und Grundidee

Eine modulare Lernplattform für die IHK-Klausurvorbereitung AP1 und AP2, die über GitHub Pages läuft und vollständig clientseitig arbeitet. Die Lerninhalte werden strukturiert und lokal im Browser gespeichert. Der Fokus liegt auf:

- [~] Lernstruktur für AP1 und AP2; aktuell gibt es nur AP1-Module
- [x] Erweiterbarkeit per Commit/PR
- [x] Lokaler Fortschritt ohne Backend
- [~] AI-freundliche Content-Struktur mit Quellenkatalog; automatische Schemaprüfung fehlt
- [ ] Wiederholbare Tests mit alternativen Fragen

Die Plattform soll als statische Web-App laufen, also ohne Server, ohne Datenbank und ohne Authentifizierung. Das reduziert Komplexität und macht sie ideal für GitHub Pages.

---

## 2. Kernprinzip

Die App besteht aus drei Schichten:

1. Content Layer
  - [x] Lernmodule
  - [x] Quizfragen, Lösungen und Erklärungen
  - [x] Metadaten wie Bereich, Schwierigkeit, Tags und Prüfungsbezug

2. App Layer
  - [x] Navigation zwischen Modulen und Abschnitten
  - [~] Lernpfad in Katalogreihenfolge; kein konfigurierbarer Pfad
  - [~] Quiz- und Kurzprüfungslogik; alternative Pools fehlen
  - [x] Wiederholungslogik für Fehlversuche
  - [x] Lokale Speicherung

3. User Data Layer
  - [x] Modulfortschritt
  - [ ] Notizen
  - [~] Trefferquote je Modul; keine getrennte Quizhistorie
  - [x] Wiederholungsdaten
  - [ ] Gespeicherte Testläufe

Diese Trennung macht das Projekt modular und leicht erweiterbar.

---

## 3. Technische Richtung

Empfohlene Stack:

- [x] Vite + TypeScript
- [x] GitHub Pages Deployment via GitHub Actions
- [~] CSS-Designsystem: bestehende Tokens und Panels, aber kein separates Komponenten-/Theme-System
- [~] Browser-lokale Speicherung: versioniertes `localStorage` mit Memory-Fallback; IndexedDB ist nicht umgesetzt
- [x] JSON als strukturiertes Content-Format
- [x] Session- und State-Persistence für Resume-First UX

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
src/
├─ app/
│  ├─ content-loader/
│  └─ storage/
├─ lib/
├─ main.ts
└─ styles.css
content/
└─ ap1/
  ├─ 01-datenmodellierung/
  ├─ 02-sql/
  ├─ 03-pruefungsrahmen/
  └─ index.json
sources/
└─ catalog.json
tests/
.github/
└─ workflows/deploy-pages.yml
```

Dieses Layout ist modular, gut lesbar und AI-freundlich.

**Status:** Das Diagramm zeigt die aktuelle Kernstruktur. Offen sind separate `features/`-Module, Router, IndexedDB, Service-Worker-Cache, Karteikarten und AP2-Verzeichnisse.

---

## 5. Content-Model

Lerninhalte sollten nicht frei im UI liegen, sondern als strukturierte Dateien mit klaren Typen. Beispiel:

```json
{
  "moduleId": "ap1-01-datenmodellierung",
  "exam": "AP1",
  "title": "Datenmodellierung",
  "difficulty": "mittel",
  "tags": ["DB", "ERM"],
  "learningObjectives": ["Datenmodelle aus Anforderungen ableiten"],
  "dependencies": [],
  "sourceRefs": [
    {
      "sourceId": "FIAUSBV",
      "quote": "Datenmodelle und Strukturen aus fachlichen Anforderungen ableiten",
      "section": "Anlage, Berufsbildposition 4 Buchstabe a",
      "type": "official"
    }
  ],
  "sections": [
    {
      "id": "s1",
      "type": "theory",
      "title": "Grundlagen",
      "content": "...",
      "sourceRefs": [
        {
          "sourceId": "ORACLE-DB-CONCEPTS",
          "quote": "A table describes an entity such as employees.",
          "section": "Schema Objects > Tables",
          "type": "official"
        }
      ]
    }
  ]
}
```

**Status:** Das Beispiel beschreibt ein konzeptionelles Datenpaket. Im Ist-Zustand liegen Modul- und Quizdaten in getrennten JSON-Dateien; `sourceRefs` werden für Module, Abschnitte und Fragen verlangt und durch `sources/catalog.json` geprüft.

Das ist die zentrale Erkenntnis: Das Thema selbst ist kein UI-Block, sondern ein Datenpaket.

---

## 5.1. Quellenpflicht und Anti-Halluzinations-Policy

Diese Plattform arbeitet nach einem klaren Prinzip: Jede fachliche Aussage muss durch eine verifizierbare Quelle gestützt werden. Ohne Quelle gilt die Information als nicht tragfähig und darf nicht in den Lernpfad aufgenommen werden.

### Verbindliche Regeln

1. [~] Jeder fachliche Satz braucht Beleg; `sourceRefs` sind pro Abschnitt/Frage erfasst, Satz-für-Satz-Prüfung fehlt.
2. [x] Jede Quelle ist im Repository dokumentiert und referenziert.
3. [x] Aktuelle Module, Abschnitte und Fragen besitzen `sourceRefs`.
4. [x] Content ohne Referenz wird durch den Quellen-Audit-Test zurückgewiesen.
5. [x] Quellen sind über ID, URL, Titel und Belege im Register dokumentiert.
6. [~] Unbelegbare Aussagen werden im Content-Review überarbeitet; automatische semantische Prüfung fehlt.

**Umsetzungsstatus:** Quellenpflicht und Zitatregister sind vorhanden; der automatische Test prüft registrierte Originalauszüge für alle aktuellen Modul-, Abschnitts-, Quiz- und Indexreferenzen. Die semantische Prüfung, ob jedes einzelne Satzteil vollständig durch das Zitat gedeckt ist, bleibt ein Review-Schritt.

### Verpflichtende Metadaten

Jedes Lernmodul und jede Testfrage sollte zusätzlich zu Inhalt und Lösung die folgenden Felder enthalten:

```json
{
  "sourceRefs": [
    {
      "sourceId": "POSTGRESQL-TUTORIAL-JOIN",
      "quote": "They combine rows from one table with rows from a second table, with an expression specifying which rows are to be paired.",
      "section": "2.6 Joins Between Tables",
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

1. [x] Neuen Ordner unter `content/ap1/` oder `content/ap2/` anlegen.
2. [x] `module.json` anlegen.
3. [~] `quiz.json` ergänzen; `flashcards.json` ist noch nicht implementiert.
4. [x] `index.json` aktualisieren.
5. [x] PR/Commit erstellen.
6. [x] Review und Merge durchführen.

**Status:** `[x]` Ordner, Modul-/Quizdateien und AP1-Index; `[x]` Review-/Merge-Workflow über Git; `[ ]` Flashcards; `[ ]` vollständige AP2-Struktur.

Dadurch ist das Repo sauber, nachvollziehbar und für Agenten gut automatisierbar.

---

## 7. Browser-Lokalspeicherung

Da kein Backend verwendet wird, müssen Daten lokal im Browser verwaltet werden.

### Speicherarten

- [x] localStorage: Auswahl von Modul/Abschnitt, Antworten, Wiederholungen, Fortschritt und aktive Prüfung
- [x] Memory-Fallback bei blockiertem Browser-Storage
- [x] JSON-Export und validierter Import als lokale Sicherung
- [ ] Notizen, Favoriten und allgemeine Einstellungen

- [ ] IndexedDB für größere Datensätze, Lernhistorik und umfangreiche Wiederholungsdaten

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

- [ ] Nutzer kann Testvarianten wählen
- [ ] Mehrere Prüfungs-Sets pro Thema
- [ ] Alternative Fragen nach Themenbereich, Schwierigkeit und Lernziel
- [ ] Neuen Test aus einem Fragenpool erzeugen
- [~] Gezielt üben und Antworten wiederholen; derzeit nur feste Quizfragen pro Modul

### Sinnvoller Ablauf

1. [x] Thema/Modul wird ausgewählt.
2. [~] Modulquiz wird geladen; ein eigenständiger Fragenpool fehlt.
3. [~] Schnelltest, Lernen, Wiederholen und Kurzprüfung sind wählbar; Zufallsalternative fehlt.
4. [x] Ein Quizdeck oder eine Kurzprüfung wird zusammengestellt.
5. [~] Antworten/Fortschritt werden lokal gespeichert; separate Ergebnis-Historie fehlt.

Damit kann der Nutzer denselben Themenbereich mehrfach mit unterschiedlichen Fragen durchgehen, ohne neue Inhalte manuell anzulegen.

---

## 9. Lern- und Prüfungsfunktionen

Die App sollte folgende Kernfunktionen haben:

### Dashboard
- [~] AP1-/AP2-Übersicht: AP1 vorhanden, AP2 fehlt
- [x] Lernfortschritt pro Modul
- [x] Nächste Aufgaben über Tagesagenda
- [ ] Favoriten
- [x] Wiederholungs-Hinweise

### Modullernpfad
- [~] Reihenfolge nach Themenlogik: Katalogreihenfolge, noch kein frei konfigurierbarer Lernpfad
- [~] Abhängigkeiten in Metadaten, noch keine UI-seitige Sperr-/Voraussetzungslogik
- [~] Prüfungsbezug per AP1-Metadaten, noch kein AP2-Katalog

### Quiz und Testmodi
- [x] Single Choice
- [ ] Multiple Choice
- [ ] Offene Kurzantworten
- [ ] Lückentexte
- [~] Kurzprüfung pro Modul mit Timer und Ergebnisreview; keine fachübergreifende Musterklausur

### Wiederholung
- [ ] Karteikarten
- [ ] Spaced Repetition
- [~] Fokus auf Fehlversuche über Wiederholungs-Queue und Tagesagenda

### Exam Simulator
- [x] Zeitlimit in der Kurzprüfung
- [ ] Zufälliger, fachübergreifender Fragenmix
- [~] Trefferquote und Ergebnisreview je Kurzprüfung
- [~] Fehleranalyse über Antwortfeedback und Wiederholungs-Queue, noch keine Statistik über Versuche

---

## 10. Design-Ansatz

**Status:** Das bestehende UI nutzt aktuell dunkle Flächen, Violett, Panels und CSS-Variablen. Das folgende Farb-/Glassmorphism-Konzept ist teilweise umgesetzt und bleibt ein Zielbild, kein Abnahmekriterium.

Thema: lila, modern, leicht futuristisch, aber nicht unübersichtlich.

### Stilprinzipien

- [x] Violett/Lila als Grundfarbe
- [x] Dunkler Hintergrund mit Farbverläufen
- [~] Transparente Panels; kein separates Glassmorphism-Komponentensystem
- [x] Weiche Drop Shadows
- [x] Hover-Effekte und subtile Bewegungen
- [~] Begrenzte Übergänge; keine umfassende Bewegungs-/Accessibility-Prüfung

### Designziele

- [~] Nicht überladen; UI-Review nur stichprobenartig
- [x] Klare Lernhierarchie
- [x] Fokus auf Inhalt statt Showcase
- [~] Panels sind wiederverwendbar gestylt, aber keine eigenständige Komponentenbibliothek

---

## 11. AI-Agenten-freundlicher Aufbau

Damit die Projektentwicklung auch mit KI-Tools sauber funktioniert, müssen Inhalte und Struktur konsistent bleiben.

### Regeln

- [~] Eindeutige Content-Schemas: JSON-Formate existieren; automatischer JSON-Schema-Check fehlt
- [x] Inhalte leben im separaten `content/`-Verzeichnis
- [~] UI hält Inhalte datengetrieben; Module/Quizsets werden derzeit noch explizit im Loader registriert
- [x] Modulordner enthalten eigenständige Modul- und Quizdateien
- [x] Metadaten enthalten `moduleId`, `exam`, `title`, `difficulty` und `tags`

### Vorteile

- [~] Neue Lernmodule lassen sich ergänzen; Loader-Registrierung erfordert noch Codeänderung
- [~] Agenten können strukturierte Dateien erzeugen; automatische Schemavalidierung fehlt
- [x] Contentänderungen sind auf Dateien/Module begrenzt
- [~] Quellen-Audit reduziert Fehler; fachliche Review bleibt erforderlich

---

## 12. Mögliche nächste Entwicklungsschritte

### Phase 1
- [x] Grundprojekt strukturieren
- [~] Erste AP1-Module als Beispiel; AP2-Beispiel fehlt
- [~] Dashboard und Resume-First-Lernansicht; kein vollständiger Modullernpfad
- [x] Lokale Speicherung einrichten

### Phase 2
- [ ] Quiz-Engine mit alternativen Fragen
- [x] Wiederholungslogik ergänzen
- [ ] Notizen-Feature einbauen

### Phase 3
- [~] Exam Simulator: zeitbegrenzte Kurzprüfung je Modul
- [~] Lernfortschritt pro Modul; Verlaufstrends fehlen
- [~] Fehlversuche sichtbar; aggregierte Schwachstellenanalyse fehlt

### Phase 4
- [~] Mehr AP1-Inhalte; AP2-Inhalte fehlen
- [ ] Testvarianten und Zufallsgenerator
- [ ] AI-gestützte Erstellung neuer Fragesets

---

## 13. Fazit

Die Plattform soll nicht einfach nur eine Lernseite sein, sondern ein modular aufgebautes, erweiterbares Prüfungssystem für AP1 und AP2. Die Stärke liegt in der Trennung von:

- Lerninhalten
- Logik
- UI
- Benutzerstatus

Dadurch wird sie:

- [~] Erweiterbar, aber Loader-Registrierung ist noch explizit
- [x] Für GitHub Pages geeignet
- [x] Für PRs und Commits strukturiert
- [~] Für AI-Agenten gut strukturiert; vollständige Schema-Gates fehlen
- [ ] Für wiederholte Tests mit alternativen Fragen ausgelegt

Das baut die Basis für eine professionelle, skalierbare Lernlösung, ohne Backend-Overhead.
