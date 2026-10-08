# Wichtel – Konzept

Wichtel ist ein Helfer- und Schichtsystem für ehrenamtliche Festivals (Zielgröße: bis ca. 500 Helfende,
mehrwöchige Aufbau-/Festival-/Abbauphase). Helfende melden sich an, buchen Schichten, sammeln Punkte und
tauschen diese gegen Goodies.

Stand: 2026-10-08 · Status: Meilensteine 1–7 umgesetzt

---

## 1. Leitprinzipien

Abgeleitet aus der Kritik am bisherigen System (Engelsystem):

1. **Ohne Erklärung benutzbar.** Jede Seite hat genau eine Hauptaktion. Wer zum ersten Mal kommt, wird durch
   einen kurzen Einstieg geführt (Profil → Interessen → erste Schicht).
2. **Mobile-First für Helfende**, Desktop-optimiert für Leitung/Admin (Tabellen, Planungsansichten).
3. **Konsistente Bedienlogik.** Bestätigungsdialoge gibt es _nur_ für unumkehrbare oder folgenreiche
   Aktionen (z. B. Stornieren nach Frist, Goodie ausgeben) – immer nach demselben Muster. Buchen ist ein Tap,
   Rückgängig ist ein Tap (solange erlaubt).
4. **Status ist immer sichtbar.** Jede Buchung/Anfrage zeigt klar: _gebucht · angefragt · Warteliste ·
   abgelehnt · bestätigt (Punkte gutgeschrieben)_. Jede gesperrte Aktion sagt _warum_ („Benötigt Qualifikation
   Hygieneschulung – jetzt beantragen“).
5. **Filter, die man versteht.** Wenige, sichtbare Filter (Tag, Bereich, „nur passende für mich“,
   „nur freie Plätze“), als Chips; Ergebnis aktualisiert sofort. Standardansicht: _für mich buchbare Schichten_.
6. **Alles festivalspezifische ist Konfiguration**, nichts ist hartkodiert (Namen, Bereiche, Rollen,
   Profilfelder, Punkte-Regeln, Goodies, Texte, Branding).
7. **Admin-Oberfläche flach statt verschachtelt.** Wenige Hauptbereiche, globale Suche, jede Entität hat eine
   Detailseite mit allen zugehörigen Aktionen an einem Ort.

---

## 2. Begriffe & Domänenmodell

| Begriff                    | Bedeutung                                                                                                                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Instanz**                | Eine Wichtel-Installation (z. B. `helfen.example.de`). Globale Einstellungen, Branding, Benutzerkonten.                                                                                            |
| **Jahrgang** (Edition)     | Ein Festivaljahr. Schichten, Buchungen, Punkte, Goodies, Wellen gehören immer zu genau einem Jahrgang. Kann aus dem Vorjahr kopiert werden (alle Zeiten um X Tage verschoben).                     |
| **Konto** (User)           | Bleibt über Jahrgänge bestehen. Teilnahme am Jahrgang wird pro Jahr bestätigt (`Teilnahme`).                                                                                                       |
| **Bereich** (Area)         | Baumknoten beliebiger Tiefe, z. B. _Gesamt → AG Infrastruktur → Aufbau_. Pro Jahrgang.                                                                                                             |
| **Schicht** (Shift)        | Zeitraum in einem Bereich, mit Ort, Treffpunkt, Beschreibung, Ansprechperson, Hinweisen. Kann aus einer **Schichtvorlage** in Serie erzeugt werden.                                                |
| **Position** (Slot type)   | Innerhalb einer Schicht: z. B. „4× Helfer*in, 1× Schichtleitung“. Jede Position hat eigene Anzahl, Buchungsmodus, Anforderungen, Punkte-Regel, Sichtbarkeit.                                       |
| **Buchung** (Assignment)   | Person ↔ Position. Status: `angefragt`, `gebucht`, `warteliste`, `abgelehnt`, `storniert`, `erschienen`, `nicht_erschienen`.                                                                       |
| **Qualifikation**          | Konfigurierbar (z. B. Hygieneschulung, Führerschein). Antrag durch Helfende (Ankreuzen und/oder Upload), Bestätigung durch berechtigte Rolle. Optional mit Ablaufdatum.                            |
| **Rolle**                  | Konfigurierbares Bündel von Berechtigungen (z. B. _Bereichsleitung_, _AG-Leitung_, _Gesamtleitung_, _Helferanmeldung_, _Goodie-Ausgabe_, _Admin_).                                                 |
| **Rollenzuweisung**        | Person + Rolle + **Geltungsbereich** (ein oder mehrere Bereichsknoten oder global) + Jahrgang. Rechte vererben sich auf Unterbereiche.                                                             |
| **Gruppe**                 | (a) _Buddy-Gruppe_: von Helfenden selbst erstellt, per Einladungscode. (b) _Verwaltungsgruppe_: von Admins gepflegt (z. B. „Crew“, „Vorjahr dabei“) – nutzbar für Wellen, Sichtbarkeit, Rundmails. |
| **Welle** (Booking wave)   | Zeitgesteuerte Freigabe von Schichten/Positionen für eine Zielgruppe.                                                                                                                              |
| **Bedingung** (Condition)  | Wiederverwendbarer Regelbaustein (siehe §5).                                                                                                                                                       |
| **Punktekonto**            | Ledger aus Buchungssätzen pro Person und Jahrgang. Kontostand = Summe.                                                                                                                             |
| **Goodie**                 | Belohnung mit Punktepreis (auch 0), Bedingungen, optionalen Profilfeldern, Kontingent, Varianten.                                                                                                  |
| **Goodie-Vorgang** (Claim) | Person ↔ Goodie. Status: `ausgewählt`, `ausgegeben`, `storniert`, `erstattet`.                                                                                                                     |
| **Profilfeld**             | Konfigurierbares Formularfeld (Typen: Text, Zahl, Datum, Auswahl, Mehrfachauswahl, Ja/Nein, Datei). Kontext: _Registrierung_, _Jahrgangsteilnahme_, _Goodie_, _Position_, _Qualifikation_.         |

---

## 3. Rechte & Hierarchie

- **Berechtigungen** sind feingranulare, im Code definierte Fähigkeiten, z. B.
  `area.manage`, `role.assign`, `shift.manage`, `assignment.manage`, `assignment.override`,
  `attendance.confirm`, `qualification.review`, `qualification.documents.view`, `helper.contact.view`,
  `goodie.manage`, `goodie.issue`, `points.adjust`, `mail.send`, `dashboard.view`, `audit.view`,
  `mcp.use`. Instanzweite Verwaltung (Einstellungen, Jahrgänge, Rollen-Definitionen, Admins) ist kein
  Recht, sondern Admins vorbehalten.
- **Rollen** sind frei konfigurierbare Sets davon (mit sinnvollen Vorlagen bei Erstinstallation).
- **Zuweisung mit Geltungsbereich:** Eine Rolle gilt global oder für einen/mehrere Bereichsknoten inkl.
  aller Unterknoten. Damit sind auch Querschnittsrollen abbildbar (z. B. _Helferanmeldung_ = Rolle mit
  `attendance.confirm`, `assignment.manage`, `qualification.review` auf dem Wurzelknoten; oder eine
  Bereichsleitung, die zusätzlich einen fremden Teilbaum betreut).
- **Mehrfachrollen** pro Person möglich (Instanz-Einstellung kann z. B. „Helfer*in und Leitung im selben
  Bereich“ verbieten).
- **Override:** Wer `assignment.override` hat, darf trotz Konflikt eintragen (Überschneidung, fehlende
  Qualifikation, Frist, voll). Es erscheint eine Warnung, der Grund wird im Audit-Log gespeichert.
- **Rollen gelten pro Jahrgang:** Eine Rolle wirkt nur auf Bereiche und Objekte ihres Jahrgangs, auch
  wenn sie für den ganzen Jahrgang vergeben ist. Rollen archivierter Jahrgänge geben keine Rechte mehr.
- **Datensichtbarkeit:** Helfende sehen andere Helfende nicht – außer Mitglieder der eigenen Buddy-Gruppe.
  Kontaktdaten (Name, Telefon) sehen nur Rollen mit `helper.contact.view` im passenden Geltungsbereich,
  und nur im aktuellen Jahrgang (Personen sind instanzweit, alte Rollen öffnen keine aktuellen Daten).

---

## 4. Konten & Registrierung

- Registrierung mit E-Mail + Passwort, E-Mail-Bestätigung, Passwort vergessen. Mit Mailserver meldet man
  sich nach der Bestätigung an; die Registrierung verrät nicht, ob es eine Adresse schon gibt. Ohne
  Mailserver gelten Konten sofort als bestätigt, Admins erzeugen bei Bedarf Reset-Links.
- **Kurze Registrierung**: Name, E-Mail, Passwort, Telefon, Sprache + als Pflicht konfigurierte Felder.
  Alles Weitere wird _erst dann_ abgefragt, wenn es gebraucht wird (Goodie-Auswahl, Position, Qualifikation).
- **Jahrgangsteilnahme**: Bei Login in einem neuen Jahrgang einmal „Ich bin dieses Jahr dabei“ + ggf.
  jahrgangsspezifische Felder (z. B. Verfügbarkeit, Interessen).
- **Präferenzen**: Lieblingsbereiche und Verfügbarkeitszeiträume → Sortierung/Hervorhebung „passt zu dir“.
- **Geburtsdatum** optional konfigurierbar als Feld; Altersbedingungen nutzbar (Minderjährige).
- **SSO**: vorerst nicht. Architektur sieht verknüpfbare externe Identitäten (OIDC/SAML) pro Konto vor.
- **Datenschutz**: Helfende laden ihre Daten selbst herunter (JSON) und löschen ihr Konto. Beim Löschen
  verschwinden alle persönlichen Daten; Schichten und Punkte bleiben anonym für Statistik und
  Abrechnung. Konten ohne Aktivität werden nach einer einstellbaren Frist (Standard 24 Monate)
  automatisch anonymisiert, mit Vorwarnung per Mail. Admins sind davon ausgenommen.

---

## 5. Bedingungen (Regelbaustein)

Ein einheitlicher, im UI zusammenklickbarer Bedingungsbaum (UND/ODER/NICHT) – wiederverwendet für
Positionsanforderungen, Sichtbarkeit, Wellen, Goodie-Berechtigung und Profilfeld-Anzeige.

Bausteine (erweiterbar):

- hat Qualifikation _Q_ (bestätigt, nicht abgelaufen)
- Mitglied in Verwaltungsgruppe _G_
- Alter ≥ _n_ (am Schichttag)
- Profilfeld _F_ hat Wert _W_
- hat ≥ _n_ Schichten / ≥ _h_ Stunden (erschienen) in Bereich _B_ (inkl. Unterbereichen)
- hat Goodie _X_ erhalten / nicht erhalten
- hat Rolle _R_

Positionen unterscheiden **Pflicht-** und **Wunsch-Anforderungen** („gern gesehen“): Pflicht sperrt die
Buchung, Wunsch wird nur angezeigt und für Leitungen sichtbar markiert.

---

## 6. Schichten & Buchung

### 6.1 Anlegen

- Einzeln, per **Vorlage + Serie** (Tage × Zeitfenster, z. B. „Bar täglich 18–22 und 22–02“), oder per
  Duplizieren. Massenbearbeitung (verschieben, Plätze ändern) in einer Planungsansicht (Zeitachse je Bereich).
- Felder: Titel, Bereich, Start/Ende, Ort, Treffpunkt, Beschreibung, Mitbringen/Kleiderordnung,
  Ansprechperson, Sichtbarkeit (Bedingung), Positionen.
- Mehrsprachige Texte: Deutsch Pflicht, Englisch optional mit Rückfall; fehlende Übersetzungen werden im
  Admin-UI markiert.

### 6.2 Buchungsmodi je Position

| Modus                 | Verhalten                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------- |
| **Offen**             | Tippen → sofort gebucht.                                                                 |
| **Mit Qualifikation** | Bei erfüllter Pflicht-Bedingung sofort gebucht, sonst Button „Freischaltung beantragen“. |
| **Auf Anfrage**       | Anfrage → Leitung bestätigt/lehnt ab (mit optionaler Nachricht).                         |

### 6.3 Regeln

- **Überschneidung** mit eigenen Buchungen wird immer blockiert (inkl. Anfragen & Warteliste-Plätzen nach
  Wahl der Instanz-Einstellung).
- **Mindestpause** zwischen Schichten: konfigurierbar (Standard 0).
- **Stornofrist**: konfigurierbar global → Bereich → Schicht (Standard 48 h). Danach Storno nur über Leitung
  oder über Schichtbörse/Tausch.
- **Warteliste** pro Position: automatisches Nachrücken (Standard) oder Nachrücken mit Bestätigungsfrist;
  Benachrichtigung per E-Mail.
- **Schichtbörse**: Eigene Schicht „abgeben“ → für andere Berechtigte sichtbar; Übernahme wechselt die
  Buchung. Nach Ablauf der Stornofrist optional mit Leitungsbestätigung (konfigurierbar je Bereich).
- **Direkter Tausch**: Person A schlägt Person B einen Tausch vor (A↔B Schichten), B nimmt an; gleiche
  Bestätigungsregel wie Börse.
- **Buddy-Gruppen**: Gruppenbuchung nur wenn genug Plätze frei und alle Bedingungen erfüllen; alle
  Mitglieder müssen annehmen (bis dahin sind die Plätze reserviert, mit Ablaufzeit).
- **Leitung trägt ein**: direkt, mit Override-Möglichkeit (§3).

### 6.4 Wellen

Eine Welle = Zeitpunkt (Start, optional Ende) + Zielgruppe (Bedingung, z. B. Gruppe „Crew“, Einladungslink)

- Umfang (ganze Bereiche, einzelne Schichten oder einzelne Positionen) + optionales Limit (z. B. max. _n_
  Buchungen in dieser Welle). Ohne Welle gilt „alles offen“.

### 6.5 Anwesenheit

- Schichtleitung bzw. Rolle mit `attendance.confirm` hakt in einer Liste ab **oder** scannt den persönlichen
  QR-Code der Helfenden.
- Punkte werden **mit der Bestätigung der Anwesenheit** gutgeschrieben, also bei Ankunft/Schichtbeginn,
  nicht erst nach Schichtende.
- **Vorab-Check-in** (z. B. an der Helferanmeldung): Die Anwesenheit kann schon vor Schichtbeginn bestätigt
  werden, damit die Punkte sofort echt sind und z. B. das Pflicht-Freiticket direkt ausgegeben werden kann.
  Zeitfenster konfigurierbar (Standard: ab 00:00 Uhr am Tag der Schicht).
- **Check-in-Ansicht der Helferanmeldung**: QR scannen → heutige Schichten der Person sehen → mit einem Tap
  bestätigen → fällige Pflicht-Goodies werden sofort angezeigt und können direkt ausgegeben werden.
- „Nicht erschienen“ → keine Punkte + interner Vermerk. Eine bereits erfolgte Bestätigung kann korrigiert
  werden (Punkte werden zurückgebucht; ist dadurch ein bereits ausgegebenes Goodie nicht mehr gedeckt,
  entsteht ein interner Vermerk).
- Nachträgliche Korrektur jederzeit möglich (Audit-Log). Auto-Bestätigung nach _x_ Stunden: konfigurierbar,
  Standard aus.

### 6.6 Kurzfristiger Ersatz

Leitung markiert Platz als „dringend“ → Rundmail an passende, zeitlich verfügbare Helfende (Bedingungen +
keine Überschneidung) mit Direktlink. Optionaler Punktebonus.

---

## 7. Punkte

- **Punkte-Regel** je Position (mit Vererbung Bereich → Schicht → Position):
  fixe Punkte pro Schicht und/oder pro Stunde, Multiplikatoren für Zeitfenster (z. B. Nacht) oder Tage,
  optionale Boni (z. B. Kurzfrist-Einspringen: „Buchung < _x_ h vor Beginn“).
- **Punktekonto als Ledger** (unveränderliche Buchungssätze): `gutschrift_schicht`, `abbuchung_goodie`,
  `rueckbuchung_goodie`, `manuelle_korrektur` (mit Pflicht-Begründung), `storno_gutschrift`.
- Gutschrift erfolgt mit Bestätigung der Anwesenheit (auch Vorab-Check-in, §6.5).
- Anzeige für Helfende: **bestätigte Punkte** (ausgebbar) und **vorgemerkte Punkte** (aus gebuchten,
  noch nicht bestätigten Schichten, nur informativ).
- Punkte gelten nur im jeweiligen Jahrgang. Keine Rangliste.

---

## 8. Goodies

### 8.1 Definition

- Name, Beschreibung, Bild, **Punktepreis** (≥ 0), **Berechtigung** (Bedingung, z. B. „≥ 1 Schicht im
  Bereich Abbau“ für Zollstöcke), **Max. pro Person**, **Varianten** (z. B. Größe), **zusätzliche
  Profilfelder** (werden erst bei Auswahl abgefragt, z. B. T-Shirt-Größe).
- **Kontingent für Selbstauswahl** (optional, z. B. „max. 50 dürfen selbst gewählt werden“). Zuteilungen
  durch Berechtigte sind davon ausgenommen.
- **Lagerbestand** (optional, nur informativ für die Übersicht).
- **Vorschuss** (optional, Standard aus): Goodie darf schon vor Bestätigung der Punkte ausgegeben werden
  (z. B. T-Shirt vor der ersten Schicht). Wird ein Vorschuss nicht gedeckt, entsteht ein interner Vermerk.

### 8.2 Pflicht-Goodies

- Goodies können als **Pflicht** mit Priorität markiert werden (z. B. Freiticket = 1 Punkt).
  Die ersten bestätigten Punkte werden automatisch dafür verwendet, in Prioritätsreihenfolge.
- **Erstattung statt Ausgabe** konfigurierbar, z. B. „Ich habe schon ein Ticket gekauft“: Die Punkte werden
  trotzdem für das Pflicht-Goodie verbraucht (es wird nicht frei), statt der Ausgabe gibt es den Status
  `erstattung_ausstehend` → durch Berechtigte als `erstattet` markiert. Die Rückzahlung selbst läuft außerhalb
  von Wichtel; optional mit Feldern für die Erstattung (z. B. Ticketnummer), konfigurierbar wie Profilfelder.

### 8.3 Ablauf

1. Helfende sehen im Goodie-Bereich: was sie bekommen können, was ihnen noch fehlt („noch 2 Punkte“, „nur
   für Abbau-Helfende“), Kontostand.
2. **Auswahl** nur mit bestätigten Punkten (außer Vorschuss-Goodies) → Punkte werden abgebucht, Status
   `ausgewählt`. Storno vor Ausgabe bucht zurück.
3. **Ausgabe vor Ort**: Ausgabestelle scannt QR-Code → sieht ausgewählte und berechtigte Goodies → „Ausgeben“
   (ein Tap). Alternativ manuelle Suche nach Person (z. B. bei Anfrage per E-Mail).
4. Umtausch (Variante ändern) und Rücknahme möglich, alles im Audit-Log.
5. Übersicht: wer hat was, ausgegeben vs. ausgewählt, Kontingent- und Bestandsstand.

---

## 9. Qualifikationen

- Konfigurierbar: Name, Beschreibung, Nachweisart (_Ankreuzen_, _Upload_, _beides_), Ablauf (optional),
  welche Rolle/welcher Bereich prüft.
- Ablauf: Helfende beantragen → Prüfung (bestätigen/ablehnen mit Begründung) → schaltet Positionen frei.
- Leitungen können Qualifikationen auch direkt vergeben.
- **Dokumentenaufbewahrung** je Qualifikation konfigurierbar: _behalten_, _nach Bestätigung löschen_
  (übrig bleibt „bestätigt am … durch …“), _nach Jahrgangsende löschen_. Einsicht nur mit
  `qualification.documents.view` im Geltungsbereich.

---

## 10. Kommunikation

- E-Mail über SMTP; Versand asynchron über eine Warteschlange (Wiederholung bei Fehlern).
- **Automatische Mails** (Vorlagen in DE/EN mit Standardtexten, im Admin-UI anpassbar, Platzhalter):
  Registrierung/Bestätigung, Passwort, Buchung, Storno, Anfrage bestätigt/abgelehnt, Warteliste nachgerückt,
  Schicht geändert/abgesagt, Erinnerung (Standard 24 h vorher), Tausch/Börse, Qualifikation geprüft,
  Dringend-Aufruf.
- **Rundmails** an Zielgruppen (Bedingung, Bereich, Schicht, Gruppe). Wer an wen schreiben darf, ergibt sich
  aus `mail.send` + Geltungsbereich (Standard: Leitung → eigener Teilbaum, Admin → alle). Konfigurierbar,
  ob Leitungen überhaupt Rundmails senden dürfen.
- **iCal-Abo** mit eigenen Schichten (geheimer, rotierbarer Link).
- Druckansicht/PDF: Schichtplan je Bereich/Tag, Helferliste je Schicht.

---

## 11. Dashboards

- **Helfende**: nächste Schicht, Punkte, offene Anfragen, Hinweise („Profilfeld fehlt“, „Warteliste“).
- **Leitung** (je Geltungsbereich): Soll/Ist-Besetzung als Zeitachse/Heatmap pro Bereich und Tag,
  unterbesetzte Schichten, offene Anfragen und Qualifikationsprüfungen, heutige Anwesenheit.
- **Gesamt/Admin**: Aggregat über alle Bereiche, Anmeldezahlen, Goodie-Übersicht.
- Live-Aktualisierung (Server-Sent Events oder Polling).

---

## 12. Jahrgänge kopieren

Neuer Jahrgang aus bestehendem: Auswahl, was übernommen wird (Bereiche, Rollen-Zuweisungen,
Schichtvorlagen/Schichten, Positionen, Punkte-Regeln, Goodies, Profilfelder, Wellen, Mail-Vorlagen) +
Zeitverschiebung (Ankerdatum alt → neu). Buchungen, Punkte und Goodie-Vorgänge werden nie kopiert.

---

## 12a. KI-Assistenten (MCP)

- Endpunkt `/mcp` (Streamable HTTP, zustandslos) in der App; Anmeldung per OAuth 2.1 (dynamische
  Client-Registrierung, Code-Flow mit PKCE S256, rotierende Refresh-Tokens, Verbindung 90 Tage).
- Recht `mcp.use` entscheidet, wer verbinden darf; jeder Aufruf prüft es neu. Werkzeuge nutzen
  dieselben Funktionen und Rechteprüfungen wie die Oberfläche.
- Je Verbindung „nur lesen“ oder „lesen und ändern“. Admin schaltet Gruppen frei (Schichten,
  Besetzung, Bereiche/Orte, Rundmails, Punkte; letzte zwei standardmäßig aus). Rollen,
  Einstellungen und Konten sind nie über MCP änderbar.
- Personenbezogene Daten: voll / nur Namen (Standard) / Pseudonyme. Im Pseudonym-Modus sucht der
  Assistent nur nach Pseudonymen, nicht nach Namen.
- Nur Apps mit Rücksprung auf erlaubte Hosts (Admin-Einstellung, Standard `claude.ai`/`claude.com`,
  `localhost` immer) können sich verbinden. Passwortwechsel und mehrfach benutzte Refresh-Tokens
  trennen Verbindungen.
- Folgenreiche Aktionen (Serien, Löschen, Dringend-Aufruf, Rundmail) liefern zuerst eine
  Vorschau; Änderungen stehen im Protokoll mit „via MCP: <App>“.

---

## 13. Audit-Log

Protokoll aller schreibenden Aktionen von Leitungen/Admins und aller sicherheits- und
punkterelevanten Aktionen von Helfenden: wer, wann, was, vorher/nachher, Grund. Filterbar nach Person,
Entität, Bereich. Einträge werden nicht bearbeitet; aus Datenschutzgründen werden IP-Adressen nach einer
Frist (Standard 90 Tage) entfernt, und beim Löschen eines Kontos verlieren Einträge über die Person
ihre Details.

---

## 14. Branding & Sprache

- Instanz-Einstellungen im Admin-UI: Festivalname, Logo, Favicon, Primär-/Akzentfarben, Hintergrundbilder,
  Kontaktadresse. Live-Vorschau beim Bearbeiten; Farbkontraste werden auf Lesbarkeit geprüft.
- Impressum (aus den Betreiberangaben) und Datenschutzerklärung (mit Vorlage, die zur Konfiguration
  passt) werden in der Verwaltung gepflegt; alternativ Links auf externe Seiten.
- UI-Sprache DE/EN, pro Person wählbar; Inhalte mit Rückfall auf DE.
- Hell/Dunkel-Modus.

---

## 15. Technik

| Bereich         | Wahl                                                                               | Begründung                                                                          |
| --------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Sprache         | TypeScript (strict)                                                                | Durchgängige Typen DB → UI, eine Codebasis                                          |
| Framework       | SvelteKit (Node-Adapter)                                                           | Schnelles, mobilfreundliches UI; Server-Logik im selben Projekt                     |
| Datenbank       | PostgreSQL                                                                         | Transaktionen, Constraints (z. B. Überbuchung verhindern)                           |
| ORM/Migrationen | Drizzle                                                                            | Typsicher, SQL-nah, versionierte Migrationen                                        |
| Validierung     | Zod                                                                                | Gemeinsame Schemas für Formulare und Server                                         |
| Auth            | Eigene, schlanke Sitzungsverwaltung (gehashte Tokens in der DB), Argon2id          | E-Mail/Passwort; OIDC später ergänzbar                                              |
| i18n            | Eigene, typsichere Kataloge (`de.ts` ist Quelle, `en.ts` vom Typchecker erzwungen) | Keine zusätzliche Build-Stufe, fehlende Übersetzungen fallen beim Typcheck auf      |
| Styling         | Tailwind CSS + eigene Komponenten                                                  | Theming über CSS-Variablen (Branding)                                               |
| Jobs            | Transaktionale Outbox-Tabelle + Worker im App-Prozess                              | Mails entstehen in derselben Transaktion wie die Änderung; kein zusätzlicher Dienst |
| Entwicklung     | PGlite (eingebettete PostgreSQL)                                                   | `npm run dev` ohne Docker/Datenbank; Tests laufen gegen echte PostgreSQL-Semantik   |
| Mail            | Nodemailer (SMTP)                                                                  |                                                                                     |
| Dateien         | Lokales Volume (später optional S3-kompatibel)                                     | Qualifikationsnachweise, Bilder                                                     |
| Tests           | Vitest (Domänenlogik), Playwright (E2E, auch Mobile-Viewport)                      | Kernregeln (Buchung, Punkte, Goodies) vollständig getestet                          |
| Deployment      | Ein Docker-Image + `docker-compose.yml` mit Postgres                               |                                                                                     |
| CI              | GitHub Actions: Lint, Typecheck, Tests, Image-Build                                |                                                                                     |

**Architektur-Grundsätze**

- Domänenlogik (Buchungsregeln, Bedingungen, Punkte, Goodies) als reine, testbare Module unabhängig von
  UI und Datenbank.
- Kritische Operationen (Buchen, Nachrücken, Goodie-Auswahl mit Kontingent) in Datenbank-Transaktionen mit
  Sperren/Constraints, damit es beim Wellenstart keine Überbuchung gibt.
- Berechtigungsprüfung zentral serverseitig, nie nur im UI.

---

## 16. Meilensteine (Vorschlag)

Design-Richtlinien: [DESIGN.md](DESIGN.md).

1. **Fundament**: Projekt-Setup, Docker, CI, Auth (Registrierung, Login, Bestätigung), i18n, Branding,
   Jahrgänge, Bereichsbaum, Rollen & Berechtigungen, Audit-Log.
2. **Schichten & Buchung (Kern)**: Schichten/Positionen/Vorlagen, Bedingungen, Buchungsmodi, Überschneidung,
   Storno-Fristen, Helfer-Schichtübersicht (mobil), Leitungsansichten, Anwesenheit (Liste).
3. **Punkte & Goodies**: Punkte-Regeln, Ledger, Goodies inkl. Pflicht-Goodies, Kontingent, Ausgabe per QR.
4. **Komfort**: Profilfelder/Formular-Baukasten, Qualifikationen mit Upload, Wellen, Warteliste,
   E-Mail-Vorlagen & Rundmails, Erinnerungen, iCal.
5. **Zusammenarbeit**: Buddy-Gruppen, Schichtbörse, Tausch, Dringend-Aufruf.
6. **Überblick**: Dashboards, Druckansichten, Jahrgang kopieren.
7. **Datenschutz & Betrieb**: Auskunft, Kontolöschung, Löschfristen, Impressum/Datenschutzerklärung,
   strukturierte Logs, Fehlermeldungen an Admins, Zustellungsübersicht; Sicherheitsprüfung.
8. **Später**: SSO (OIDC/SAML), weitere Exporte (z. B. CSV), Ehrenamtsbescheinigung.

---

## 17. Offene Punkte

- Detaillierte Bildschirmentwürfe (Helfer-Flow mobil, Leitungs-Planungsansicht).
- SSO-Protokoll von AStA/Uni klären.
- Datenschutzerklärung: Vorlage mit dem Veranstalter vervollständigen (Hosting- und Mail-Anbieter,
  Aufsichtsbehörde, Aufbewahrung der Webserver-Logs und Backups).
