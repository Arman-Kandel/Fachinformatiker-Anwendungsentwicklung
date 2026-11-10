# Produktionssicherungs-Plan und Launch-Fehleranalyse

## Status 2026-11-10

Die frühere Philosophie der Sicherheits- und Qualitätsarbeit wurde in die technische Projektbasis übersetzt: strenge TypeScript-Checks, zentrale Agenten-Regeln, definierter Qualitätslauf (`npm run check`), modulare Datenquellen und robuste Persistenz-Schicht. Der Stack ist damit deutlich robuster für spätere Erweiterungen und für AI-gestützte Entwicklung.

### Reale Produktionsverbesserungen

- Storage-Fallback verhindert Laufzeitfehler in Test- und CI-Umgebungen
- modulare Lernmodule erlauben klarere Validierung und Erweiterung
- persistierte Lernabschnitt-Auswahl schützt den Resume-First-Workflow
- das Projekt erfüllt einen echten Checklauf mit Test- und Build-Evidenz

## 1. Ausgangspunkt

Wir gehen davon aus, dass der Launch der Lernplattform in der ersten Version miserabel gescheitert ist. Nicht aus einem Zufall, sondern wegen einer klaren Reihe systemischer Mängel:

- Inhalte waren nicht belastbar genug
- fachliche Aussagen standen ohne Nachweis da
- die App war zu fragile für reale Nutzung
- viele Features waren visuell ansprechend, aber fachlich und technisch unzuverlässig
- es gab keine Schemas, keine Validierung, keine Release-Checks
- es gab keine klare Trennung zwischen Lerninhalten, Logik und Nutzerstatus
- die Plattform war für AI-Agents eher ein Hindernis als eine gute Arbeitsbasis

Die richtige Antwort ist nicht “mehr Design”, sondern “mehr Stabilität, mehr Verifizierbarkeit und mehr Qualitätskontrolle”.

---

## 2. Methode: Rückwärts analysieren vom gescheiterten Launch

Wir betrachten den Launch als ein reales Produktionsereignis und fragen rückwärts:

1. Was war der unmittelbare Nutzerfehler?
2. Welche technische oder organisatorische Ursache lag dahinter?
3. Welche Architekturentscheidung hat das ermöglicht?
4. Welches System muss als Schutzmaßnahme eingeführt werden?

Diese Rückwärtsanalyse ist die Grundlage für einen robusten Produktionsplan.

---

## 3. Hauptursachen des Fehlers

### 3.1 Inhalte waren nicht wissenschaftlich oder fachlich belastbar

Problem:
- Lerninhalte waren zu frei formuliert
- Inhalte konnten nicht nachgewiesen werden
- es gab keine zentrale Quellen- und Beleglogik
- Prüfungsinhalt war inhaltsmäßig nicht sauber trennbar

Rückwärtslogik:
- Ohne `sourceRefs` und Quellen-Register werden fachliche Inhalte unzulässig
- Ohne Verifikation fehlt Vertrauen
- Ohne Vertrauen scheitert jede Lernplattform, selbst wenn UI und Design gut aussehen

Produktionslösung:
- jedes Modul braucht `sourceRefs`
- alle fachlichen Aussagen müssen durch Referenzen abgesichert werden
- jede neue Frage muss mit einer Quelle und einem Zweck verknüpft werden
- Quellen- und Prüfungsbelege sind Teil des Repos, nicht nur der UI

### 3.2 Inhalte und App-Logik waren nicht sauber getrennt

Problem:
- Lerninhalte waren stark mit UI und Logik vermischt
- Änderung eines Themenbereichs konnte ganze Seiten beschädigen
- neue Fragen konnten die App logisch destabilisieren
- AI-Agents hätten ohne klare Struktur zu viel geraten

Rückwärtslogik:
- Wenn Inhalte nicht sauber modelliert sind, ist das System nicht skalierbar
- Wenn UI und Inhalt nicht getrennt sind, kann keine saubere PR-Strategie funktionieren

Produktionslösung:
- `content/` ist eigenständiger Bereich
- UI liest Daten aus einem klaren Schema
- Content wird validiert, nicht “im Kopf” gepflegt
- jede Änderung erfolgt über strukturierte Dateiänderungen

### 3.3 Keine Validierung und keine Qualitätsgates

Problem:
- keine Prüfungen für Schema, Quellen, falsche Fragen, fehlende Metadaten
- keine automatische Überprüfung der Content-Struktur
- kein Unterschied zwischen “lokal okay” und “produktiv freigegeben”

Rückwärtslogik:
- Das System war nur auf dem Papier stabil, nicht in der Realität
- Ein GitHub-Pages-Launch ohne CI-Checks ist kein produktionsreifer Release

Produktionslösung:
- Content-Validierung vor Merge
- strukturelle JSON-Checks
- Prüfungen für Quellenpflicht
- Disallow-Checks für leere Inhalte, unvollständige Fragen, fehlende Lernziele
- release-basierte Qualitätssicherung

### 3.4 Keine robuste User-Data-Strategie

Problem:
- lokale Speicherung war nicht sauber modelliert
- Fortschritt, Notizen, Quiz-Statistiken und Wiederholung konnten inkonsistent werden
- Browser-Storage war nicht versioniert

Rückwärtslogik:
- Wenn der Zustand des Nutzers nicht stabil ist, bricht der Lernfluss zusammen
- Die App kann optisch gut sein, aber der Lernfortschritt bricht, sobald der Benutzer die Seite erneut öffnet

Produktionslösung:
- `storage`-Schema mit Versionskontrolle
- Migrationslogik bei Datenänderungen
- Backups / Export-Funktion
- lokale Daten klar getrennt nach Fortschritt, Notizen, Tests, Wiederholungsdaten

### 3.5 Die Testlogik war nicht modular genug

Problem:
- Tests waren fest verdrahtet und nicht erweiterbar
- alternative Fragen oder neue Varianten waren nicht vorgesehen
- Wiederholtests waren nicht sauber als eigener Mechanismus modelliert

Rückwärtslogik:
- Ein Lernsystem ist nur dann langlebig, wenn Tests als Daten- und Generator-Mechanismus modelliert werden
- Ein Test muss als “Fragenpool + Regeln + Auswahllogik” gebaut werden, nicht als hartcodiertes Formular

Produktionslösung:
- `questionPool` anlegen
- `testSet` als eigener Datentyp
- `alternateVariants` als definierte Auswahl-Mechanik
- `randomizationRules`, `difficultyRules`, `topicRules`

### 3.6 Keine reale Operational Readiness

Problem:
- kein Release-Prozess
- keine Rollback-Strategie
- kein Qualitäts-Linting
- keine Definition von “bereit für Production”

Rückwärtslogik:
- Ohne Release-Gate ist jeder Commit potenziell “Live”
- GitHub Pages macht Deployment leicht, aber nicht automatisch stabil

Produktionslösung:
- Definition einer Release-Checkliste
- Deployment nur nach Validierung
- minimale Produktions-Checks vor Merge in `main`
- dokumentierte Rollback-Strategie

---

## 4. Produktionssicherheitsprinzipien

### 4.1 Evidence-first

Alle fachlichen Inhalte müssen mit Nachweis kommen. Eine Aussage ohne Referenz ist nicht produktionsreif.

### 4.2 Datenfirst

Die Lernplattform ist kein Designprojekt, sondern ein Datenprojekt. Wenn die Datenstruktur falsch ist, scheitert die App.

### 4.3 Modularität vor Schönheit

Design kann nachgezogen werden. Erst die modulare Stabilität macht das System nutzbar.

### 4.4 Keine versteckten Abhängigkeiten

Jedes Modul muss eigenständig verstanden werden, ohne die gesamte App zu kennen.

### 4.5 AI-resistent statt AI-reliant

AI-Agenten dürfen die Plattform unterstützen, aber sie müssen auf klare Strukturen und Regeln treffen, nicht auf unstrukturiertes “Freitext-Wissen”.

---

## 5. Verbindliche Produktionsanforderungen

### 5.1 Technische Anforderungen

- GitHub Pages-Deployment nur mit validierten statischen Assets
- keine geheimen Daten oder Tokens im Frontend
- Browser-only Datenlokalisierung mit klarer Migration
- App muss offline-/lokal nutzbar sein, aber ohne Datenverlust
- keine eklatanten Latenzprobleme bei der Initialisierung

### 5.2 Content-Anforderungen

- Jeder Lernsatz hat eine `sourceRef`
- jedes Modul verfügt über `id`, `exam`, `title`, `difficulty`, `tags`, `learningObjectives`
- Quizfragen sind mit Begründung und Quelle dokumentiert
- Testsets und Alternativen sind in einem definierten Schema erfasst

### 5.3 Qualitätsanforderungen

- alle JSON-Dateien validieren
- alle Module müssen im Standard-Index gelistet sein
- keine unvollständigen Quizfragen oder fehlenden Antworten
- keine doppelten oder widersprüchlichen Content-IDs

### 5.4 Release-Anforderungen

- nur merges mit erfolgreichem Validation-Check
- falls Content-Fehler erkannt werden → Blockierung des Release
- jede Release hat eine kurze Changelog-Notiz
- Rollback muss innerhalb kurzer Zeit möglich sein

---

## 6. Für den realen Launch relevante Prüfungen

### 6.1 Inhaltsvalidierung

Vor dem Merge muss geprüft werden:

- existiert `sourceRefs`?
- sind alle `sourceIds` im Register enthalten?
- gibt es leere `question`-Felder?
- sind Antworten eindeutig?
- sind Tags und Lernziele vorhanden?

### 6.2 Testvalidierung

Vor dem Merge muss geprüft werden:

- entspricht der Frage einem vorhandenen Thema?
- wurde ein korrekter `correctIndex` angegeben?
- sind Alternativen wirklich alternative Varianten, kein Duplikat?
- haben Testsets die richtige `questionPool`-Beziehung?

### 6.3 Storage-Validierung

Vor dem Merge muss geprüft werden:

- Schema-Version vorhanden?
- Migration bei altem Speicher definiert?
- Notizen und Fortschritte bleiben konsistent?

### 6.4 UI-Validierung

Vor dem Merge muss geprüft werden:

- mobile und desktop nutzbar
- keine Textüberläufe
- keine unlesbaren Farbkombinationen
- Animationen stören nicht den Lernfluss

---

## 7. Release-Checklist für die Plattform

### Entwicklung

- [ ] Inhalte sind in `content/` modelliert
- [ ] `sourceRefs` sind gesetzt
- [ ] Quellen sind im `sources/`-Register verzeichnet
- [ ] Module validieren ohne Fehler
- [ ] Quizfragen validieren ohne konsekutive Fehler
- [ ] Test-Varianten sind definiert

### Review

- [ ] fachlicher Inhalt wurde geprüft
- [ ] Quellen wurden nachvollzogen
- [ ] keine unbewiesenen Aussagen
- [ ] Design stört die Lernaufnahme nicht
- [ ] UI bleibt trotz Animationen klar und stabil

### Release

- [ ] Build erfolgreich
- [ ] Validierung erfolgreich
- [ ] GitHub Pages Deployment funktioniert
- [ ] Rollback-Strategie dokumentiert
- [ ] Changelog und Status bekannt

---

## 8. Leitlinien für AI-Agenten im Projekt

AI-Agenten sollen nur unter klaren Regeln agieren. Das verhindert, dass sie Inhalte unverifiziert generieren.

### Regeln

1. Keine fachliche Aussage ohne Referenz.
2. Keine neue Testfrage ohne `sourceRefs`.
3. Keine neue Modul-Definition ohne Schema-Check.
4. Keine umstrittene Aussage ohne Review.
5. Jeder neue Inhalt muss in den Quellen-Index gelistet werden.

### Sinn

AI hilft im System, aber nicht bei der fachlichen Wissensbildung ohne Beleg. Das ist der wichtigste Schutz gegen Halluzinationen.

---

## 9. Das eigentliche Lern daraus

Wenn der Launch “miserabel” scheitert, dann nicht wegen fehlender Grafik, sondern wegen fehlender Produktionslogik:

- nicht genug fachliche Belastbarkeit
- nicht genug Struktur
- keine Validierung
- keine Qualitätsgrenzen
- keine robusten Daten-Mechaniken

Die Lösung ist daher kein “mehr glänzende UI”, sondern eine gründliche Produktionsreife:

- source-evident content
- schema-based modules
- modular test generation
- persistent local user state
- CI- und release-checks
- klare Verantwortlichkeiten

---

## 10. Schlussfolgerung

Die Plattform wird erst dann produktionsreif, wenn sie im Kern nicht nur schön aussieht, sondern:

- fachlich belastbar ist,
- technisch stabil ist,
- modular erweiterbar bleibt,
- für AI-Agenten gut strukturierte Daten liefert,
- und für reale Nutzung durch klare Qualitätsregeln abgesichert ist.

Das gescheiterte Launch-Szenario ist damit kein Schreckbild, sondern ein nützliches Design-Feedback: Genau dort, wo das System ohne Verifikation, Struktur und Kontrolle war, muss die Architektur jetzt produziert werden.
