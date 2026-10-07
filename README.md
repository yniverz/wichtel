# Wichtel

Ein einfach zu bedienendes Helfer- und Schichtsystem für ehrenamtliche Festivals.

_An easy-to-use volunteer and shift management system for non-profit festivals._

> **Status:** Meilensteine 1–4 sind fertig (Fundament, Schichten & Buchung, Punkte & Goodies,
> Komfort). Noch nicht für den Produktiveinsatz gedacht.

## Funktionen

**Vorhanden**

- Registrierung mit E-Mail-Bestätigung, Login, Passwort vergessen, Profil
- Ersteinrichtung über einen einmaligen Link (erstes Admin-Konto, erster Jahrgang, Rollenvorlagen)
- Jahrgänge (Festivaljahre), beliebig tiefer Bereichsbaum
- Frei konfigurierbare Rollen mit Rechten, vergeben pro Bereich und vererbt auf Unterbereiche –
  niemand kann mehr Rechte vergeben, als er selbst hat
- Erscheinungsbild im Admin-Bereich: Name, Untertitel, Farben (mit Kontrastprüfung), Logo,
  Hintergrundbild, Favicon – mit Live-Vorschau
- Deutsch/Englisch, Hell-/Dunkelmodus, für Handys optimiert
- Unveränderliches Protokoll aller Verwaltungsaktionen
- **Schichten** mit mehreren Positionen (eigene Platzzahl, Buchung direkt oder auf Anfrage),
  sichtbar für alle oder nur intern, Serien („jeden Fr/Sa 18–22 und 22–02 Uhr“), Duplizieren
- **Buchen auf dem Handy**: Programm nach Tagen, Filter (Tag, Bereich, freie Plätze, meine),
  Eintragen mit einem Tipp; Überschneidungen und Mindestpausen werden verhindert
- **Austragen** bis zu einer Frist (Instanz → Bereich → Schicht konfigurierbar), danach über die Leitung
- **Leitungen**: Planungsübersicht mit Belegung, Anfragen bestätigen/ablehnen, Personen eintragen
  (Regeln nur mit Sonderrecht übergehbar), Anwesenheit ab dem Schichttag abhaken
- **Punkte**: pro Schicht und/oder pro Stunde, vererbt Instanz → Bereich → Position, optional
  Nacht- und Kurzfrist-Bonus; Gutschrift mit bestätigter Anwesenheit, unveränderliches Punktekonto,
  manuelle Korrekturen mit Begründung
- **Goodies**: Preis, Varianten, Bereichs-Beschränkung, Höchstzahl pro Person, Kontingent für die
  Selbstauswahl, Bestand, Vorschuss; **Pflicht-Goodies** (z. B. Freiticket) werden automatisch zuerst
  eingelöst, auf Wunsch erstattet statt ausgegeben
- **Ausgabe & Check-in**: persönlicher QR-Code, der mit jeder Handykamera direkt zur Person führt;
  Schichten von heute einchecken, Goodies ausgeben, Erstattungen abhaken, Übersicht „wer hat was“
- **E-Mails**: Bestätigungen, Anfragen, Änderungen, Absagen, Nachrücken und Erinnerungen vor der
  Schicht – zuverlässig über eine Warteschlange mit Wiederholung; Texte pro Sprache anpassbar;
  **Rundmails** an Bereiche, Schichten, alle Helfenden oder die Crew
- **Kalender-Abo** (iCal) mit den eigenen Schichten
- **Qualifikationen** mit Nachweis (Ankreuzen oder privates Dokument), Prüfung, Ablaufdatum und
  Löschung nach der Prüfung; Positionen können sie verlangen oder „gern sehen“
- **Profilfelder** frei konfigurierbar – abgefragt bei der Registrierung, im Profil oder erst bei
  der Goodie-Auswahl; auf Wunsch für Leitungen in der Besetzung sichtbar
- **Orte & Geländeplan**: Orte mit Pin auf dem eigenen Geländeplan (ohne externe Dienste) und/oder
  auf einer Karte (OpenStreetMap, erst nach Zustimmung geladen), Links zu Google Maps/Apple Karten/OSM;
  Schichten verweisen auf Ort und Treffpunkt, die Helferanmeldung steht auf der Startseite
- **Buchungswellen** (Crew zuerst, Wiederkehrende, Einladungslink, dann alle) und **Warteliste**
  mit automatischem Nachrücken
- **Schichtbörse und Tausch**: eigene Schicht abgeben (für alle oder an eine Person per E-Mail),
  die Person kann übernehmen oder eine eigene Schicht im Tausch anbieten; späte Übergaben und
  Positionen mit Bestätigung gibt die Leitung frei (Sammelansicht „Anfragen“)
- **Gruppen**: per Einladungslink, gegenseitig Schichten sehen, gemeinsam eintragen – die anderen
  bekommen einen reservierten Platz mit Ablaufzeit
- **Dringend-Aufruf**: Leitung ruft für eine Position auf, passende und freie Helfende bekommen eine
  E-Mail mit Direktlink, optional mit Bonuspunkten

- **Übersicht für Leitungen**: Besetzung in Prozent, Heatmap nach Bereich und Tag, als Nächstes
  unterbesetzte Schichten, heutige Anwesenheit, offene Anfragen – aktualisiert sich jede Minute
- **Druckansichten**: Schichtplan je Bereich/Tag und Helferliste je Schicht mit Leerzeilen und
  Abhak-Spalte
- **Jahrgang kopieren**: Bereiche, Orte, Schichten, Goodies, Leitungen und Wellen, alle Zeiten um
  ganze Tage verschoben

**Geplant** – siehe [docs/KONZEPT.md](docs/KONZEPT.md): SSO, Löschfristen, Exporte.

## Entwicklung

Voraussetzung: Node.js ≥ 22.17. Für die Entwicklung wird **keine** Datenbank benötigt – ohne
`DATABASE_URL` startet eine eingebettete PostgreSQL (PGlite) in `./data`.

```bash
npm install
npm run dev
```

Beim ersten Start steht im Terminal ein Einrichtungslink (`/setup?token=…`). E-Mails werden ohne
`SMTP_HOST` ins Terminal geschrieben, inklusive Bestätigungslinks.

| Befehl                | Zweck                                                                |
| --------------------- | -------------------------------------------------------------------- |
| `npm run dev`         | Entwicklungsserver                                                   |
| `npm run check`       | Typprüfung                                                           |
| `npm run lint`        | Prettier + ESLint                                                    |
| `npm test`            | Unit- und Integrationstests (gegen PGlite im Speicher)               |
| `npm run test:e2e`    | Browser-Tests (Playwright), vorher `npx playwright install chromium` |
| `npm run db:generate` | Migration aus `src/lib/server/db/schema.ts` erzeugen                 |

## Betrieb

Wichtel läuft als ein Docker-Container mit PostgreSQL. Migrationen laufen beim Start automatisch.
Das Image wird bei jedem Push auf `main` als `ghcr.io/yniverz/wichtel:latest` veröffentlicht.

```bash
cp .env.example .env   # PUBLIC_URL, POSTGRES_PASSWORD, SMTP_*, WICHTEL_PORT setzen
docker compose up -d
docker compose logs app   # enthält den Einrichtungslink
```

Selbst bauen statt Image laden: `docker compose -f docker-compose.yml -f compose.build.yml up -d --build`.

**Portainer:** _Stacks → Add stack_, Inhalt von `docker-compose.yml` in den Web-Editor kopieren
(oder _Repository_ mit dieser Repo-URL wählen) und unter _Environment variables_ mindestens
`POSTGRES_PASSWORD` und `PUBLIC_URL` setzen, optional `WICHTEL_PORT`, `WICHTEL_BIND` und `SMTP_*`.
Den Einrichtungslink zeigen die Logs des `app`-Containers.

- Hinter einen Reverse Proxy mit TLS stellen (Caddy, Traefik, nginx); `docker-compose.yml` setzt
  bereits die `X-Forwarded-*`-Header als vertrauenswürdig. Port und Bind-Adresse: `WICHTEL_PORT`
  (Standard 3006) und `WICHTEL_BIND` (Standard `127.0.0.1`).
- Hochgeladene Dateien liegen im Volume `/data`; Datenbank und Volume sichern.
- `GET /healthz` meldet, ob App und Datenbank erreichbar sind.

Alle Umgebungsvariablen sind in [.env.example](.env.example) beschrieben.

## Aufbau

```
src/
  env.ts                  Umgebungsvariablen (validiert)
  hooks.server.ts         Start (Migrationen), Sitzungen, Sprache, Sicherheits-Header
  lib/domain/             reine Logik: Rechte, Bereichsbaum, Farben – ohne DB, gut testbar
  lib/server/services/    Anwendungsfälle (Konten, Jahrgänge, Bereiche, Rollen, …) inkl. Audit-Log
  lib/server/db/          Drizzle-Schema und Datenbankverbindung (PostgreSQL oder PGlite)
  lib/i18n/               Übersetzungen (de ist die Quelle, en wird vom Typchecker erzwungen)
  lib/components/         UI-Bausteine
  routes/                 Seiten: (auth), app (Helfende), admin (Verwaltung)
drizzle/                  SQL-Migrationen
docs/                     Konzept und Design-Richtlinien
```

## Lizenz

[GNU Affero General Public License v3.0](LICENSE) © The Wichtel contributors
