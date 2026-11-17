# Key Features & Goodies - IHK Lernplattform

Eine Übersicht aller Kernfunktionen, Spezial-Goodies und didaktischen Mechanismen der Anwendung.

## 🎯 Kernfunktionen (Core Features)

1. **Prüfungsorientierte Lernmodule (AP1)**
   - Modulbasiertes Lernen abgestimmt auf den Ausbildungsrahmenplan für Fachinformatiker Anwendungsentwicklung (FIAUSBV).
   - Verknüpfung von theoretischem Grundlagenwissen und praxisnahen Multiple-Choice-Fragen.

2. **Geprüfte Quellenbelege (Verified Sources)**
   - Jedes Modul, jeder Theorieabschnitt und jede Frage ist mit offiziellen Quellen belegt (z. B. FIAUSBV, PostgreSQL Doku).
   - Direkte Absprünge zu den Primärquellen im Web.

3. **Intelligente Tagesagenda ("Heute üben")**
   - Automatische Priorisierung von noch offenen oder früher falsch beantworteten Fragen.
   - Kein Suchen nach dem nächsten Lernschritt – ein Klick startet die optimale Lerneinheit.

4. **Spaced Repetition & Wiederholungs-Queue**
   - Falsch beantwortete Fragen landen automatisch in der Wiederholungs-Queue.
   - Sofortiges Re-Testing oder gezieltes Abarbeiten über den Queue-Button.

5. **Prüfungssimulation (Exam Cockpit)**
   - 5-Minuten-Prüfungslauf mit Timer, Fragenkatalog und abschließender detaillierter Auswertung (Score, %-Ergebnis, Frage-für-Frage Analyse).

6. **Lokaler Datenschutz & Portabilität**
   - 100% Client-Side: Keine Server-Logs, keine Nutzer-Tracking, keine Cloud-Abhängigkeit.
   - Vollständiger JSON-Export und validierter JSON-Import des gesamten Lernfortschritts.

---

## ⚡ Goodies & Dopamine Mechanics

1. **Synthesized Web Audio (Zero-Asset)**
   - Echtzeit-generierte Chimes und harmonische Akkorde über die browser-native Web Audio API.
   - Tonhöhe und Akkordfolge eskalieren mit der Antwort-Serie (Streak).
   - Echte Siegesfanfare bei bestandener Prüfung.
   - Dezenter Ein-Klick-Mute-Button (`🔊 / 🔇`).

2. **Canvas Confetti Cannon**
   - Partikelexplosionen direkt am Klickpunkt bei korrekten Antworten.
   - Vollbild-Konfetti-Brunnen beim Erreichen von Meilensteinen und bestandenen Prüfungen.

3. **Gamification HUD (XP & Streak)**
   - **🔥 Streak-Flamme:** Pulsierender Flammeneffekt bei kontinuierlich richtigen Antworten.
   - **⭐ Multiplikator-XP:** $+50 \times \text{Streak}$ XP pro gelöster Aufgabe.
   - **Schwebende Belohnungs-Badges:** Animierte `+100 XP! 🔥 2x STREAK`-Pills steigen auf.

4. **Micro-Interactions & Haptics**
   - Tastender Feedback-Wobble (`shake`) bei Fehlern zur sanften Fehlerkorrektur.
   - Lebendige Pop- und Glow-Animationen bei Treffern.
   - Interaktive Progress-Dots für intuitive Orientierung innerhalb des Fragenblocks.

5. **Standalone Windows-Ready**
   - Mitgelieferte, portable Node.js-Laufzeit (`.tools/node-v26.13.0`).
   - `start.bat` startet den Entwicklungsserver und öffnet den Browser automatisch mit einem Doppelklick.
