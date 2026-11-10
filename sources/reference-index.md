# Quellen-Register

## Zweck

Dieses Register dient als zentrale Referenz für alle fachlichen Inhalte der Lernplattform. Jede Quelle muss hier gelistet werden, damit die Projektbasis reproduzierbar und KI-resistent bleibt.

## Regeln

- Eintrag nur mit eindeutiger `sourceId`
- Quelle muss im Repository erreichbar sein oder als verifizierter Verweis dokumentiert sein
- Zu jeder fachlichen Aussage muss die passende `sourceId` im Lernmaterial verlinkt werden
- Neu hinzugefügte Inhalte ohne Quelle werden als fehlerhaft betrachtet

## Freigegebene Quellen

```yaml
sources: [{sourceId: FIAUSBV,
title: "Verordnung über die Berufsausbildung zum Fachinformatiker und zur Fachinformatikerin",
publisher: "Bundesministerium der Justiz / Bundesamt für Justiz",
type: official-regulation,
status: approved,
url: "https://www.gesetze-im-internet.de/fiausbv/",
retrievedAt: 2026-11-10,
reviewedAt: 2026-11-10,
relevance: [AP1, AP2-Anwendungsentwicklung],
notes: "Amtliche Verordnung einschließlich Ausbildungsrahmenplan und Regelungen zu Teil 1 sowie Teil 2 der Abschlussprüfung. Für AP2-Anwendungsentwicklung sind insbesondere §§ 10-17 relevant."}]
```

## Nicht freigegebene Beispiel-IDs

`IHK-AP1-Rahmen-2026` ist nur eine alte Platzhalter-ID aus den JSON-Beispielen und hat keine geprüfte URL. Sie ist keine freigegebene Quelle; die Beispiele dürfen nicht als fachlich validiert gelten, bis sie mit passenden Belegen aktualisiert wurden.

## Hinweis

Dieses Register ist bewusst minimal und muss im Projektverlauf erweitert werden. Jede neue fachliche Ergänzung benötigt einen neuen Eintrag in dieser Datei und einen passenden Nachweis im jeweiligen Inhalt.

## Qualitätsmaßstab

Die App darf nur dann Inhalte anzeigen, wenn die Quelle entweder:

- in diesem Register verzeichnet ist
- in einer lokalen Quelle im `sources/`-Pfad dokumentiert ist
- oder als offizielle, verifizierte Referenz mit URL und Dokumentbeschreibung im Register liegt

