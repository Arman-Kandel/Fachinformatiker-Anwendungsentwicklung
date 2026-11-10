# Content-Ordner

## Zweck

Dieser Ordner enthält alle Lerninhalte der Plattform. Alles, was fachliche Inhalte, Quizfragen, Lernmodule und Testsets beschreibt, liegt hier.

## Regeln

- Inhalte sind strukturiert und nicht hardcoded im UI
- jede fachliche Aussage braucht einen `sourceRefs`-Eintrag
- Module und Tests müssen dem entsprechenden Schema folgen
- neue Inhalte immer per PR ergänzen
- kein Inhalt ohne registrierte Quelle

## Ordnerstruktur

```text
content/
├─ README.md
├─ schema/
│  ├─ module.schema.json
│  └─ test.schema.json
├─ ap1/
│  ├─ index.json
│  └─ 01-datenmodellierung/
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

## Speicherprinzip

- `module.json`: Definition des Lernmoduls
- `quiz.json`: Fragen und Antworten des Moduls
- `flashcards.json`: Wiederholungs-Karten
- `index.json`: Navigations- und Kategorisierungseinträge
- `test`-Dateien: Testsets mit alternativen Fragevarianten

## Qualitätssicherung

Vor dem Merge muss gelten:

- alle `sourceRefs` sind gültig
- alle `questionId`s vorhanden
- keine unvollständigen Antworten
- alle Module sind im Index aufgeführt
- keine doppelten IDs
