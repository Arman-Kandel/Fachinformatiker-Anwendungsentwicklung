# Produktionssicherungs-Plan und Launch-Fehleranalyse

## Status 2026-11-10

Statusmarker: `[x]` umgesetzt, `[~]` teilweise umgesetzt, `[ ]` offen.

Die technischen Basismaßnahmen sind implementiert und `npm run check` besteht aktuell mit 21 Tests, TypeScript und Production-Build. Inhaltliche Breite, vollständige Schema-/Duplicate-ID-Validierung, Rollback und externe Live-Deploy-Prüfung bleiben offen.

### Reale Produktionsverbesserungen

- [x] Storage-Fallback verhindert Laufzeitfehler in Test-/CI-Umgebungen
- [x] State-Normalisierung verwirft beschädigte Felder einzeln; gesperrtes oder fehlschlagendes `localStorage` fällt auf Memory-Storage zurück
- [x] Versionierter JSON-Export und validierter Import sichern/wiederherstellen den Lernstand lokal
- [x] Modulare Lernmodule ermöglichen Content-Erweiterung; vollständige dynamische Loader-Discovery fehlt
- [x] Persistierte Lernabschnitt-Auswahl schützt den Resume-First-Workflow
- [~] Mastery, Tagesagenda, Kurzprüfung und Wiederholung; kein vollwertiger fachübergreifender Exam Simulator
- [x] Projektcheck mit TypeScript-, Test- und Build-Evidenz bestanden

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
- [x] Jedes aktuelle Modul hat `sourceRefs`
- [~] Aktuelle fachliche Abschnitte und Fragen haben Belege; semantische Prüfung jedes einzelnen Satzes bleibt Review-Aufgabe
- [x] Jede aktuelle Quizfrage ist mit Quelle und Lernzweck erfasst
- [x] Quellen- und Prüfungsbelege liegen im Repo und werden in der UI angezeigt

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
- [x] `content/` ist eigenständiger Bereich
- [~] UI liest strukturierte Modul-/Quizdaten; das Laufzeitschema wird noch nicht per JSON Schema validiert
- [~] Content wird durch Modul- und Quellenchecks validiert; weitere Struktur-/ID-Gates fehlen
- [x] Content wird über strukturierte JSON-Dateien geändert

### 3.3 Keine Validierung und keine Qualitätsgates

Problem:
- keine Prüfungen für Schema, Quellen, falsche Fragen, fehlende Metadaten
- keine automatische Überprüfung der Content-Struktur
- kein Unterschied zwischen “lokal okay” und “produktiv freigegeben”

Rückwärtslogik:
- Das System war nur auf dem Papier stabil, nicht in der Realität
- Ein GitHub-Pages-Launch ohne CI-Checks ist kein produktionsreifer Release

Produktionslösung:
- [~] Content-Validierung vor Merge über `npm run check` und Quellen-Audit; kein CI-Gate für JSON Schema
- [ ] Strukturelle JSON-Schema-Checks für alle Dateien
- [x] Automatischer Quellenpflicht-/Zitatregister-Test für aktuellen Content
- [~] Modulvalidierung prüft Lernziele/Sections; vollständige Quizfeld- und Duplicate-ID-Checks fehlen
- [~] Qualitätslauf ist vorhanden; formaler Release-Prozess/Changelog fehlt

### 3.4 Keine robuste User-Data-Strategie

Problem:
- lokale Speicherung war nicht sauber modelliert
- Fortschritt, Notizen, Quiz-Statistiken und Wiederholung konnten inkonsistent werden
- Browser-Storage war nicht versioniert

Rückwärtslogik:
- Wenn der Zustand des Nutzers nicht stabil ist, bricht der Lernfluss zusammen
- Die App kann optisch gut sein, aber der Lernfortschritt bricht, sobald der Benutzer die Seite erneut öffnet

Produktionslösung:
- [x] Versionierter `storage`-Payload
- [~] Normalisierung und Legacy-Kompatibilität; kein versionsübergreifendes Migrationsframework
- [x] JSON-Backup/Import des lokalen App-States
- [~] Fortschritt, Antworten, Reviews und Prüfungssession sind typisiert; Notizen/Testhistorie fehlen

### 3.5 Die Testlogik war nicht modular genug

Problem:
- Tests waren fest verdrahtet und nicht erweiterbar
- alternative Fragen oder neue Varianten waren nicht vorgesehen
- Wiederholtests waren nicht sauber als eigener Mechanismus modelliert

Rückwärtslogik:
- Ein Lernsystem ist nur dann langlebig, wenn Tests als Daten- und Generator-Mechanismus modelliert werden
- Ein Test muss als “Fragenpool + Regeln + Auswahllogik” gebaut werden, nicht als hartcodiertes Formular

Produktionslösung:
- [ ] `questionPool` anlegen
- [ ] `testSet` als eigenen Datentyp implementieren
- [ ] `alternateVariants` als Auswahl-Mechanik implementieren
- [ ] Randomisierungs-, Schwierigkeits- und Themenregeln

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
- [~] Release-Checkliste ist im Dokument definiert, aber noch nicht als verbindlicher Prozess eingeführt
- [~] Deployment-Workflow baut bei Push; zusätzliche Content-Gates fehlen
- [x] Mindestcheck `npm run check` vor Änderungen dokumentiert und lokal verfügbar
- [ ] Rollback-Strategie dokumentiert

---

## 4. Produktionssicherheitsprinzipien

### 4.1 Evidence-first

Alle fachlichen Inhalte müssen mit Nachweis kommen. Eine Aussage ohne Referenz ist nicht produktionsreif.

**Status:** `[~]` Quellenkatalog und exakter Zitat-Audit sind aktiv; semantische Prüfung jedes einzelnen Satzes bleibt manuell.

### 4.2 Datenfirst

Die Lernplattform ist kein Designprojekt, sondern ein Datenprojekt. Wenn die Datenstruktur falsch ist, scheitert die App.

**Status:** `[x]` Content ist vom UI getrennt und Quellenreferenzen sind strukturierte Daten; Schema-/Duplicate-ID-Checks fehlen.

### 4.3 Modularität vor Schönheit

Design kann nachgezogen werden. Erst die modulare Stabilität macht das System nutzbar.

**Status:** `[~]` Content und Lernlogik sind modular; `main.ts` und Content-Loader sind noch nicht in Feature-Module zerlegt.

### 4.4 Keine versteckten Abhängigkeiten

Jedes Modul muss eigenständig verstanden werden, ohne die gesamte App zu kennen.

**Status:** `[~]` Module/Quizdateien sind eigenständig, aber jedes neue Modul muss derzeit im Loader registriert werden.

### 4.5 AI-resistent statt AI-reliant

AI-Agenten dürfen die Plattform unterstützen, aber sie müssen auf klare Strukturen und Regeln treffen, nicht auf unstrukturiertes “Freitext-Wissen”.

**Status:** `[~]` Agentenregeln, Quellenkatalog und Tests bestehen; vollständige automatische Schema-Validierung fehlt.

---

## 5. Verbindliche Produktionsanforderungen

### 5.1 Technische Anforderungen

- [~] GitHub-Pages-Workflow ist eingerichtet; Content-Schema-Validierung vor Deploy fehlt
- [x] Keine geheimen Daten oder Tokens im Frontend
- [~] Browser-only Datenlokalisierung und State-Normalisierung vorhanden; Schema-Migration ist nicht vollständig
- [~] App ist lokal nutzbar und hat JSON-Backup/Import; Memory-Fallback überlebt keinen Seitenneustart
- [x] Initialisierung und Build sind klein; keine auffälligen Latenzprobleme im lokalen Smoke-Test

### 5.2 Content-Anforderungen

- [~] Aktuelle Abschnitte und Fragen besitzen `sourceRefs`; pro Einzelsatz gibt es keine automatisierte semantische Prüfung
- [x] Module verfügen über `moduleId`, `exam`, `title`, `difficulty`, `tags` und `learningObjectives`
- [x] Aktuelle Quizfragen haben Erklärung und registrierte Quelle
- [ ] Testsets und Alternativen in einem definierten Schema

### 5.3 Qualitätsanforderungen

- [ ] Alle JSON-Dateien gegen JSON Schema validieren
- [x] Alle aktuellen Module sind im AP1-Index gelistet
- [~] Aktuelle Quizdateien enthalten vollständige Antworten; generischer Pflichtfeld-/Indexbereichscheck fehlt
- [ ] Automatischer Check auf doppelte oder widersprüchliche Content-IDs

### 5.4 Release-Anforderungen

- [~] `npm run check` ist vorhanden; Branch Protection/erzwungener Merge-Gate nicht geprüft
- [~] Build/Test/Quellenfehler schlagen lokal fehl; vollständige Content-Validierung ist offen
- [ ] Jede Release hat eine Changelog-Notiz
- [ ] Rollback ist dokumentiert und praktisch geprüft

---

## 6. Für den realen Launch relevante Prüfungen

### 6.1 Inhaltsvalidierung

Vor dem Merge muss geprüft werden:

- [x] `sourceRefs` vorhanden
- [x] Alle `sourceIds` im Katalog enthalten; aktuelle Zitate werden wortgetreu geprüft
- [~] Keine leeren `question`-Felder in den aktuellen Dateien; generischer Pflichtfeld-Validator fehlt
- [~] Antworten sind in den aktuellen Dateien eindeutig; automatischer Bereichs-/Duplikatcheck fehlt
- [x] Tags und Lernziele an aktuellen Modulen vorhanden

### 6.2 Testvalidierung

Vor dem Merge muss geprüft werden:

- [~] Fragen sind Modulen zugeordnet; formale Topic-Validierung fehlt
- [~] Aktuelle `correctIndex`-Werte sind handgeprüft; automatischer Bereichscheck fehlt
- [ ] Alternativen auf Varianten und Duplikate prüfen
- [ ] Testsets gegen ihren `questionPool` validieren

### 6.3 Storage-Validierung

Vor dem Merge muss geprüft werden:

- [x] Schema-Version im Storage-Payload vorhanden
- [~] Alte Raw-States werden normalisiert; versionsübergreifende Migrationen fehlen
- [~] Fortschritt und Antworten werden normalisiert; Notizen sind nicht implementiert

### 6.4 UI-Validierung

Vor dem Merge muss geprüft werden:

- [~] Desktop und Mobile manuell geprüft; kein automatisierter Viewport-Check
- [~] Geprüfte Screens ohne Überlauf; kein systematischer Lauf für alle Zustände
- [~] Kontrast wurde punktuell geprüft; kein automatisierter Kontrast-Gate
- [x] Keine Animationen, die den Prüfungs-/Lernfluss blockieren

---

## 7. Release-Checklist für die Plattform

### Entwicklung

- [x] Inhalte sind in `content/` modelliert
- [x] `sourceRefs` sind gesetzt
- [x] Quellen sind im `sources/`-Register und `sources/catalog.json` verzeichnet
- [x] Aktuelle Module validieren ohne Fehler
- [~] Aktuelle Quizfragen sind vollständig; generische Schema-/Indexvalidierung fehlt
- [ ] Test-Varianten sind definiert

### Review

- [~] Aktuelle Inhalte sind mit offiziellen Stellen gegengeprüft; unabhängiges fachliches Review steht aus
- [x] Quellen und Originalauszüge wurden nachvollzogen
- [~] Automatischer Quellenbelegtest besteht; semantisches Review aller Aussagen bleibt offen
- [~] Lern-UI ist funktional; formale Nutzungsprüfung fehlt
- [x] UI bleibt ohne störende Animationen; Layout wurde in Desktop/Mobile-Stichproben geprüft

### Release

- [x] Build erfolgreich (`npm run check`)
- [~] TypeScript, Tests, Quellen-Audit erfolgreich; vollständige Schema-/Duplicate-ID-Validierung fehlt
- [~] GitHub-Pages-Workflow vorhanden; Live-Deployment nicht aktuell verifiziert
- [ ] Rollback-Strategie dokumentiert
- [ ] Changelog und Release-Status veröffentlicht

---

## 8. Leitlinien für AI-Agenten im Projekt

AI-Agenten sollen nur unter klaren Regeln agieren. Das verhindert, dass sie Inhalte unverifiziert generieren.

### Regeln

1. [x] Keine aktuelle fachliche Aussage ohne Referenz.
2. [x] Keine aktuelle Testfrage ohne `sourceRefs`.
3. [~] Neue Module haben Tests/Runtime-Validierung; JSON-Schema-Check fehlt.
4. [~] Offizielle Belege werden nachvollzogen; unabhängiges fachliches Review ist nicht durchgängig dokumentiert.
5. [x] Neue Quellen müssen im Quellenkatalog registriert sein.

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
