# Funktionen

Alles, was Wichtel kann – nach Rolle sortiert. Die Kurzfassung steht im [README](../README.md).

## Für Helfende

- **Registrierung** mit E-Mail-Bestätigung (ohne Mailserver entfällt sie), Login, Passwort
  vergessen, Profil. Zusätzliche Angaben werden erst abgefragt, wenn sie gebraucht werden.
- **Schichten buchen auf dem Handy**: Programm nach Tagen, Filter (Tag, Bereich, freie Plätze,
  meine, abzugeben), Eintragen mit einem Tipp. Überschneidungen und Mindestpausen werden verhindert.
- **Austragen** bis zu einer Frist; danach über die Schichtbörse oder die Leitung.
- **Warteliste** für volle Positionen mit automatischem Nachrücken.
- **Schichtbörse und Tausch**: eigene Schicht für alle anbieten oder einer Person per E-Mail; die
  Person kann übernehmen oder eine eigene Schicht im Tausch vorschlagen.
- **Gruppen** per Einladungslink: gegenseitig sehen, wer wann hilft, und sich gemeinsam eintragen –
  die anderen bekommen einen reservierten Platz mit Ablaufzeit.
- **Punkte und Goodies**: Punkte für jede geleistete Schicht, Goodies selbst auswählen;
  Pflicht-Goodies (z. B. das Freiticket) werden automatisch zuerst eingelöst oder erstattet.
- **Persönlicher QR-Code** für Check-in und Goodie-Ausgabe.
- **Qualifikationen** nachweisen (Ankreuzen oder Dokument hochladen).
- **Orte mit Plan und Karte**: Treffpunkte auf dem eigenen Geländeplan, auf OpenStreetMap (erst nach
  Zustimmung geladen) und als Link zu Google Maps/Apple Karten.
- **Kalender-Abo** (iCal) mit allen eigenen Schichten.
- **E-Mails** bei Buchung, Änderung, Absage, Nachrücken und als Erinnerung vor der Schicht.
- **Meine Daten**: alles Gespeicherte herunterladen, Konto selbst löschen.
- Deutsch/Englisch, Hell-/Dunkelmodus.

## Für Leitungen

- **Übersicht**: Besetzung in Prozent, Heatmap nach Bereich und Tag, als Nächstes unterbesetzte
  Schichten, heutige Anwesenheit, offene Anfragen – aktualisiert sich jede Minute.
- **Schichten** mit mehreren Positionen (eigene Platzzahl, Buchung direkt oder auf Anfrage),
  öffentlich oder intern, als Serie („jeden Fr/Sa 18–22 und 22–02 Uhr“), duplizieren.
- **Anforderungen** je Position: Qualifikationen als Pflicht oder „gern gesehen“.
- **Besetzung**: Personen eintragen (Regeln nur mit Sonderrecht übergehbar), Anfragen und
  Übergaben in einer Sammelansicht entscheiden, Anwesenheit abhaken.
- **Dringend-Aufruf**: E-Mail mit Direktlink an alle, die passen und Zeit haben, optional mit
  Bonuspunkten.
- **Rundmails** an Bereiche, Schichten oder alle Helfenden.
- **Druckansichten**: Schichtplan je Bereich/Tag und Helferliste je Schicht mit Abhak-Spalte.
- **Ausgabe & Check-in**: QR-Code scannen, Schichten von heute einchecken, Goodies ausgeben.

## Für die Organisation

- **Jahrgänge** (Festivaljahre) mit beliebig tiefem **Bereichsbaum**; **Jahrgang kopieren** mit
  allen Zeiten um ganze Tage verschoben.
- **Rollen** frei konfigurierbar, vergeben pro Bereich und vererbt auf Unterbereiche. Niemand kann
  mehr Rechte vergeben, als er selbst hat.
- **Punkte-Regeln** pro Schicht und/oder Stunde, vererbt Instanz → Bereich → Position, Nacht- und
  Kurzfrist-Bonus, manuelle Korrekturen mit Begründung.
- **Goodies** mit Preis, Varianten, Bereichs-Beschränkung, Höchstzahl, Kontingent und Bestand.
- **Buchungswellen**: Crew zuerst, dann Wiederkehrende, Einladungslinks, dann alle.
- **Profilfelder** frei konfigurierbar (bei Registrierung, im Profil oder bei der Goodie-Auswahl).
- **Erscheinungsbild**: Name, Untertitel, Farben mit Kontrastprüfung, Logo, Hintergrund, Favicon.
- **E-Mail-Vorlagen** pro Sprache anpassbar.
- **Protokoll** aller Verwaltungsaktionen.
- **Datenschutz**: Helfende laden ihre Daten selbst herunter und löschen ihr Konto; Admins können
  beides für Anfragen per Post erledigen. Gelöschte Konten verlieren alle persönlichen Daten,
  Schichten und Punkte bleiben anonym für die Statistik. Inaktive Konten werden nach einer
  einstellbaren Frist automatisch anonymisiert (mit Vorwarnung per Mail), IP-Adressen im Protokoll
  nach einer weiteren Frist entfernt.
- **Impressum und Datenschutzerklärung** werden in der Verwaltung gepflegt, nicht im Code. Für die
  Datenschutzerklärung gibt es eine Vorlage, die zur Installation passt (Profilfelder, Löschfristen,
  Karten, KI-Zugang). Sie ersetzt keine Rechtsberatung: Stellen in [eckigen Klammern] sind zu
  ergänzen.
- **Zustellung**: Mails, die nicht rausgehen, sind in der Verwaltung sichtbar und lassen sich
  erneut senden oder verwerfen.
- **KI-Assistenten** (z. B. Claude) mit den Rechten der jeweiligen Person – siehe
  [KI-ASSISTENTEN.md](KI-ASSISTENTEN.md).

Wie das alles fachlich zusammenhängt, beschreibt das [Konzept](KONZEPT.md).
