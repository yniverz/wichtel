# Wichtel – Konzept

Wichtel ist ein Helfer- und Schichtsystem für ehrenamtliche Festivals (Zielgröße: bis ca. 500 Helfende,
mehrwöchige Aufbau-/Festival-/Abbauphase). Helfende melden sich an, buchen Schichten, sammeln Punkte und
tauschen diese gegen Goodies.

Stand: 2026-10-06 · Status: Entwurf

---

## 1. Leitprinzipien

Abgeleitet aus der Kritik am bisherigen System (Engelsystem):

1. **Ohne Erklärung benutzbar.** Jede Seite hat genau eine Hauptaktion. Wer zum ersten Mal kommt, wird durch
   einen kurzen Einstieg geführt (Profil → Interessen → erste Schicht).
2. **Mobile-First für Helfende**, Desktop-optimiert für Leitung/Admin (Tabellen, Planungsansichten).
3. **Konsistente Bedienlogik.** Bestätigungsdialoge gibt es *nur* für unumkehrbare oder folgenreiche
   Aktionen (z. B. Stornieren nach Frist, Goodie ausgeben) – immer nach demselben Muster. Buchen ist ein Tap,
   Rückgängig ist ein Tap (solange erlaubt).
4. **Status ist immer sichtbar.** Jede Buchung/Anfrage zeigt klar: *gebucht · angefragt · Warteliste ·
   abgelehnt · bestätigt (Punkte gutgeschrieben)*. Jede gesperrte Aktion sagt *warum* („Benötigt Qualifikation
   Hygieneschulung – jetzt beantragen“).
5. **Filter, die man versteht.** Wenige, sichtbare Filter (Tag, Bereich, „nur passende für mich“,
   „nur freie Plätze“), als Chips; Ergebnis aktualisiert sofort. Standardansicht: *für mich buchbare Schichten*.
6. **Alles festivalspezifische ist Konfiguration**, nichts ist hartkodiert (Namen, Bereiche, Rollen,
   Profilfelder, Punkte-Regeln, Goodies, Texte, Branding).
7. **Admin-Oberfläche flach statt verschachtelt.** Wenige Hauptbereiche, globale Suche, jede Entität hat eine
   Detailseite mit allen zugehörigen Aktionen an einem Ort.

---

## 2. Begriffe & Domänenmodell

| Begriff | Bedeutung |
|---|---|
| **Instanz** | Eine Wichtel-Installation (z. B. `helfen.example.de`). Globale Einstellungen, Branding, Benutzerkonten. |
| **Jahrgang** (Edition) | Ein Festivaljahr. Schichten, Buchungen, Punkte, Goodies, Wellen gehören immer zu genau einem Jahrgang. Kann aus dem Vorjahr kopiert werden (alle Zeiten um X Tage verschoben). |
| **Konto** (User) | Bleibt über Jahrgänge bestehen. Teilnahme am Jahrgang wird pro Jahr bestätigt (`Teilnahme`). |
| **Bereich** (Area) | Baumknoten beliebiger Tiefe, z. B. *Gesamt → AG Infrastruktur → Aufbau*. Pro Jahrgang. |
| **Schicht** (Shift) | Zeitraum in einem Bereich, mit Ort, Treffpunkt, Beschreibung, Ansprechperson, Hinweisen. Kann aus einer **Schichtvorlage** in Serie erzeugt werden. |
| **Position** (Slot type) | Innerhalb einer Schicht: z. B. „4× Helfer*in, 1× Schichtleitung“. Jede Position hat eigene Anzahl, Buchungsmodus, Anforderungen, Punkte-Regel, Sichtbarkeit. |
| **Buchung** (Assignment) | Person ↔ Position. Status: `angefragt`, `gebucht`, `warteliste`, `abgelehnt`, `storniert`, `erschienen`, `nicht_erschienen`. |
| **Qualifikation** | Konfigurierbar (z. B. Hygieneschulung, Führerschein). Antrag durch Helfende (Ankreuzen und/oder Upload), Bestätigung durch berechtigte Rolle. Optional mit Ablaufdatum. |
| **Rolle** | Konfigurierbares Bündel von Berechtigungen (z. B. *Bereichsleitung*, *AG-Leitung*, *Gesamtleitung*, *Helferanmeldung*, *Goodie-Ausgabe*, *Admin*). |
| **Rollenzuweisung** | Person + Rolle + **Geltungsbereich** (ein oder mehrere Bereichsknoten oder global) + Jahrgang. Rechte vererben sich auf Unterbereiche. |
| **Gruppe** | (a) *Buddy-Gruppe*: von Helfenden selbst erstellt, per Einladungscode. (b) *Verwaltungsgruppe*: von Admins gepflegt (z. B. „Crew“, „Vorjahr dabei“) – nutzbar für Wellen, Sichtbarkeit, Rundmails. |
| **Welle** (Booking wave) | Zeitgesteuerte Freigabe von Schichten/Positionen für eine Zielgruppe. |
| **Bedingung** (Condition) | Wiederverwendbarer Regelbaustein (siehe §5). |
| **Punktekonto** | Ledger aus Buchungssätzen pro Person und Jahrgang. Kontostand = Summe. |
| **Goodie** | Belohnung mit Punktepreis (auch 0), Bedingungen, optionalen Profilfeldern, Kontingent, Varianten. |
| **Goodie-Vorgang** (Claim) | Person ↔ Goodie. Status: `ausgewählt`, `ausgegeben`, `storniert`, `erstattet`. |
| **Profilfeld** | Konfigurierbares Formularfeld (Typen: Text, Zahl, Datum, Auswahl, Mehrfachauswahl, Ja/Nein, Datei). Kontext: *Registrierung*, *Jahrgangsteilnahme*, *Goodie*, *Position*, *Qualifikation*. |

---

## 3. Rechte & Hierarchie

- **Berechtigungen** sind feingranulare, im Code definierte Fähigkeiten, z. B.
  `shift.manage`, `assignment.manage`, `assignment.override`, `attendance.confirm`, `qualification.review`,
  `qualification.documents.view`, `helper.contact.view`, `goodie.manage`, `goodie.issue`, `points.adjust`,
  `mail.send`, `dashboard.view`, `edition.manage`, `settings.manage`, `audit.view`.
- **Rollen** sind frei konfigurierbare Sets davon (mit sinnvollen Vorlagen bei Erstinstallation).
- **Zuweisung mit Geltungsbereich:** Eine Rolle gilt global oder für einen/mehrere Bereichsknoten inkl.
  aller Unterknoten. Damit sind auch Querschnittsrollen abbildbar (z. B. *Helferanmeldung* = Rolle mit
  `attendance.confirm`, `assignment.manage`, `qualification.review` auf dem Wurzelknoten; oder eine
  Bereichsleitung, die zusätzlich einen fremden Teilbaum betreut).
- **Mehrfachrollen** pro Person möglich (Instanz-Einstellung kann z. B. „Helfer*in und Leitung im selben
  Bereich“ verbieten).
- **Override:** Wer `assignment.override` hat, darf trotz Konflikt eintragen (Überschneidung, fehlende
  Qualifikation, Frist, voll). Es erscheint eine Warnung, der Grund wird im Audit-Log gespeichert.
- **Datensichtbarkeit:** Helfende sehen andere Helfende nicht – außer Mitglieder der eigenen Buddy-Gruppe.
  Kontaktdaten (Name, Telefon) sehen nur Rollen mit `helper.contact.view` im passenden Geltungsbereich.

---

## 4. Konten & Registrierung

- Registrierung mit E-Mail + Passwort, E-Mail-Bestätigung, Passwort vergessen.
- **Kurze Registrierung**: Name, E-Mail, Passwort, Telefon, Sprache + als Pflicht konfigurierte Felder.
  Alles Weitere wird *erst dann* abgefragt, wenn es gebraucht wird (Goodie-Auswahl, Position, Qualifikation).
- **Jahrgangsteilnahme**: Bei Login in einem neuen Jahrgang einmal „Ich bin dieses Jahr dabei“ + ggf.
  jahrgangsspezifische Felder (z. B. Verfügbarkeit, Interessen).
- **Präferenzen**: Lieblingsbereiche und Verfügbarkeitszeiträume → Sortierung/Hervorhebung „passt zu dir“.
- **Geburtsdatum** optional konfigurierbar als Feld; Altersbedingungen nutzbar (Minderjährige).
- **SSO**: vorerst nicht. Architektur sieht verknüpfbare externe Identitäten (OIDC/SAML) pro Konto vor.
- **Datenschutz-Vorbereitung**: Datenmodell trennt personenbezogene Daten sauber, sodass spätere
  Löschfristen/Anonymisierung (z. B. „X Monate nach Jahrgangsende“) als Job ergänzt werden können.
  Selbstlöschung des Kontos ist vorgesehen.

---

## 5. Bedingungen (Regelbaustein)

Ein einheitlicher, im UI zusammenklickbarer Bedingungsbaum (UND/ODER/NICHT) – wiederverwendet für
Positionsanforderungen, Sichtbarkeit, Wellen, Goodie-Berechtigung und Profilfeld-Anzeige.

Bausteine (erweiterbar):

- hat Qualifikation *Q* (bestätigt, nicht abgelaufen)
- Mitglied in Verwaltungsgruppe *G*
- Alter ≥ *n* (am Schichttag)
- Profilfeld *F* hat Wert *W*
- hat ≥ *n* Schichten / ≥ *h* Stunden (erschienen) in Bereich *B* (inkl. Unterbereichen)
- hat Goodie *X* erhalten / nicht erhalten
- hat Rolle *R*

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
| Modus | Verhalten |
|---|---|
| **Offen** | Tippen → sofort gebucht. |
| **Mit Qualifikation** | Bei erfüllter Pflicht-Bedingung sofort gebucht, sonst Button „Freischaltung beantragen“. |
| **Auf Anfrage** | Anfrage → Leitung bestätigt/lehnt ab (mit optionaler Nachricht). |

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
+ Umfang (ganze Bereiche, einzelne Schichten oder einzelne Positionen) + optionales Limit (z. B. max. *n*
Buchungen in dieser Welle). Ohne Welle gilt „alles offen“.

### 6.5 Anwesenheit
- Schichtleitung bzw. Rolle mit `attendance.confirm` hakt in einer Liste ab **oder** scannt den persönlichen
  QR-Code der Helfenden.
- Erst mit „erschienen“ werden Punkte gutgeschrieben. „Nicht erschienen“ → keine Punkte + interner Vermerk.
- Nachträgliche Korrektur jederzeit möglich (Audit-Log). Auto-Bestätigung nach *x* Stunden: konfigurierbar,
  Standard aus.

### 6.6 Kurzfristiger Ersatz
Leitung markiert Platz als „dringend“ → Rundmail an passende, zeitlich verfügbare Helfende (Bedingungen +
keine Überschneidung) mit Direktlink. Optionaler Punktebonus.

---

## 7. Punkte

- **Punkte-Regel** je Position (mit Vererbung Bereich → Schicht → Position):
  fixe Punkte pro Schicht und/oder pro Stunde, Multiplikatoren für Zeitfenster (z. B. Nacht) oder Tage,
  optionale Boni (z. B. Kurzfrist-Einspringen: „Buchung < *x* h vor Beginn“).
- **Punktekonto als Ledger** (unveränderliche Buchungssätze): `gutschrift_schicht`, `abbuchung_goodie`,
  `rueckbuchung_goodie`, `manuelle_korrektur` (mit Pflicht-Begründung), `storno_gutschrift`.
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
- **Alternative bei Verzicht** konfigurierbar, z. B. „Ich habe schon ein Ticket“ → Status
  `erstattung_ausstehend` → durch Berechtigte als `erstattet` markiert (die Erstattung selbst läuft außerhalb
  von Wichtel).

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

- Konfigurierbar: Name, Beschreibung, Nachweisart (*Ankreuzen*, *Upload*, *beides*), Ablauf (optional),
  welche Rolle/welcher Bereich prüft.
- Ablauf: Helfende beantragen → Prüfung (bestätigen/ablehnen mit Begründung) → schaltet Positionen frei.
- Leitungen können Qualifikationen auch direkt vergeben.
- **Dokumentenaufbewahrung** je Qualifikation konfigurierbar: *behalten*, *nach Bestätigung löschen*
  (übrig bleibt „bestätigt am … durch …“), *nach Jahrgangsende löschen*. Einsicht nur mit
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

## 13. Audit-Log

Unveränderliches Protokoll aller schreibenden Aktionen von Leitungen/Admins und aller sicherheits- und
punkterelevanten Aktionen von Helfenden: wer, wann, was, vorher/nachher, Grund. Filterbar nach Person,
Entität, Bereich.

---

## 14. Branding & Sprache

- Instanz-Einstellungen im Admin-UI: Festivalname, Logo, Favicon, Primär-/Akzentfarben, Hintergrundbilder,
  Impressum/Datenschutz-Links, Kontaktadresse. Optional per Umgebungsvariablen vorbelegbar.
- UI-Sprache DE/EN, pro Person wählbar; Inhalte mit Rückfall auf DE.
- Hell/Dunkel-Modus.

---

## 15. Technik

| Bereich | Wahl | Begründung |
|---|---|---|
| Sprache | TypeScript (strict) | Durchgängige Typen DB → UI, eine Codebasis |
| Framework | SvelteKit (Node-Adapter) | Schnelles, mobilfreundliches UI; Server-Logik im selben Projekt |
| Datenbank | PostgreSQL | Transaktionen, Constraints (z. B. Überbuchung verhindern) |
| ORM/Migrationen | Drizzle | Typsicher, SQL-nah, versionierte Migrationen |
| Validierung | Zod | Gemeinsame Schemas für Formulare und Server |
| Auth | Session-basiert (eigene, schlanke Implementierung oder Better Auth), Argon2 | E-Mail/Passwort + später OIDC |
| i18n | Paraglide | Typsichere Übersetzungen |
| Styling | Tailwind CSS + eigene Komponenten | Theming über CSS-Variablen (Branding) |
| Jobs | pg-boss (Postgres-basiert) | Mails, Erinnerungen, Wellen – ohne zusätzlichen Redis |
| Mail | Nodemailer (SMTP) | |
| Dateien | Lokales Volume (später optional S3-kompatibel) | Qualifikationsnachweise, Bilder |
| Tests | Vitest (Domänenlogik), Playwright (E2E, auch Mobile-Viewport) | Kernregeln (Buchung, Punkte, Goodies) vollständig getestet |
| Deployment | Ein Docker-Image + `docker-compose.yml` mit Postgres | |
| CI | GitHub Actions: Lint, Typecheck, Tests, Image-Build | |

**Architektur-Grundsätze**
- Domänenlogik (Buchungsregeln, Bedingungen, Punkte, Goodies) als reine, testbare Module unabhängig von
  UI und Datenbank.
- Kritische Operationen (Buchen, Nachrücken, Goodie-Auswahl mit Kontingent) in Datenbank-Transaktionen mit
  Sperren/Constraints, damit es beim Wellenstart keine Überbuchung gibt.
- Berechtigungsprüfung zentral serverseitig, nie nur im UI.

---

## 16. Meilensteine (Vorschlag)

1. **Fundament**: Projekt-Setup, Docker, CI, Auth (Registrierung, Login, Bestätigung), i18n, Branding,
   Jahrgänge, Bereichsbaum, Rollen & Berechtigungen, Audit-Log.
2. **Schichten & Buchung (Kern)**: Schichten/Positionen/Vorlagen, Bedingungen, Buchungsmodi, Überschneidung,
   Storno-Fristen, Helfer-Schichtübersicht (mobil), Leitungsansichten, Anwesenheit (Liste).
3. **Punkte & Goodies**: Punkte-Regeln, Ledger, Goodies inkl. Pflicht-Goodies, Kontingent, Ausgabe per QR.
4. **Komfort**: Profilfelder/Formular-Baukasten, Qualifikationen mit Upload, Wellen, Warteliste,
   E-Mail-Vorlagen & Rundmails, Erinnerungen, iCal.
5. **Zusammenarbeit**: Buddy-Gruppen, Schichtbörse, Tausch, Dringend-Aufruf.
6. **Überblick**: Dashboards, Druckansichten, Jahrgang kopieren.
7. **Später**: SSO (OIDC/SAML), Löschfristen, Exporte, Ehrenamtsbescheinigung.

---

## 17. Offene Punkte

- Detaillierte Bildschirmentwürfe (Helfer-Flow mobil, Leitungs-Planungsansicht).
- SSO-Protokoll von AStA/Uni klären.
- Datenschutzerklärung und Löschfristen mit dem Veranstalter klären.
