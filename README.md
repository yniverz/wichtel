# Wichtel

Ein einfach zu bedienendes Helfer- und Schichtsystem für ehrenamtliche Festivals.

_An easy-to-use volunteer and shift management system for non-profit festivals._

> **Status:** Meilenstein 1 (Fundament) ist fertig – Konten, Rollen, Bereiche, Jahrgänge, Branding.
> Schichtbuchung folgt in Meilenstein 2. Noch nicht für den Produktiveinsatz gedacht.

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

**Geplant** – siehe [docs/KONZEPT.md](docs/KONZEPT.md): Schichten, Buchungswellen, Warteliste,
Schichtbörse, Punkte, Goodies mit QR-Ausgabe, Qualifikationen, Rundmails, Dashboards.

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

```bash
cp .env.example .env   # PUBLIC_URL, POSTGRES_PASSWORD, SMTP_* setzen
docker compose up -d
docker compose logs app   # enthält den Einrichtungslink
```

- Hinter einen Reverse Proxy mit TLS stellen (Caddy, Traefik, nginx); `docker-compose.yml` setzt
  bereits die `X-Forwarded-*`-Header als vertrauenswürdig.
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
