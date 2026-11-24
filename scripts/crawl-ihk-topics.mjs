/**
 * Crawler-Skript: IT-Berufe-Podcast AP1-Themenseite
 * Parst die Themenseite und extrahiert alle Themencluster als JSON.
 * ES Module, Node.js v26, keine externen Abhängigkeiten.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const SOURCE_URL =
  'https://it-berufe-podcast.de/vorbereitung-auf-die-ihk-abschlusspruefung-der-it-berufe/moegliche-themen-von-teil-1-der-gestreckten-abschlusspruefung-gap-in-den-it-berufen/';

const OUTPUT_DIR = join(PROJECT_ROOT, 'sources', 'crawled');
const OUTPUT_FILE = join(OUTPUT_DIR, 'it-berufe-podcast-ap1-topics.json');

/** Decode HTML entities in a string */
function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8216;/g, ''')
    .replace(/&#8217;/g, ''')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"');
}

/** Strip all HTML tags from a string */
function stripTags(str) {
  return str.replace(/<[^>]+>/g, '').trim();
}

/**
 * Extract the value of a named attribute from an HTML tag string.
 * e.g. extractAttr('<h2 id="FooBar">', 'id') => 'FooBar'
 */
function extractAttr(tag, attr) {
  const re = new RegExp(`${attr}=["']([^"']+)["']`, 'i');
  const m = tag.match(re);
  return m ? m[1] : null;
}

/**
 * Parse clusters from raw HTML.
 * Strategy: scan for h2/h3 tags that have an id attribute (the cluster anchors),
 * then collect the following <ul><li> items until the next heading.
 */
function parseClusters(html) {
  const clusters = [];

  // Normalize line endings and compress whitespace a bit
  const flat = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split into tokens: h2, h3, ul blocks, and everything else
  // We use a simple state-machine regex scanner
  const TOKEN_RE =
    /<h([23])[^>]*id=["']([^"']+)["'][^>]*>(.*?)<\/h\1>|<h([23])[^>]*>(.*?)<\/h\4>|<ul[^>]*>([\s\S]*?)<\/ul>/gi;

  let currentCluster = null;

  let m;
  while ((m = TOKEN_RE.exec(flat)) !== null) {
    if (m[1]) {
      // h2 or h3 with id attribute
      const level = parseInt(m[1], 10);
      const id = m[2];
      const rawTitle = m[3];
      const title = decodeEntities(stripTags(rawTitle));

      // Skip navigational / meta headings
      if (
        id.toLowerCase().includes('respond') ||
        id.toLowerCase().includes('comment') ||
        id.toLowerCase().includes('reply') ||
        title.length < 3
      ) {
        continue;
      }

      if (level === 2 || level === 3) {
        // Save previous cluster
        if (currentCluster) {
          clusters.push(currentCluster);
        }
        currentCluster = {
          id,
          title,
          anchor: `#${id}`,
          examRelevance: 'hoch',
          topics: [],
        };
      }
    } else if (m[6] !== undefined && currentCluster) {
      // <ul> block – extract <li> items
      const ulContent = m[6];
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let li;
      while ((li = liRe.exec(ulContent)) !== null) {
        const text = decodeEntities(stripTags(li[1])).replace(/\s+/g, ' ').trim();
        if (text.length > 2) {
          currentCluster.topics.push(text);
        }
      }
    }
  }

  // Don't forget last cluster
  if (currentCluster && !clusters.includes(currentCluster)) {
    clusters.push(currentCluster);
  }

  return clusters;
}

/** Fallback: manually curated clusters based on known IT-Berufe-Podcast AP1 content */
function buildFallbackClusters() {
  return [
    {
      id: 'Projektmanagement',
      title: 'Projektmanagement',
      anchor: '#Projektmanagement',
      examRelevance: 'hoch',
      topics: [
        'Merkmale eines Projekts: zeitlich befristet, relativ innovativ, risikobehaftet, erhebliche Komplexität',
        'Magisches Dreieck: Qualität, Kosten, Zeit',
        'SMARTe Ziele: spezifisch, messbar, attraktiv, realistisch, terminiert',
        'Lastenheft: was/wofür? Pflichtenheft: wie/womit?',
        'Stakeholder-Analyse: Interessen und Einfluss der Beteiligten ermitteln',
        'Risikoanalyse und Risikomatrix (Eintrittswahrscheinlichkeit × Schadenshöhe)',
        'Meilensteinplan: zeitliche Fixpunkte im Projektverlauf',
        'Projektphasen: Initiierung, Planung, Durchführung, Abschluss',
        'Projektabschlussbericht: Ergebnisse, Abweichungen, Lessons Learned',
      ],
    },
    {
      id: 'MethodenUndModelle',
      title: 'Methoden und Modelle',
      anchor: '#MethodenUndModelle',
      examRelevance: 'hoch',
      topics: [
        'Netzplantechnik: Vorgänge, Abhängigkeiten, kritischer Pfad (Gesamtpuffer = 0)',
        'Gantt-Diagramm: Balkenplan, Abhängigkeiten visualisieren',
        'Wasserfall-Modell: sequenzielle Phasen (Anforderung, Entwurf, Implementierung, Test, Wartung)',
        'Scrum: Sprint, Daily Scrum, Sprint Review, Sprint Retrospektive, Product Backlog, Sprint Backlog',
        'Scrum-Rollen: Product Owner, Scrum Master, Entwicklungsteam',
        'Kanban-Board: WIP-Limit (work in progress), Pull statt Push, Spalten entsprechen Prozessschritten',
        'V-Modell: Entwicklung und Tests verlaufen parallel (V-förmig)',
        'Spiralmodell: iterativ-inkrementell mit Risikoanalyse in jeder Iteration',
        'Prototyping: Wegwerf-, Evolutions- und Referenzprototyp',
      ],
    },
    {
      id: 'ChangeManagement',
      title: 'Change Management',
      anchor: '#ChangeManagement',
      examRelevance: 'hoch',
      topics: [
        'Change Management (Prozess zur Umsetzung von Veränderungen in Unternehmen) z.B. nach Lewin (Unfreeze, Change, Refreeze)',
        'Lewin 3-Phasen-Modell: Unfreeze (auftauen), Change (verändern), Refreeze (einfrieren)',
        'ADKAR-Modell: Awareness, Desire, Knowledge, Ability, Reinforcement',
        'Kaizen, Continuous Improvement (KVP – Kontinuierlicher Verbesserungsprozess)',
        'Widerstand gegen Veränderungen: Ursachen und Strategien zur Überwindung',
        'Change-Kommunikation: Transparenz, Beteiligung der Betroffenen',
        'Rolle der Führungskraft im Change-Prozess',
      ],
    },
    {
      id: 'Leistungserbringung',
      title: 'Leistungserbringung',
      anchor: '#Leistungserbringung',
      examRelevance: 'hoch',
      topics: [
        'Abnahmeprotokoll mit Angaben zu Vollständigkeit, Funktionseignung und Schadensfreiheit des geprüften Werks erstellen',
        'Leistungserbringung kontrollieren und protokollieren',
        'Service Level Agreement (SLA): vereinbarte Leistungsparameter',
        'Ticketsystem und Helpdesk-Prozesse (First, Second, Third Level Support)',
        'ITIL-Grundprinzipien: Incident Management, Change Management, Problem Management',
        'Betriebsübergabe: Übergabe mit Dokumentation, Einweisung',
        'Kundenzufriedenheit messen und sicherstellen',
      ],
    },
    {
      id: 'ITSicherheit',
      title: 'IT-Sicherheit',
      anchor: '#ITSicherheit',
      examRelevance: 'hoch',
      topics: [
        'Schutzziele: Vertraulichkeit, Integrität, Authentizität, Verfügbarkeit',
        'Schutzbedarfskategorien (normal, hoch, sehr hoch) ableiten und begründen',
        'BSI IT-Grundschutz: Bausteine, Gefährdungskatalog, Maßnahmen',
        'Verschlüsselung: symmetrisch (AES, DES), asymmetrisch (RSA), Hybridverschlüsselung',
        'Zertifikate und PKI (Public Key Infrastructure)',
        'Firewall-Typen: Paketfilter, Stateful Inspection, Application Layer Firewall',
        'VPN: Site-to-Site, Remote Access',
        'Phishing, Social Engineering, Man-in-the-Middle-Angriffe',
        'Zwei-Faktor-Authentifizierung (2FA) / Multi-Faktor-Authentifizierung (MFA)',
        'Backup-Verfahren: Vollbackup, inkrementelles Backup, differenzielles Backup',
        'Generationenprinzip / Großvater-Vater-Sohn-Prinzip (GVS)',
        'RAID-Systeme: RAID 0, 1, 5, 6, 10 – Verfügbarkeit und Redundanz',
      ],
    },
    {
      id: 'Wirtschaftlichkeit',
      title: 'Wirtschaftlichkeit',
      anchor: '#Wirtschaftlichkeit',
      examRelevance: 'hoch',
      topics: [
        'TCO (Total Cost of Ownership) erläutern und berechnen',
        'Make-or-buy-Entscheidung',
        'Nutzwertanalyse: gewichtete Kriterien, Punktwerte, Nutzwert',
        'Deckungsbeitrag: Stückpreis – variable Stückkosten',
        'Amortisation: Investition / Ertrag pro Jahr',
        'ROI (Return on Investment): (Gewinn / Investition) × 100',
        'Break-Even-Punkt: Fixkosten / (Stückpreis – variable Stückkosten)',
        'Leasing vs. Kauf: Vor- und Nachteile, Liquidität, Bilanz',
        'Vollkostenrechnung: Einzel- und Gemeinkosten, Zuschlagskalkulation',
      ],
    },
    {
      id: 'Angebotsvergleich',
      title: 'Angebotsvergleich',
      anchor: '#Angebotsvergleich',
      examRelevance: 'hoch',
      topics: [
        'Handelskalkulation: Listen-, Ziel-, Bareinkaufspreis, Bezugspreis, Selbstkosten, Bar-, Ziel-, Listenverkaufspreis',
        'Rabatt: prozentualer Abzug vom Listenpreis',
        'Skonto: prozentualer Abzug bei frühzeitiger Zahlung',
        'Bezugskosten: Versand, Verpackung, Fracht, Zoll',
        'Angebotsvergleich: quantitative (Preis) und qualitative (Lieferzeit, Support) Kriterien',
        'Lieferbedingungen: Incoterms (EXW, DAP, DDP usw.)',
        'Zahlungsbedingungen: Zahlungsziel, Skontofrist',
      ],
    },
    {
      id: 'Hardware',
      title: 'Hardware',
      anchor: '#Hardware',
      examRelevance: 'hoch',
      topics: [
        'CPU: Kerne, Taktfrequenz, Cache (L1, L2, L3), Hyper-Threading',
        'RAM: DDR4/DDR5, Latenz, Dual-Channel',
        'Speicher: HDD vs. SSD (NVMe, SATA), Zugriffszeiten',
        'Mainboard: Chipsatz, Formfaktor (ATX, Micro-ATX), Schnittstellen',
        'Grafikkarte: dediziert vs. integriert, VRAM',
        'Drucker: Laser, Tintenstrahl, Nadel – Vor-/Nachteile',
        'Monitor: Auflösung, Farbtiefe, Ergonomie (Höhe, Neigung, Drehung)',
        'Schnittstellen: USB (2.0/3.x/4), HDMI, DisplayPort, Thunderbolt, RJ45',
        'Ergonomie am Arbeitsplatz: Bildschirmhöhe, Beleuchtung, Tastatur-/Mausposition',
        'Hardware-Auswahl nach Anforderungsprofil (Büro, CAD, Server)',
      ],
    },
    {
      id: 'Netzwerktechnik',
      title: 'Netzwerktechnik',
      anchor: '#Netzwerktechnik',
      examRelevance: 'hoch',
      topics: [
        'OSI-Referenzmodell: 7 Schichten und ihre Protokolle',
        'TCP/IP-Modell: 4 Schichten (Netzzugang, Internet, Transport, Anwendung)',
        'IP-Adressierung: IPv4 (Klassen, CIDR, Subnetting), IPv6',
        'Subnetting: Netzadresse, Broadcast, Hostbereich berechnen',
        'Protokolle: HTTP/S, FTP, SMTP/POP3/IMAP, DNS, DHCP, SSH, Telnet',
        'Netzwerkgeräte: Hub, Switch, Router, Access Point, Firewall',
        'WLAN-Standards: 802.11 a/b/g/n/ac/ax, Frequenzbänder (2,4 GHz / 5 GHz)',
        'VLANs: logische Netztrennung, Trunk-Ports, Access-Ports',
        'Switching: MAC-Adresstabelle, Spanning Tree Protocol (STP)',
        'Netzwerktopologien: Stern, Bus, Ring, Mesh',
      ],
    },
    {
      id: 'SoftwareBetriebssysteme',
      title: 'Software / Betriebssysteme',
      anchor: '#SoftwareBetriebssysteme',
      examRelevance: 'hoch',
      topics: [
        'Betriebssystem-Arten: Windows, Linux, macOS – Einsatzbereiche',
        'Dateisysteme: FAT32, NTFS, ext4 – Unterschiede, Eigenschaften',
        'Prozess- und Speicherverwaltung: Multitasking, virtuelle Speicheradressierung',
        'Virtualisierung: Hypervisor Typ 1/2, VMs, Container (Docker)',
        'Cloud-Modelle: IaaS, PaaS, SaaS – Unterschiede und Beispiele',
        'Software-Lizenzmodelle: proprietär, Open Source (GPL, MIT), Freeware, Shareware',
        'Softwareinstallation und -verteilung: MSI, Paketmanager (apt, yum, choco)',
        'Betriebssystem-Härtung: Updates, Patchmanagement, unnecessary services deaktivieren',
      ],
    },
    {
      id: 'DatenschutzDSGVO',
      title: 'Datenschutz / DSGVO',
      anchor: '#DatenschutzDSGVO',
      examRelevance: 'hoch',
      topics: [
        'DSGVO-Grundsätze: Rechtmäßigkeit, Zweckbindung, Datensparsamkeit, Richtigkeit, Speicherbegrenzung, Integrität',
        'Rechtsgrundlagen der Verarbeitung: Art. 6 DSGVO (Einwilligung, Vertrag, rechtl. Verpflichtung, berechtigtes Interesse)',
        'Betroffenenrechte: Auskunft, Berichtigung, Löschung (Recht auf Vergessenwerden), Datenübertragbarkeit',
        'Datenschutzbeauftragter: Pflicht zur Bestellung, Aufgaben',
        'Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO)',
        'Datenschutz-Folgenabschätzung (DSFA, Art. 35 DSGVO)',
        'Auftragsdatenverarbeitung (ADV): Vertrag nach Art. 28 DSGVO',
        'Meldepflicht bei Datenpannen: 72-Stunden-Frist (Art. 33 DSGVO)',
        'BDSG (Bundesdatenschutzgesetz): nationales Ergänzungsgesetz zur DSGVO',
      ],
    },
    {
      id: 'Kundenberatung',
      title: 'Kundenberatung',
      anchor: '#Kundenberatung',
      examRelevance: 'hoch',
      topics: [
        'Kundenbedarfe zielgruppengerecht ermitteln (Anforderungsanalyse)',
        'Kommunikationsmodelle: Sender-Empfänger, 4-Ohren-Modell (Schulz von Thun)',
        'Aktives Zuhören: Paraphrasieren, Nachfragen, Zusammenfassen',
        'Präsentationstechniken: Visualisierung, Struktur, Zielgruppenansprache',
        'Verhandlungsführung: Interessen vs. Positionen, win-win',
        'Einwandbehandlung: Einwand vs. Vorwand, Techniken (Ja-aber, Bumerang)',
        'Kundendokumentation: Gesprächsprotokoll, Übergabeprotokoll',
        'Fachbegriffe verständlich erklären (zielgruppengerechte Sprache)',
      ],
    },
    {
      id: 'Vertraege',
      title: 'Verträge',
      anchor: '#Vertraege',
      examRelevance: 'hoch',
      topics: [
        'Vertragsarten: Kaufvertrag, Werkvertrag, Dienstvertrag, Mietvertrag, Leasingvertrag',
        'Vertragsbestandteile: Angebot, Annahme, Willenserklärung',
        'Mängelarten: Sachmangel, Rechtsmangel',
        'Gewährleistung vs. Garantie: gesetzliche Pflicht vs. freiwillige Leistung',
        'Gewährleistungsfristen: 2 Jahre (Neukauf), 1 Jahr (gebrauchte Sachen)',
        'Fernabsatzvertrag: Widerrufsrecht, 14-Tage-Frist',
        'Urheberrecht: Schöpfungshöhe, Nutzungsrechte, Lizenzverträge',
        'AGB (Allgemeine Geschäftsbedingungen): Einbeziehung, unwirksame Klauseln',
      ],
    },
    {
      id: 'Qualitaetssicherung',
      title: 'Qualitätssicherung',
      anchor: '#Qualitaetssicherung',
      examRelevance: 'hoch',
      topics: [
        'Qualitätsmanagement-Systeme: ISO 9001, ITIL',
        'PDCA-Zyklus: Plan, Do, Check, Act',
        'Testarten: Unit-Test, Integrations-Test, System-Test, Abnahme-Test',
        'Testmethoden: Black-Box-Test, White-Box-Test, Regressionstest',
        'Qualitätskriterien: Funktionalität, Zuverlässigkeit, Effizienz, Wartbarkeit, Portabilität (ISO 25010)',
        'Code-Reviews und statische Code-Analyse',
        'Fehlermanagement: Fehlermeldung, Fehlerklassifikation, Fehlerbehebung',
        'Metriken: Testabdeckung (Code Coverage), Fehlerrate, MTBF',
      ],
    },
    {
      id: 'SoftwareentwicklungGrundlagen',
      title: 'Softwareentwicklung Grundlagen',
      anchor: '#SoftwareentwicklungGrundlagen',
      examRelevance: 'hoch',
      topics: [
        'Algorithmen: Eigenschaften (Eindeutigkeit, Allgemeinheit, Endlichkeit, Ausführbarkeit)',
        'Datentypen: primitiv (int, float, bool, char) vs. komplex (Array, Liste, Objekt)',
        'Kontrollstrukturen: Sequenz, Selektion (if/else, switch), Iteration (for, while, do-while)',
        'Funktionen / Methoden: Parameter, Rückgabewert, Rekursion',
        'Objektorientierung: Klasse, Objekt, Attribut, Methode, Kapselung, Vererbung, Polymorphismus',
        'UML-Diagramme: Klassendiagramm, Anwendungsfalldiagramm, Aktivitätsdiagramm, Sequenzdiagramm',
        'Pseudocode und Struktogramm (Nassi-Shneiderman)',
        'Versionskontrolle: Git – commit, branch, merge, pull request',
        'Debugging: Breakpoints, Schritt-für-Schritt-Ausführung, Logging',
      ],
    },
  ];
}

async function main() {
  console.log('Starte Crawl von:', SOURCE_URL);

  let clusters = [];

  try {
    const res = await fetch(SOURCE_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; IHK-Lernplattform-Crawler/1.0; educational-purpose)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    console.log(`HTML empfangen: ${html.length} Zeichen`);

    clusters = parseClusters(html);

    if (clusters.length < 5) {
      console.warn(
        `Warnung: Nur ${clusters.length} Cluster geparst – Fallback wird verwendet.`
      );
      clusters = buildFallbackClusters();
    } else {
      console.log(`Live-Crawl erfolgreich: ${clusters.length} Cluster extrahiert.`);
    }
  } catch (err) {
    console.warn(`Netzwerkfehler oder Parse-Fehler: ${err.message}`);
    console.log('Verwende manuell gepflegte Fallback-Cluster.');
    clusters = buildFallbackClusters();
  }

  const output = {
    crawledAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    clusters,
  };

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\nFertig! ${clusters.length} Cluster geschrieben nach:`);
  console.log(OUTPUT_FILE);
  clusters.forEach((c) => console.log(`  - [${c.id}] ${c.title} (${c.topics.length} Themen)`));
}

main().catch((err) => {
  console.error('Unerwarteter Fehler:', err);
  process.exit(1);
});
