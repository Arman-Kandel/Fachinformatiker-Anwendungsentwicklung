# Quellen-Register

## Zweck

Dieses Register dient als zentrale Referenz für alle fachlichen Inhalte der Lernplattform. Jede Quelle muss hier gelistet werden, damit die Projektbasis reproduzierbar und KI-resistent bleibt.

## Regeln

- Eintrag nur mit eindeutiger `sourceId`
- Quelle muss im Repository erreichbar sein oder als verifizierter Verweis dokumentiert sein
- Zu jeder fachlichen Aussage muss die passende `sourceId` im Lernmaterial verlinkt werden
- Neu hinzugefügte Inhalte ohne Quelle werden als fehlerhaft betrachtet

## Beispiel-Register

```yaml
sourceId: IHK-AP1-Rahmen-2026
title: IHK Rahmenkonzept AP1
publisher: IHK
type: official
status: required
url: https://www.ihk.de/
localPath: sources/official/ihk-ap1-rahmen-2026.md
notes: Grundlegendes Prüfungsrahmenwerk für AP1-Teilbereiche.

sourceId: IHK-AP2-Rahmen-2026
title: IHK Rahmenkonzept AP2
publisher: IHK
type: official
status: required
url: https://www.ihk.de/
localPath: sources/official/ihk-ap2-rahmen-2026.md
notes: Grundlegendes Prüfungsrahmenwerk für AP2-Teilbereiche.

sourceId: BMBF-DSD-2026
title: Bildungsstandards / DSD-Hintergrund
publisher: BMBF / Bildungsministerium
type: official
status: recommended
url: https://www.bmbf.de/
localPath: sources/official/bmbf-dsd-2026.md
notes: Fachliche Rahmenbedingungen für Ausbildung und Prüfungsinhalte.
```

## Hinweis

Dieses Register ist bewusst minimal und muss im Projektverlauf erweitert werden. Jede neue fachliche Ergänzung benötigt einen neuen Eintrag in dieser Datei und einen passenden Nachweis im jeweiligen Inhalt.

## Qualitätsmaßstab

Die App darf nur dann Inhalte anzeigen, wenn die Quelle entweder:

- in diesem Register verzeichnet ist
- in einer lokalen Quelle im `sources/`-Pfad dokumentiert ist
- oder als offizielle, verifizierte Referenz mit URL und Dokumentbeschreibung im Register liegt

