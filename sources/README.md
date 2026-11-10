# Quellen- und Nachweis-Policy

## Ziel

Diese Plattform arbeitet nach einem strikten Evidence-First-Prinzip: Jede fachliche Aussage, jeder Satz im Lernmaterial und jede Prüfungslogik muss auf eine nachvollziehbare Quelle zurückgeführt werden.

## Grundregel

- Keine fachliche Aussage ohne `sourceRefs`-Eintrag
- Keine generierte/automatisierte Aussage ohne dazugehörige Referenz
- Jede Quelle muss im Repository dokumentiert sein
- Inhalte werden nur akzeptiert, wenn die Quelle als verifizierbar markiert ist

## Ordnerstruktur

```text
sources/
├─ README.md
├─ reference-index.md
├─ official/
│  └─ README.md
├─ community/
│  └─ README.md
└─ templates/
   └─ source-entry-template.md
```

## Inhalt einer Quelle

Jede Quelle enthält mindestens:

- `sourceId`
- `title`
- `author` oder Herausgeber
- `type` (gesetzlich, offiziell, bildungsrelevant, ergänzend)
- `url` oder lokaler Pfad
- `retrievedAt`
- `notes` mit kurzer fachlicher Bedeutung
- `relevance` für AP1/AP2

## Verifikation

Eine Quelle gilt als gültig, wenn sie mindestens eine der folgenden Bedingungen erfüllt:

- offizielle Ausbildungs- oder Prüfungsdokumente
- verbindliche IHK-/BMBF-/Bildungsdokumente
- offizielle Fachstandards oder Dokumentationen
- von den Projektverantwortlichen reviewed und als vertrauenswürdig markiert

## Nicht zulässig

- Aussagen ohne Quellenhinweis
- “gelerntes Wissen” ohne Referenz
- LLM-generierte Inhalte ohne verifizierte Quelle
- subjektive Wahrheiten als Fakten darstellen

## Erwartete Nutzung im Projekt

Jede Lernmoduldatei oder Testdatei sollte eine `sourceRefs`-Liste enthalten, z. B.:

```json
{
  "sourceRefs": [
    { "sourceId": "IHK-AP1-Rahmen-2026", "quote": "..." },
    { "sourceId": "BMBF-DSD-2026", "quote": "..." }
  ]
}
```

## Verantwortung

Wenn eine Aussage nicht belegt ist, gilt sie als unzulässig. In solchen Fällen muss sie entweder:

1. mit einer validen Quelle ergänzt,
2. angepasst,
3. oder entfernt werden.

## URL-Recherche und Freigabe

Neue URLs werden zuerst als Kandidaten gesammelt und geprüft. Das Windows-Skript `scripts/research-source-urls.ps1` schreibt einen Bericht nach `sources/url-review/`; es ändert weder dieses Register noch Lerninhalte.

```powershell
./scripts/research-source-urls.ps1 `
  -Query "site:ihk.de Fachinformatiker Anwendungsentwicklung Abschlussprüfung" `
  -AllowedDomain ihk.de

./scripts/research-source-urls.ps1 `
  -CandidateUrl https://example.org/dokument `
  -AllowedDomain example.org
```

Ein erfolgreicher HTTP-Status bestätigt nur Erreichbarkeit, nicht fachliche Autorität oder Aktualität. Erst nach menschlicher Prüfung von Herausgeber, Dokumentstand und Belegbezug darf eine URL in `sources/reference-index.md` übernommen und in Lerninhalten verwendet werden. Suchergebnisse sind best effort; bei blockierter oder geänderter Suchseite können Kandidaten direkt mit `-CandidateUrl` geprüft werden.

