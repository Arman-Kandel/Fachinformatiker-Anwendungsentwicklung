# Quellen-Register

## Zweck

Dieses Register dient als zentrale Referenz für alle fachlichen Inhalte der Lernplattform. Jede Quelle muss hier gelistet werden, damit die Projektbasis reproduzierbar und KI-resistent bleibt.

## Regeln

- Eintrag nur mit eindeutiger `sourceId`
- Quelle muss im Repository erreichbar sein oder als verifizierter Verweis dokumentiert sein
- Zu jeder fachlichen Aussage muss die passende `sourceId` im Lernmaterial verlinkt werden
- Neu hinzugefügte Inhalte ohne Quelle werden als fehlerhaft betrachtet
- `catalog.json` ist der maschinenlesbare Katalog; freigegebene Textbelege werden dort wortgetreu hinterlegt und per Test gegen Content-Referenzen geprüft

## Freigegebene Quellen

```yaml
sources:
	- sourceId: FIAUSBV
		title: "Fachinformatikerausbildungsverordnung"
		publisher: "Bundesministerium der Justiz / Bundesamt für Justiz"
		type: official-regulation
		status: approved
		url: "https://www.gesetze-im-internet.de/fiausbv/BJNR025000020.html"
		relevance: [AP1, AP2-Anwendungsentwicklung]
		notes: "Amtliche Verordnung einschließlich Ausbildungsrahmenplan und Abschlussprüfungsregelungen."
	- sourceId: ORACLE-DB-CONCEPTS
		title: "Oracle Database Concepts: Introduction to Oracle Database"
		publisher: "Oracle"
		type: official-documentation
		status: approved
		url: "https://docs.oracle.com/en/database/oracle/oracle-database/26/cncpt/introduction-to-oracle-database.html"
		relevance: [AP1-Datenmodellierung]
		notes: "Tabellen, Entitäten, Attribute und Zeileninstanzen."
	- sourceId: MICROSOFT-DB-NORMALIZATION
		title: "Database normalization description"
		publisher: "Microsoft Learn"
		type: official-documentation
		status: approved
		url: "https://learn.microsoft.com/en-us/previous-versions/troubleshoot/microsoft-365/microsoft-365-apps/access/database-normalization-description"
		relevance: [AP1-Datenmodellierung]
		notes: "Archivierter offizieller Beitrag zu Tabellenbeziehungen und ausgelagerten Wiederholungsgruppen."
	- sourceId: POSTGRESQL-TUTORIAL-SELECT
		title: "PostgreSQL Tutorial: Querying a Table"
		publisher: "The PostgreSQL Global Development Group"
		type: official-documentation
		status: approved
		url: "https://www.postgresql.org/docs/18/tutorial-select.html"
		relevance: [AP1-SQL]
		notes: "SELECT-Abfragen und WHERE-Filter."
	- sourceId: POSTGRESQL-TUTORIAL-JOIN
		title: "PostgreSQL Tutorial: Joins Between Tables"
		publisher: "The PostgreSQL Global Development Group"
		type: official-documentation
		status: approved
		url: "https://www.postgresql.org/docs/18/tutorial-join.html"
		relevance: [AP1-SQL]
		notes: "Join-Abfragen und Zeilenpaarung über Ausdrücke."
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

